'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, X, Search } from 'lucide-react';

interface Team {
  id: number;
  team_name: string;
}

interface Employee {
  id: number;
  name: string;
}

interface AdminImage {
  id: number;
  customer_id: number;
  employee_id: number;
  team_id: number;
  image_url: string;
  created_at: string;
  customer: { id: number; customer_name: string } | null;
  employee: { id: number; name: string } | null;
  team: { id: number; team_name: string } | null;
}

interface AdminImageGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminImageGallery({ open, onOpenChange }: AdminImageGalleryProps) {
  const [images, setImages] = useState<AdminImage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchTeams();
      fetchEmployees();
      fetchImages();
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      if (data.success) setTeams(data.data);
    } catch (err) {
      console.error('获取团队失败:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (data.success) setEmployees(data.data);
    } catch (err) {
      console.error('获取员工失败:', err);
    }
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTeamId) params.set('team_id', filterTeamId);
      if (filterEmployeeId) params.set('employee_id', filterEmployeeId);

      const res = await fetch(`/api/admin/images?${params.toString()}`);
      const data = await res.json();
      if (data.success) setImages(data.data);
    } catch (err) {
      console.error('获取图片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchImages();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-background border-l shadow-lg overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              全部微信截图
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 筛选 */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">团队</Label>
              <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.team_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">员工</Label>
              <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFilter} size="sm">
              <Search className="w-4 h-4 mr-1" />
              查询
            </Button>
          </div>

          {/* 图片列表 */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">暂无图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img) => (
                <div key={img.id} className="group relative">
                  <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={img.image_url}
                      alt="微信截图"
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImage(img.image_url)}
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium truncate">
                      {img.customer?.customer_name || '未知客户'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {img.employee?.name || '未知'} / {img.team?.team_name || '未知'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(img.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
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
