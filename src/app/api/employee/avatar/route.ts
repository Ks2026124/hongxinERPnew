import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage } from '@/lib/storage';

// GET /api/employee/avatar?ids=1,2,3 - 批量获取员工头像 URL
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json({ error: '缺少员工 ID 参数' }, { status: 400 });
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    const supabase = getSupabaseClient();
    
    // 获取员工的 avatar_key
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', ids);

    if (error) {
      console.error('[AVATAR] 查询员工头像失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const storage = getStorage();
    const avatarMap: Record<number, string | null> = {};

    // 为每个有头像的员工生成 presigned URL
    await Promise.all(
      (profiles || []).map(async (profile) => {
        if (profile.avatar_url) {
          try {
            const exists = await storage.fileExists({ fileKey: profile.avatar_url });
            if (exists) {
              const presignedUrl = await storage.generatePresignedUrl({
                key: profile.avatar_url,
                expireTime: 24 * 60 * 60, // 1 天有效期
              });
              avatarMap[profile.id] = presignedUrl;
            } else {
              avatarMap[profile.id] = null;
            }
          } catch (err) {
            console.error(`[AVATAR] 生成 presigned URL 失败 (employee_id=${profile.id}):`, err);
            avatarMap[profile.id] = null;
          }
        } else {
          avatarMap[profile.id] = null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: avatarMap,
    });
  } catch (err) {
    console.error('[AVATAR] 获取员工头像失败:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
