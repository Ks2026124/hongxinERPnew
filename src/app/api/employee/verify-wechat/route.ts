import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage, isValidImageType, MAX_IMAGE_SIZE } from '@/lib/storage';
import { computeSHA256, computePHash } from '@/lib/image-hash';

// POST /api/employee/verify-wechat - 上传微信截图并验证（创建客户前置步骤）
export async function POST(request: NextRequest) {
  console.log('[VERIFY-WECHAT] === Request started ===');
  
  try {
    // Step 1: Auth check
    console.log('[VERIFY-WECHAT] Step 1: Checking authentication...');
    const user = await getCurrentUser();
    if (!user) {
      console.log('[VERIFY-WECHAT] Auth failed: not logged in');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      console.log('[VERIFY-WECHAT] Auth failed: role is', user.role);
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    console.log('[VERIFY-WECHAT] Auth OK: userId=', user.userId, 'role=', user.role);

    // Step 2: Parse form data
    console.log('[VERIFY-WECHAT] Step 2: Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.log('[VERIFY-WECHAT] No file provided');
      return NextResponse.json({ error: '请选择要上传的微信聊天截图' }, { status: 400 });
    }
    console.log('[VERIFY-WECHAT] File received:', file.name, 'size:', file.size, 'type:', file.type);

    // Step 3: Validate file
    console.log('[VERIFY-WECHAT] Step 3: Validating file...');
    if (!isValidImageType(file.type)) {
      return NextResponse.json({ error: '仅支持 jpg、jpeg、png、webp 格式' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 });
    }

    // Step 4: Read file buffer
    console.log('[VERIFY-WECHAT] Step 4: Reading file buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[VERIFY-WECHAT] Buffer size:', buffer.length);

    // Step 5: Compute hashes
    console.log('[VERIFY-WECHAT] Step 5: Computing SHA-256...');
    const sha256 = computeSHA256(buffer);
    console.log('[VERIFY-WECHAT] SHA-256:', sha256);

    console.log('[VERIFY-WECHAT] Step 5b: Computing pHash (using sharp)...');
    let phash: string;
    try {
      phash = await computePHash(buffer);
      console.log('[VERIFY-WECHAT] pHash:', phash);
    } catch (phashErr) {
      console.error('[VERIFY-WECHAT] pHash computation failed:', phashErr);
      // Continue without pHash - exact SHA-256 check will still work
      phash = '';
    }

    // Step 6: Check duplicates in customer_images
    console.log('[VERIFY-WECHAT] Step 6: Checking duplicates in customer_images...');
    const supabase = getSupabaseClient();

    const { data: exactMatches, error: exactError } = await supabase
      .from('customer_images')
      .select('id, employee_id, team_id')
      .eq('sha256', sha256)
      .limit(1);

    if (exactError) {
      console.error('[VERIFY-WECHAT] customer_images query error:', exactError);
    }

    if (exactMatches && exactMatches.length > 0) {
      console.log('[VERIFY-WECHAT] Exact duplicate found in customer_images');
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

    // Step 7: Check pHash similarity
    console.log('[VERIFY-WECHAT] Step 7: Checking pHash similarity...');
    if (phash) {
      const { data: allImages } = await supabase
        .from('customer_images')
        .select('id, phash, employee_id, team_id')
        .not('phash', 'is', null);

      if (allImages) {
        for (const img of allImages) {
          if (img.phash && hammingDistance(phash, img.phash) <= 10) {
            console.log('[VERIFY-WECHAT] Similar image found in customer_images');
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
    }

    // Step 8: Check wechat_verifications table (may not exist in production)
    console.log('[VERIFY-WECHAT] Step 8: Checking wechat_verifications...');
    try {
      const { data: existingVerifications, error: verifError } = await supabase
        .from('wechat_verifications')
        .select('id, sha256, phash')
        .eq('status', 'verified');

      if (verifError) {
        console.warn('[VERIFY-WECHAT] wechat_verifications query error (table may not exist):', verifError.message);
        // Continue - table might not exist, we'll create it later
      } else if (existingVerifications) {
        console.log('[VERIFY-WECHAT] Found', existingVerifications.length, 'existing verifications');
        for (const v of existingVerifications) {
          if (v.sha256 === sha256) {
            console.log('[VERIFY-WECHAT] Exact duplicate found in wechat_verifications');
            return NextResponse.json({
              verified: false,
              duplicate: 'exact',
              error: '该微信截图已存在，不能重复创建客户。',
            });
          }
          if (phash && v.phash && hammingDistance(phash, v.phash) <= 10) {
            console.log('[VERIFY-WECHAT] Similar image found in wechat_verifications');
            return NextResponse.json({
              verified: false,
              duplicate: 'similar',
              error: '该微信截图与已有截图高度相似，不能重复创建客户。',
            });
          }
        }
      }
    } catch (verifErr) {
      console.warn('[VERIFY-WECHAT] wechat_verifications table check failed (continuing):', verifErr);
      // Continue - table might not exist
    }

    // Step 9: Upload to Supabase Storage
    console.log('[VERIFY-WECHAT] Step 9: Uploading to Supabase Storage...');
    const storage = await getStorage();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `wechat-verify/${user.userId}/${Date.now()}.${ext}`;
    console.log('[VERIFY-WECHAT] Storage path:', fileName);

    let actualKey: string;
    try {
      actualKey = await storage.uploadFile({
        fileContent: buffer,
        fileName,
        contentType: file.type,
      });
      console.log('[VERIFY-WECHAT] Upload success, key:', actualKey);
    } catch (uploadErr) {
      console.error('[VERIFY-WECHAT] Storage upload failed:', uploadErr);
      return NextResponse.json({ error: `图片上传失败: ${uploadErr instanceof Error ? uploadErr.message : '未知错误'}` }, { status: 500 });
    }

    // Step 10: Verify file exists
    console.log('[VERIFY-WECHAT] Step 10: Verifying file exists...');
    const exists = await storage.fileExists({ fileKey: actualKey });
    if (!exists) {
      console.error('[VERIFY-WECHAT] File not found after upload:', actualKey);
      return NextResponse.json({ error: '图片上传后验证失败' }, { status: 500 });
    }
    console.log('[VERIFY-WECHAT] File verified in storage');

    // Step 11: Generate presigned URL
    console.log('[VERIFY-WECHAT] Step 11: Generating presigned URL...');
    const imageUrl = await storage.generatePresignedUrl({
      key: actualKey,
      expireTime: 3600,
    });
    console.log('[VERIFY-WECHAT] Presigned URL generated');

    // Step 12: Create verification record
    console.log('[VERIFY-WECHAT] Step 12: Creating verification record...');
    const { data: verification, error: insertError } = await supabase
      .from('wechat_verifications')
      .insert({
        employee_id: user.userId,
        team_id: user.teamId,
        image_url: actualKey,
        sha256,
        phash: phash || null,
        status: 'verified',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[VERIFY-WECHAT] Insert error:', insertError);
      // If table doesn't exist, try to create it
      if (insertError.message?.includes('does not exist') || insertError.code === '42P01') {
        console.log('[VERIFY-WECHAT] Table does not exist, attempting to create...');
        const createResult = await createWechatVerificationsTable(supabase);
        if (createResult.success) {
          console.log('[VERIFY-WECHAT] Table created successfully, retrying insert...');
          const retryResult = await supabase
            .from('wechat_verifications')
            .insert({
              employee_id: user.userId,
              team_id: user.teamId,
              image_url: actualKey,
              sha256,
              phash: phash || null,
              status: 'verified',
            })
            .select()
            .single();
          
          if (retryResult.error) {
            console.error('[VERIFY-WECHAT] Retry insert failed:', retryResult.error);
            return NextResponse.json({ error: `验证记录创建失败: ${retryResult.error.message}` }, { status: 500 });
          }
          
          console.log('[VERIFY-WECHAT] === Request completed successfully (table auto-created) ===');
          return NextResponse.json({
            success: true,
            verified: true,
            data: {
              verification_id: retryResult.data.id,
              image_url: imageUrl,
              sha256,
              message: '微信截图验证通过，可以继续填写客户信息。',
            },
          });
        } else {
          console.error('[VERIFY-WECHAT] Failed to create table:', createResult.error);
          return NextResponse.json({ error: `wechat_verifications表不存在且创建失败: ${createResult.error}` }, { status: 500 });
        }
      }
      return NextResponse.json({ error: `验证记录创建失败: ${insertError.message}` }, { status: 500 });
    }

    console.log('[VERIFY-WECHAT] === Request completed successfully ===');
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
    console.error('[VERIFY-WECHAT] FATAL ERROR:', err);
    console.error('[VERIFY-WECHAT] Error stack:', err instanceof Error ? err.stack : 'no stack');
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${msg}` }, { status: 500 });
  }
}

// Helper: Create wechat_verifications table if it doesn't exist
async function createWechatVerificationsTable(supabase: ReturnType<typeof getSupabaseClient>): Promise<{ success: boolean; error?: string }> {
  try {
    // Use Supabase REST API to execute raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS wechat_verifications (
        id serial PRIMARY KEY,
        employee_id integer NOT NULL REFERENCES profiles(id),
        team_id integer NOT NULL REFERENCES teams(id),
        image_url varchar NOT NULL,
        sha256 varchar,
        phash varchar,
        status varchar NOT NULL DEFAULT 'verified',
        customer_id integer REFERENCES customers(id),
        verified_at timestamptz NOT NULL DEFAULT now(),
        used_at timestamptz
      ); ALTER TABLE wechat_verifications DISABLE ROW LEVEL SECURITY;`
    });
    
    if (error) {
      // RPC function might not exist, try alternative approach
      console.log('[VERIFY-WECHAT] RPC exec_sql not available, table must be created manually');
      return { success: false, error: '需要手动在Supabase SQL Editor中创建wechat_verifications表' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
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

    // Get latest verified but unused record (valid for 30 minutes)
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

    // Get image preview URL
    const storage = await getStorage();
    let imageUrl = '';
    try {
      const exists = await storage.fileExists({ fileKey: verification.image_url });
      if (exists) {
        imageUrl = await storage.generatePresignedUrl({
          key: verification.image_url,
          expireTime: 3600,
        });
      }
    } catch {
      // Old image might not be in current storage
    }

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
    console.error('[VERIFY-WECHAT GET] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// Hamming distance calculation
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const x = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    let bits = x;
    while (bits > 0) {
      distance += bits & 1;
      bits >>= 1;
    }
  }
  return distance;
}
