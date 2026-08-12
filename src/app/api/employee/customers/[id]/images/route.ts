import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage, isValidImageType, MAX_IMAGE_SIZE, getFileExtension } from '@/lib/storage';

// POST /api/employee/customers/[id]/images - 员工上传图片
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

    // 解析 multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的图片' }, { status: 400 });
    }

    // 验证文件类型
    if (!isValidImageType(file.type)) {
      return NextResponse.json({ error: '仅支持 jpg、jpeg、png、webp 格式' }, { status: 400 });
    }

    // 验证文件大小
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 });
    }

    // 上传到对象存储
    const storage = getStorage();
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = getFileExtension(file.name);
    const fileName = `customer-images/${customerId}/${Date.now()}.${ext}`;
    
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type,
    });

    // 生成签名 URL
    const imageUrl = await storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 365, // 1 年有效期
    });

    // 保存到数据库
    const { data, error } = await supabase
      .from('customer_images')
      .insert({
        customer_id: customerId,
        employee_id: user.userId,
        team_id: customer.team_id,
        image_url: key, // 存储 key，不是 URL
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('保存图片记录失败:', error);
      // 删除已上传的文件
      await storage.deleteFile({ fileKey: key });
      return NextResponse.json({ error: '保存图片记录失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { ...data, image_url: imageUrl } 
    });
  } catch (err) {
    console.error('上传图片异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET /api/employee/customers/[id]/images - 员工获取客户图片列表
export async function GET(
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
      .select('id')
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: '客户不存在或无权查看' }, { status: 404 });
    }

    // 获取图片列表
    const { data, error } = await supabase
      .from('customer_images')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

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
