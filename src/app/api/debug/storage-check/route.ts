import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStorage } from '@/lib/storage';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 诊断接口：检查微信截图验证所需的所有配置
 * GET /api/debug/storage-check
 * 
 * 用于在生产环境排查500错误的根因
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. 检查环境变量
  const envChecks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'images',
  };
  (results.checks as Record<string, unknown>).env = envChecks;

  // 2. 检查Supabase连接
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    (results.checks as Record<string, unknown>).database = {
      connected: !error,
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
      sampleData: data ? { count: data.length } : null,
    };
  } catch (err) {
    (results.checks as Record<string, unknown>).database = {
      connected: false,
      error: { message: (err as Error).message },
    };
  }

  // 3. 检查wechat_verifications表
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('wechat_verifications').select('id').limit(1);
    (results.checks as Record<string, unknown>).wechatVerificationsTable = {
      exists: !error,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      sampleData: data ? { count: data.length } : null,
    };
  } catch (err) {
    (results.checks as Record<string, unknown>).wechatVerificationsTable = {
      exists: false,
      error: { message: (err as Error).message },
    };
  }

  // 4. 检查customer_images表
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('customer_images').select('id').limit(1);
    (results.checks as Record<string, unknown>).customerImagesTable = {
      exists: !error,
      error: error ? { message: error.message, code: error.code } : null,
    };
  } catch (err) {
    (results.checks as Record<string, unknown>).customerImagesTable = {
      exists: false,
      error: { message: (err as Error).message },
    };
  }

  // 5. 检查Storage
  try {
    const storage = getStorage();
    (results.checks as Record<string, unknown>).storage = {
      initialized: true,
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'images',
    };

    // 尝试列出bucket中的文件
    const supabase = getSupabaseClient();
    const { data: files, error: listError } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'images')
      .list('', { limit: 1 });
    
    (results.checks as Record<string, unknown>).storageList = {
      success: !listError,
      error: listError ? { message: listError.message, statusCode: listError.statusCode, name: listError.name } : null,
      fileCount: files ? files.length : 0,
    };
  } catch (err) {
    (results.checks as Record<string, unknown>).storage = {
      initialized: false,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    };
  }

  // 6. 检查sharp库
  try {
    const sharp = require('sharp');
    const testBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } }
    }).png().toBuffer();
    (results.checks as Record<string, unknown>).sharp = {
      working: true,
      testBufferSize: testBuffer.length,
    };
  } catch (err) {
    (results.checks as Record<string, unknown>).sharp = {
      working: false,
      error: { message: (err as Error).message },
    };
  }

  // 7. 检查认证
  try {
    const user = await getCurrentUser();
    (results.checks as Record<string, unknown>).auth = {
      hasSession: !!user,
      user: user ? { userId: user.userId, role: user.role } : null,
    };
  } catch (err) {
    (results.checks as Record<string, unknown>).auth = {
      hasSession: false,
      error: { message: (err as Error).message },
    };
  }

  return NextResponse.json(results);
}
