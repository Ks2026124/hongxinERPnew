import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { computeSHA256, computePHash, isSimilar } from '@/lib/image-hash';

// POST /api/employee/customers/[id]/images/check-duplicate - 检查图片重复
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户 ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // 验证客户属于当前员工
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, team_id')
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: '客户不存在或无权操作' }, { status: 404 });
    }

    // 解析上传的图片
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要检查的图片' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 jpg、jpeg、png、webp 格式' }, { status: 400 });
    }

    // 读取文件并计算哈希
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = computeSHA256(buffer);
    const phash = await computePHash(buffer);

    // 1. 检查 SHA-256 完全相同的图片
    const { data: exactMatches } = await supabase
      .from('customer_images')
      .select('id, created_at, employee_id, team_id, customer_id')
      .eq('sha256', sha256)
      .limit(5);

    if (exactMatches && exactMatches.length > 0) {
      // 获取关联的员工、团队、客户信息
      const employeeIds = [...new Set(exactMatches.map(m => m.employee_id))];
      const teamIds = [...new Set(exactMatches.map(m => m.team_id))];
      const customerIds = [...new Set(exactMatches.map(m => m.customer_id))];

      const [employeesRes, teamsRes, customersRes] = await Promise.all([
        supabase.from('profiles').select('id, name').in('id', employeeIds),
        supabase.from('teams').select('id, team_name').in('id', teamIds),
        supabase.from('customers').select('id, customer_name').in('id', customerIds),
      ]);

      const empMap = new Map((employeesRes.data || []).map(e => [e.id, e.name]));
      const teamMap = new Map((teamsRes.data || []).map(t => [t.id, t.team_name]));
      const custMap = new Map((customersRes.data || []).map(c => [c.id, c.customer_name]));

      return NextResponse.json({
        success: true,
        duplicate: 'exact',
        message: '该图片已经上传过，无法重复上传。',
        duplicates: exactMatches.map(img => ({
          id: img.id,
          uploaded_at: img.created_at,
          employee_name: empMap.get(img.employee_id) || '未知',
          team_name: teamMap.get(img.team_id) || '未知',
          customer_name: custMap.get(img.customer_id) || '未知',
        })),
      });
    }

    // 2. 检查 pHash 相似的图片
    const { data: allImages } = await supabase
      .from('customer_images')
      .select('id, phash, created_at, employee_id, team_id, customer_id')
      .not('phash', 'is', null)
      .limit(500);

    const similarImages = [];
    if (allImages) {
      for (const img of allImages) {
        if (img.phash && isSimilar(phash, img.phash)) {
          similarImages.push(img);
        }
      }
    }

    if (similarImages.length > 0) {
      // 获取关联信息
      const simEmployeeIds = [...new Set(similarImages.map(m => m.employee_id))];
      const simTeamIds = [...new Set(similarImages.map(m => m.team_id))];
      const simCustomerIds = [...new Set(similarImages.map(m => m.customer_id))];

      const [empRes2, teamRes2, custRes2] = await Promise.all([
        supabase.from('profiles').select('id, name').in('id', simEmployeeIds),
        supabase.from('teams').select('id, team_name').in('id', simTeamIds),
        supabase.from('customers').select('id, customer_name').in('id', simCustomerIds),
      ]);

      const empMap2 = new Map((empRes2.data || []).map(e => [e.id, e.name]));
      const teamMap2 = new Map((teamRes2.data || []).map(t => [t.id, t.team_name]));
      const custMap2 = new Map((custRes2.data || []).map(c => [c.id, c.customer_name]));

      return NextResponse.json({
        success: true,
        duplicate: 'similar',
        message: '检测到高度相似的微信截图，请确认是否已经上传。',
        duplicates: similarImages.slice(0, 5).map(img => ({
          id: img.id,
          uploaded_at: img.created_at,
          employee_name: empMap2.get(img.employee_id) || '未知',
          team_name: teamMap2.get(img.team_id) || '未知',
          customer_name: custMap2.get(img.customer_id) || '未知',
        })),
        sha256,
        phash,
      });
    }

    // 3. 没有重复
    return NextResponse.json({
      success: true,
      duplicate: null,
      message: '没有发现重复图片，可以上传。',
      sha256,
      phash,
    });
  } catch (err) {
    console.error('查重异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
