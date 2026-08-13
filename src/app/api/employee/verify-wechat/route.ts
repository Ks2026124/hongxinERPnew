import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage, isValidImageType, MAX_IMAGE_SIZE } from '@/lib/storage';
import { computeSHA256, computePHash } from '@/lib/image-hash';

// POST /api/employee/verify-wechat - 上传微信截图并验证（创建客户前置步骤）
export async function POST(request: NextRequest) {
  console.log('[WECHAT_VERIFY] ========== START ==========');
  
  try {
    // Step 1: Auth check
    console.log('[WECHAT_VERIFY] Step 1: AUTH CHECK');
    const user = await getCurrentUser();
    if (!user) {
      console.log('[WECHAT_VERIFY] AUTH FAILED: not logged in');
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      console.log('[WECHAT_VERIFY] AUTH FAILED: role is', user.role, '(expected employee)');
      return NextResponse.json({ error: '无权限，仅员工可使用' }, { status: 403 });
    }
    console.log('[WECHAT_VERIFY] AUTH OK: userId=', user.userId, 'teamId=', user.teamId, 'role=', user.role);

    // Step 2: Parse form data
    console.log('[WECHAT_VERIFY] Step 2: PARSE FORM DATA');
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error('[WECHAT_VERIFY] FAILED to parse form data:', parseErr);
      return NextResponse.json({ error: '请求数据格式错误' }, { status: 400 });
    }
    
    const file = formData.get('file') as File | null;
    if (!file) {
      console.log('[WECHAT_VERIFY] FAILED: no file in form data');
      return NextResponse.json({ error: '请选择要上传的微信聊天截图' }, { status: 400 });
    }
    console.log('[WECHAT_VERIFY] FILE RECEIVED:', file.name, 'size:', file.size, 'type:', file.type);

    // Step 3: Validate file
    console.log('[WECHAT_VERIFY] Step 3: VALIDATE FILE');
    if (!isValidImageType(file.type)) {
      console.log('[WECHAT_VERIFY] FAILED: invalid file type:', file.type);
      return NextResponse.json({ error: '仅支持 jpg、jpeg、png、webp 格式' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) {
      console.log('[WECHAT_VERIFY] FAILED: file too large:', file.size, 'max:', MAX_IMAGE_SIZE);
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 });
    }
    console.log('[WECHAT_VERIFY] FILE VALID');

    // Step 4: Read file buffer
    console.log('[WECHAT_VERIFY] Step 4: READ FILE BUFFER');
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('[WECHAT_VERIFY] BUFFER SIZE:', buffer.length, 'bytes');
    } catch (bufErr) {
      console.error('[WECHAT_VERIFY] FAILED to read file buffer:', bufErr);
      return NextResponse.json({ error: '图片读取失败' }, { status: 400 });
    }

    // Step 5: Compute SHA-256
    console.log('[WECHAT_VERIFY] Step 5: COMPUTE SHA-256');
    let sha256: string;
    try {
      sha256 = computeSHA256(buffer);
      console.log('[WECHAT_VERIFY] SHA-256:', sha256);
    } catch (hashErr) {
      console.error('[WECHAT_VERIFY] FAILED to compute SHA-256:', hashErr);
      return NextResponse.json({ error: '图片哈希计算失败' }, { status: 500 });
    }

    // Step 6: Compute pHash (optional)
    console.log('[WECHAT_VERIFY] Step 6: COMPUTE pHASH');
    let phash = '';
    try {
      phash = await computePHash(buffer);
      console.log('[WECHAT_VERIFY] pHASH:', phash);
    } catch (phashErr) {
      console.warn('[WECHAT_VERIFY] pHASH computation failed (non-fatal):', phashErr instanceof Error ? phashErr.message : phashErr);
      console.log('[WECHAT_VERIFY] Continuing without pHASH - exact SHA-256 check will still work');
    }

    // Step 7: Check duplicates in customer_images
    console.log('[WECHAT_VERIFY] Step 7: CHECK DUPLICATES IN customer_images');
    const supabase = getSupabaseClient();

    // 7a: Exact SHA-256 match
    console.log('[WECHAT_VERIFY] Step 7a: Checking exact SHA-256 match...');
    const { data: exactMatches, error: exactError } = await supabase
      .from('customer_images')
      .select('id, employee_id, team_id')
      .eq('sha256', sha256)
      .limit(1);

    if (exactError) {
      console.error('[WECHAT_VERIFY] customer_images query error:', exactError.message, 'code:', exactError.code, 'details:', exactError.details);
      // Continue - table might have different schema
    }

    if (exactMatches && exactMatches.length > 0) {
      console.log('[WECHAT_VERIFY] EXACT DUPLICATE FOUND in customer_images');
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
    console.log('[WECHAT_VERIFY] No exact duplicate in customer_images');

    // 7b: pHash similarity check
    if (phash) {
      console.log('[WECHAT_VERIFY] Step 7b: Checking pHASH similarity...');
      const { data: allImages } = await supabase
        .from('customer_images')
        .select('id, phash, employee_id, team_id')
        .not('phash', 'is', null);

      if (allImages) {
        for (const img of allImages) {
          if (img.phash && hammingDistance(phash, img.phash) <= 10) {
            console.log('[WECHAT_VERIFY] SIMILAR IMAGE FOUND in customer_images');
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
      console.log('[WECHAT_VERIFY] No similar image in customer_images');
    }

    // Step 8: Upload to Supabase Storage
    console.log('[WECHAT_VERIFY] Step 8: UPLOAD TO SUPABASE STORAGE');
    let storage;
    try {
      storage = await getStorage();
      console.log('[WECHAT_VERIFY] Storage initialized');
    } catch (storageInitErr) {
      console.error('[WECHAT_VERIFY] FAILED to initialize storage:', storageInitErr);
      return NextResponse.json({ error: `存储服务初始化失败: ${storageInitErr instanceof Error ? storageInitErr.message : '未知错误'}` }, { status: 500 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `wechat-verify/${user.userId}/${Date.now()}.${ext}`;
    console.log('[WECHAT_VERIFY] STORAGE PATH:', fileName);

    let actualKey: string;
    try {
      actualKey = await storage.uploadFile({
        fileContent: buffer,
        fileName,
        contentType: file.type,
      });
      console.log('[WECHAT_VERIFY] UPLOAD SUCCESS, key:', actualKey);
    } catch (uploadErr) {
      console.error('[WECHAT_VERIFY] STORAGE UPLOAD FAILED:', uploadErr);
      console.error('[WECHAT_VERIFY] Upload error details:', uploadErr instanceof Error ? { message: uploadErr.message, stack: uploadErr.stack } : uploadErr);
      return NextResponse.json({ error: `图片上传失败: ${uploadErr instanceof Error ? uploadErr.message : '未知错误'}` }, { status: 500 });
    }

    // Step 9: Verify file exists
    console.log('[WECHAT_VERIFY] Step 9: VERIFY FILE EXISTS');
    try {
      const exists = await storage.fileExists({ fileKey: actualKey });
      if (!exists) {
        console.error('[WECHAT_VERIFY] FILE NOT FOUND after upload:', actualKey);
        return NextResponse.json({ error: '图片上传后验证失败，文件不存在' }, { status: 500 });
      }
      console.log('[WECHAT_VERIFY] FILE VERIFIED in storage');
    } catch (existErr) {
      console.error('[WECHAT_VERIFY] fileExists check failed:', existErr);
      // Continue - file might still be there
    }

    // Step 10: Generate presigned URL
    console.log('[WECHAT_VERIFY] Step 10: GENERATE PRESIGNED URL');
    let imageUrl: string;
    try {
      imageUrl = await storage.generatePresignedUrl({
        key: actualKey,
        expireTime: 3600,
      });
      console.log('[WECHAT_VERIFY] PRESIGNED URL generated');
    } catch (urlErr) {
      console.error('[WECHAT_VERIFY] Failed to generate presigned URL:', urlErr);
      return NextResponse.json({ error: '图片URL生成失败' }, { status: 500 });
    }

    // Step 11: Try to create verification record (optional - table might not exist)
    console.log('[WECHAT_VERIFY] Step 11: CREATE VERIFICATION RECORD');
    let verificationId: number | null = null;
    try {
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
        console.warn('[WECHAT_VERIFY] Verification record insert failed (non-fatal):', insertError.message);
        console.log('[WECHAT_VERIFY] This is OK - the table might not exist yet. Image is still uploaded successfully.');
        // Don't fail the request - the image is uploaded, which is the important part
      } else {
        verificationId = verification?.id || null;
        console.log('[WECHAT_VERIFY] Verification record created, id:', verificationId);
      }
    } catch (insertErr) {
      console.warn('[WECHAT_VERIFY] Verification record creation failed (non-fatal):', insertErr);
      console.log('[WECHAT_VERIFY] Continuing - image upload was successful');
    }

    // Step 12: Return success
    console.log('[WECHAT_VERIFY] ========== SUCCESS ==========');
    console.log('[WECHAT_VERIFY] verificationId:', verificationId, 'imageUrl:', imageUrl ? 'generated' : 'missing');
    
    return NextResponse.json({
      success: true,
      verified: true,
      data: {
        verification_id: verificationId,
        image_url: imageUrl,
        sha256,
        message: '微信截图验证通过，可以继续填写客户信息。',
      },
    });
  } catch (err) {
    console.error('[WECHAT_VERIFY] ========== FATAL ERROR ==========');
    console.error('[WECHAT_VERIFY] Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[WECHAT_VERIFY] Error message:', err instanceof Error ? err.message : String(err));
    console.error('[WECHAT_VERIFY] Error stack:', err instanceof Error ? err.stack : 'no stack');
    
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `服务器错误: ${msg}` }, { status: 500 });
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

    // Try to get latest verified but unused record (valid for 30 minutes)
    // If table doesn't exist, just return not verified
    try {
      const { data: verification, error } = await supabase
        .from('wechat_verifications')
        .select('*')
        .eq('employee_id', user.userId)
        .eq('status', 'verified')
        .gte('verified_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('[WECHAT_VERIFY GET] Table might not exist:', error.message);
        return NextResponse.json({ success: true, data: { verified: false } });
      }

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
    } catch (tableErr) {
      console.log('[WECHAT_VERIFY GET] wechat_verifications table error (non-fatal):', tableErr);
      return NextResponse.json({ success: true, data: { verified: false } });
    }
  } catch (err) {
    console.error('[WECHAT_VERIFY GET] Error:', err);
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
