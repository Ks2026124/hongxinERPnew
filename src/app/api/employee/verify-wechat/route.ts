import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage, isValidImageType, MAX_IMAGE_SIZE } from '@/lib/storage';
import { computeSHA256, computePHash } from '@/lib/image-hash';

// POST /api/employee/verify-wechat - 上传微信截图并验证（创建客户前置步骤）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 解析 multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的微信聊天截图' }, { status: 400 });
    }

    // 验证文件类型
    if (!isValidImageType(file.type)) {
      return NextResponse.json({ error: '仅支持 jpg、jpeg、png、webp 格式' }, { status: 400 });
    }

    // 验证文件大小
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 });
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer());

    // 计算 SHA-256 和 pHash
    const sha256 = computeSHA256(buffer);
    const phash = await computePHash(buffer);

    const supabase = getSupabaseClient();

    // 查重：检查 SHA-256 完全相同的图片（整个公司范围）
    const { data: exactMatches } = await supabase
      .from('customer_images')
      .select('id, employee_id, team_id')
      .eq('sha256', sha256)
      .limit(1);

    if (exactMatches && exactMatches.length > 0) {
      // 获取上传者信息
      const match = exactMatches[0];
      const { data: uploader } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', match.employee_id)
        .single();
      const { data: team } = await supabase
        .from('teams')
        .select('team_name')
        .eq('id', match.team_id)
        .single();

      return NextResponse.json({
        verified: false,
        duplicate: 'exact',
        error: '该微信截图已存在，不能重复创建客户。',
        duplicateInfo: {
          employee_name: uploader?.name || '未知',
          team_name: team?.team_name || '未知',
        },
      });
    }

    // 查重：检查 pHash 相似的图片（整个公司范围，汉明距离 <= 10）
    const { data: allImages } = await supabase
      .from('customer_images')
      .select('id, phash, employee_id, team_id')
      .not('phash', 'is', null);

    if (allImages) {
      for (const img of allImages) {
        if (img.phash && hammingDistance(phash, img.phash) <= 10) {
          const { data: uploader } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', img.employee_id)
            .single();
          const { data: team } = await supabase
            .from('teams')
            .select('team_name')
            .eq('id', img.team_id)
            .single();

          return NextResponse.json({
            verified: false,
            duplicate: 'similar',
            error: '该微信截图与已有截图高度相似，不能重复创建客户。',
            duplicateInfo: {
              employee_name: uploader?.name || '未知',
              team_name: team?.team_name || '未知',
            },
          });
        }
      }
    }

    // 也检查 verification 表中已验证但未使用的图片
    const { data: existingVerifications } = await supabase
      .from('wechat_verifications')
      .select('id, sha256, phash')
      .eq('status', 'verified');

    if (existingVerifications) {
      for (const v of existingVerifications) {
        if (v.sha256 === sha256) {
          return NextResponse.json({
            verified: false,
            duplicate: 'exact',
            error: '该微信截图已存在，不能重复创建客户。',
          });
        }
        if (v.phash && hammingDistance(phash, v.phash) <= 10) {
          return NextResponse.json({
            verified: false,
            duplicate: 'similar',
            error: '该微信截图与已有截图高度相似，不能重复创建客户。',
          });
        }
      }
    }

    // 验证通过：上传图片到 S3
    const storage = await getStorage();
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `wechat-verify/${user.userId}/${Date.now()}.${ext}`;

    await storage.uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType: file.type,
    });

    const imageUrl = await storage.generatePresignedUrl({
      key,
      expireTime: 3600,
    });

    // 创建验证记录
    const { data: verification, error: insertError } = await supabase
      .from('wechat_verifications')
      .insert({
        employee_id: user.userId,
        team_id: user.teamId,
        image_url: key,
        sha256,
        phash,
        status: 'verified',
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建验证记录失败:', insertError);
      return NextResponse.json({ error: '验证记录创建失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      data: {
        verification_id: verification.id,
        image_url: imageUrl,
        sha256,
        message: '微信截图验证通过，可以继续填写客户信息。',
      },
    });
  } catch (err) {
    console.error('微信截图验证异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET /api/employee/verify-wechat - 获取当前员工的验证状态
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // 获取当前员工最新的已验证但未使用的记录（30分钟内有效）
    const { data: verification } = await supabase
      .from('wechat_verifications')
      .select('*')
      .eq('employee_id', user.userId)
      .eq('status', 'verified')
      .gte('verified_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!verification) {
      return NextResponse.json({ success: true, data: { verified: false } });
    }

    // 获取图片预览 URL
    const storage = await getStorage();
    const imageUrl = await storage.generatePresignedUrl({
      key: verification.image_url,
      expireTime: 3600,
    });

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        verification_id: verification.id,
        image_url: imageUrl,
        verified_at: verification.verified_at,
      },
    });
  } catch (err) {
    console.error('获取验证状态异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 汉明距离计算
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const x = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    // Count bits
    let bits = x;
    while (bits > 0) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}
