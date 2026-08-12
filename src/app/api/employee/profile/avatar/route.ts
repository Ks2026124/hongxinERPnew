import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage, isValidImageType, getFileExtension } from '@/lib/storage';

// 头像最大 2MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// POST /api/employee/profile/avatar - 上传头像
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的头像' }, { status: 400 });
    }

    // 验证文件类型
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '仅支持 JPG、PNG、WEBP 格式' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: '头像大小不能超过 2MB' },
        { status: 400 }
      );
    }

    // 上传到对象存储
    const storage = await getStorage();
    const ext = getFileExtension(file.name);
    const fileKey = `avatars/${user.userId}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadedKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileKey,
      contentType: file.type,
    });

    // 验证文件确实存在
    const exists = await storage.fileExists({ fileKey: uploadedKey });
    if (!exists) {
      console.error('S3 文件上传后验证失败:', uploadedKey);
      return NextResponse.json({ error: '头像上传失败，请重试' }, { status: 500 });
    }

    // 获取预签名 URL（用于显示）
    const presignedUrl = await storage.generatePresignedUrl({
      key: uploadedKey,
      expireTime: 7 * 24 * 60 * 60, // 7 天有效期
    });

    // 更新数据库中的 avatar_url（存储 key）
    const supabase = getSupabaseClient();
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: uploadedKey, updated_at: new Date().toISOString() })
      .eq('id', user.userId);

    if (dbError) {
      console.error('更新头像 URL 失败:', dbError);
      return NextResponse.json({ error: '保存头像失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar_url: presignedUrl,
        avatar_key: uploadedKey,
      },
    });
  } catch (err) {
    console.error('上传头像失败:', err);
    return NextResponse.json({ error: '上传头像失败' }, { status: 500 });
  }
}

// GET /api/employee/profile/avatar - 获取头像 URL
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.userId)
      .single();

    if (!profile?.avatar_url) {
      return NextResponse.json({ success: true, data: { avatar_url: null } });
    }

    // 获取预签名 URL
    const storage = getStorage();
    const exists = await storage.fileExists({ fileKey: profile.avatar_url });
    if (!exists) {
      return NextResponse.json({ success: true, data: { avatar_url: null } });
    }
    const presignedUrl = await storage.generatePresignedUrl({
      key: profile.avatar_url,
      expireTime: 24 * 60 * 60, // 1 天有效期
    });

    return NextResponse.json({
      success: true,
      data: { avatar_url: presignedUrl },
    });
  } catch (err) {
    console.error('获取头像失败:', err);
    return NextResponse.json({ error: '获取头像失败' }, { status: 500 });
  }
}
