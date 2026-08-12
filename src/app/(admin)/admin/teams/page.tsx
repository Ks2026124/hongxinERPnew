'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Users,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Team {
  id: number;
  team_code: string;
  team_name: string;
  remark: string | null;
  employee_count: number;
  created_at: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 创建团队对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    team_code: '',
    team_name: '',
    remark: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      if (res.ok) {
        setTeams(data.data);
      } else {
        setError(data.error || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // 清除消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleCreateTeam = async () => {
    setCreateLoading(true);
    setCreateError('');

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || '创建失败');
        return;
      }

      setSuccess('团队创建成功');
      setCreateDialogOpen(false);
      setNewTeam({ team_code: '', team_name: '', remark: '' });
      fetchTeams();
    } catch {
      setCreateError('网络错误');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/admin/teams/${teamToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || '删除失败');
        return;
      }

      setSuccess('团队删除成功');
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
      fetchTeams();
    } catch {
      setDeleteError('网络错误');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">团队管理</h1>
          <p className="text-sm text-muted-foreground">
            管理团队信息、成员分配
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建团队
        </Button>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm">
          {success}
        </div>
      )}

      {/* 团队列表 */}
      <Card>
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>暂无团队</p>
              <p className="text-sm">点击"创建团队"添加第一个团队</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>团队名称</TableHead>
                  <TableHead>团队编号</TableHead>
                  <TableHead className="text-center">员工人数</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">
                      {team.team_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{team.team_code}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {team.employee_count} 人
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.remark || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(team.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(team)}
                        disabled={team.employee_count > 0}
                        title={
                          team.employee_count > 0
                            ? '该团队还有员工，无法删除'
                            : '删除团队'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建团队对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建团队</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {createError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="team_code">
                团队编号 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="team_code"
                placeholder="例如: T001"
                value={newTeam.team_code}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, team_code: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_name">
                团队名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="team_name"
                placeholder="例如: 销售一部"
                value={newTeam.team_name}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, team_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Input
                id="remark"
                placeholder="可选"
                value={newTeam.remark}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, remark: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createLoading}
            >
              取消
            </Button>
            <Button onClick={handleCreateTeam} disabled={createLoading}>
              {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {deleteError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
                <AlertCircle className="h-4 w-4" />
                {deleteError}
              </div>
            )}
            <p className="text-muted-foreground">
              确定要删除团队「{teamToDelete?.team_name}」吗？
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
