'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon, Trash2, ZoomIn } from 'lucide-react';

interface Customer {
  id: number;
  customer_name: string;
  phone: string | null;
  wechat_id: string | null;
  remark: string | null;
  created_at: string;
}

interface CustomerImage {
  id: number;
  customer_id: number;
  image_url: string;
  created_at: string;
}

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerDetailDialog({ open, onOpenChange, customer }: CustomerDetailDialogProps) {
  const [images, setImages] = useState<CustomerImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customer && open) {
      fetchImages();
    }
  }, [customer, open]);

  const fetchImages = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/customers/${customer.id}/images`);
      const data = await res.json();
      if (data.success) {
        setImages(data.data);
      }
    } catch (err) {
      console.error('获取图片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !customer) return;

    setUploading(true);
    setMessage('');

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/employee/customers/${customer.id}/images`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setMessage('图片上传成功');
          fetchImages();
        } else {
          setMessage(data.error || '上传失败');
        }
      } catch {
        setMessage('上传失败');
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (imageId: number) => {
    if (!customer) return;
    try {
      const res = await fetch(`/api/employee/customers/${customer.id}/images/${imageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchImages();
        setMessage('图片已删除');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '删除失败');
      }
    } catch {
      setMessage('删除失败');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>客户详情 - {customer.customer_name}</DialogTitle>
          </DialogHeader>

          {/* 客户信息 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">手机号</span>
              <p className="font-medium">{customer.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">微信号</span>
              <p className="font-medium">{customer.wechat_id || '-'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-muted-foreground">备注</span>
              <p className="font-medium">{customer.remark || '-'}</p>
            </div>
          </div>

          {/* 微信截图区域 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                微信截图
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? '上传中...' : '上传图片'}
                </Button>
              </div>
            </div>

            {message && (
              <div className="p-2 mb-4 rounded-md bg-primary/10 text-primary text-sm">
                {message}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : images.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">暂无截图</p>
                <p className="text-xs text-muted-foreground">点击上方按钮上传微信聊天截图</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={img.image_url}
                      alt="微信截图"
                      className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setPreviewImage(img.image_url)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setPreviewImage(img.image_url)}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white"
                      >
                        <ZoomIn className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <span className="text-xs text-white">{formatDate(img.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片预览 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="预览"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
