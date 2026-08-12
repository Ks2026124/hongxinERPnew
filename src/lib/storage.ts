import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Supabase Storage - 对象存储层
// Bucket: images
// 环境变量:
//   NEXT_PUBLIC_SUPABASE_URL       - Supabase 项目 URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  - Supabase 匿名 Key
//   SUPABASE_SERVICE_ROLE_KEY      - Supabase Service Role Key (服务端使用)
// ============================================================

const BUCKET_NAME = 'images';

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  // 服务端优先使用 service role key（绕过 RLS），回退到 anon key
  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error('No Supabase key configured');
  }

  serverClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}

class SupabaseStorage {
  private get client(): SupabaseClient {
    return getServerClient();
  }

  private get bucket() {
    return this.client.storage.from(BUCKET_NAME);
  }

  /**
   * 上传文件到 Supabase Storage
   * @param params.fileContent - 文件内容 (Buffer/Uint8Array/Blob)
   * @param params.fileName - 存储路径 (object key)
   * @param params.contentType - MIME 类型
   * @returns 实际存储的 object key (路径)
   */
  async uploadFile(params: {
    fileContent: Buffer | Uint8Array | Blob;
    fileName: string;
    contentType?: string;
  }): Promise<string> {
    const body = params.fileContent instanceof Blob
      ? Buffer.from(await params.fileContent.arrayBuffer())
      : params.fileContent;

    const { error } = await this.bucket.upload(params.fileName, body, {
      contentType: params.contentType || 'application/octet-stream',
      upsert: true,
    });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return params.fileName;
  }

  /**
   * 检查文件是否存在于 Supabase Storage
   */
  async fileExists(params: { fileKey: string }): Promise<boolean> {
    // 从 fileKey 中提取目录和文件名
    const lastSlash = params.fileKey.lastIndexOf('/');
    const folder = lastSlash > 0 ? params.fileKey.substring(0, lastSlash) : '';
    const filename = lastSlash > 0 ? params.fileKey.substring(lastSlash + 1) : params.fileKey;

    const { data, error } = await this.bucket.list(folder, {
      search: filename,
      limit: 1,
    });

    if (error) {
      return false;
    }

    return data.some((item: { name: string }) => item.name === filename);
  }

  /**
   * 生成预签名 URL（临时访问链接）
   * @param params.key - object key (存储路径)
   * @param params.expireTime - 过期时间（秒）
   */
  async generatePresignedUrl(params: {
    key: string;
    expireTime?: number;
  }): Promise<string> {
    const { data, error } = await this.bucket.createSignedUrl(
      params.key,
      params.expireTime || 3600
    );

    if (error) {
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * 删除文件
   */
  async deleteFile(params: { fileKey: string }): Promise<void> {
    const { error } = await this.bucket.remove([params.fileKey]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

// ============================================================
// 单例
// ============================================================

let storageInstance: SupabaseStorage | null = null;

export function getStorage(): SupabaseStorage {
  if (!storageInstance) {
    storageInstance = new SupabaseStorage();
  }
  return storageInstance;
}

// 允许的图片类型
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// 最大文件大小 (10MB)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function isValidImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || 'jpg';
}
