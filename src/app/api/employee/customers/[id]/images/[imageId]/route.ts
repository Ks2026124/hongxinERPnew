import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage } from '@/lib/storage';

// DELETE /api/employee/customers/[id]/images/[imageId] - 员工删除图片
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id, imageId } = await params;
    const customerId = parseInt(id);
    const imgId = parseInt(imageId);
    
    if (isNaN(customerId) || isNaN(imgId)) {
      return NextResponse.json({ error: '无效的参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // 验证客户属于当前员工
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: '客户不存在或无权操作' }, { status: 404 });
    }

    // 获取图片记录
    const { data: image, error: imageError } = await supabase
      .from('customer_images')
      .select('*')
      .eq('id', imgId)
      .eq('customer_id', customerId)
      .single();

    if (imageError || !image) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    // 删除存储中的文件
    const storage = getStorage();
    await storage.deleteFile({ fileKey: image.image_url });

    // 删除数据库记录
    const { error } = await supabase
      .from('customer_images')
      .delete()
      .eq('id', imgId);

    if (error) {
      console.error('删除图片记录失败:', error);
      return NextResponse.json({ error: '删除图片记录失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('删除图片异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
