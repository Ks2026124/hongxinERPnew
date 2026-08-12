import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage } from '@/lib/storage';

// GET /api/admin/images - 管理员获取全部图片（含筛选）
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');
    const employeeId = searchParams.get('employee_id');
    const customerId = searchParams.get('customer_id');

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('customer_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', parseInt(teamId));
    }
    if (employeeId) {
      query = query.eq('employee_id', parseInt(employeeId));
    }
    if (customerId) {
      query = query.eq('customer_id', parseInt(customerId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取图片列表失败:', error);
      return NextResponse.json({ error: '获取图片列表失败' }, { status: 500 });
    }

    // 生成签名 URL
    const storage = getStorage();
    const imagesWithUrls = await Promise.all(
      (data || []).map(async (img) => ({
        ...img,
        image_url: await storage.generatePresignedUrl({
          key: img.image_url,
          expireTime: 86400 * 365,
        }),
      }))
    );

    return NextResponse.json({ success: true, data: imagesWithUrls });
  } catch (err) {
    console.error('获取图片列表异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
