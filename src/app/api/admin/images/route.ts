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
    
    // 关联查询：customers（客户姓名+备注）、profiles（员工姓名）、teams（团队名称）
    let query = supabase
      .from('customer_images')
      .select('*, customers(customer_name, remark), profiles(name), teams(team_name)')
      .order('created_at', { ascending: false });

    if (teamId && teamId !== 'all') {
      query = query.eq('team_id', parseInt(teamId));
    }
    if (employeeId && employeeId !== 'all') {
      query = query.eq('employee_id', parseInt(employeeId));
    }
    if (customerId && customerId !== 'all') {
      query = query.eq('customer_id', parseInt(customerId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取图片列表失败:', error.message, error.code, error.details);
      return NextResponse.json({ success: false, error: '获取图片列表失败' }, { status: 500 });
    }

    // 转换数据格式，提取关联信息
    const storage = getStorage();
    const imagesWithUrls = await Promise.all(
      (data || []).map(async (img) => {
        let imageUrl = '';
        let missing = false;
        try {
          const exists = await storage.fileExists({ fileKey: img.image_url });
          if (exists) {
            imageUrl = await storage.generatePresignedUrl({
              key: img.image_url,
              expireTime: 86400 * 365,
            });
          } else {
            missing = true;
          }
        } catch {
          missing = true;
        }

        return {
          id: img.id,
          customer_id: img.customer_id,
          employee_id: img.employee_id,
          team_id: img.team_id,
          image_url: imageUrl,
          sha256: img.sha256,
          phash: img.phash,
          created_at: img.created_at,
          _missing: missing,
          customer: img.customers
            ? { id: img.customer_id, customer_name: img.customers.customer_name, remark: img.customers.remark }
            : null,
          employee: img.profiles
            ? { id: img.employee_id, name: img.profiles.name }
            : null,
          team: img.teams
            ? { id: img.team_id, team_name: img.teams.team_name }
            : null,
        };
      })
    );

    return NextResponse.json({ success: true, data: imagesWithUrls });
  } catch (err) {
    console.error('获取图片列表异常:', err);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
