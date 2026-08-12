'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Ban,
  Unlock,
  Loader2,
  AlertCircle,
  Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Team {
  id: number;
  team_name: string;
}

interface Employee {
  id: number;
  username: string;
  name: string;
  phone: string | null;
  role: string;
  team_id: number;
  status: string;
  created_at: string;
  teams: { team_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待审核', variant: 'secondary' },
  active: { label: '已启用', variant: 'default' },
  rejected: { label: '已拒绝', variant: 'destructive' },
  disabled: { label: '已禁用', variant: 'outline' },
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 修改团队对话框
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [employeeToChangeTeam, setEmployeeToChangeTeam] = useState<Employee | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamChangeLoading, setTeamChangeLoading] = useState(false);
  const [teamChangeError, setTeamChangeError] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.data);
      } else {
        setError(data.error || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      if (res.ok) {
        setTeams(data.data.map((t: { id: number; team_name: string }) => ({ id: t.id, team_name: t.team_name })));
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchTeams();
  }, [fetchEmployees, fetchTeams]);

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

  const handleStatusChange = async (employeeId: number, newStatus: string) => {
    setActionLoading(employeeId);
    setError('');

    try {
      const res = await fetch(`/api/admin/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }

      setSuccess(`员工状态已更新为「${STATUS_CONFIG[newStatus]?.label || newStatus}」`);

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId ? { ...emp, status: newStatus } : emp
        )
      );
    } catch {
      setError('网络错误');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTeamChangeClick = (employee: Employee) => {
    setEmployeeToChangeTeam(employee);
    setSelectedTeamId(employee.team_id?.toString() || '');
    setTeamChangeError('');
    setTeamDialogOpen(true);
  };

  const handleTeamChangeConfirm = async () => {
    if (!employeeToChangeTeam || !selectedTeamId) {
      setTeamChangeError('请选择团队');
      return;
    }

    setTeamChangeLoading(true);
    setTeamChangeError('');

    try {
      const res = await fetch(
        `/api/admin/employees/${employeeToChangeTeam.id}/team`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_id: parseInt(selectedTeamId, 10) }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setTeamChangeError(data.error || '修改失败');
        return;
      }

      // 获取新团队名称
      const newTeam = teams.find((t) => t.id === parseInt(selectedTeamId, 10));

      setSuccess(`已将「${employeeToChangeTeam.name}」调至「${newTeam?.team_name || ''}」`);
      setTeamDialogOpen(false);
      setEmployeeToChangeTeam(null);

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeToChangeTeam.id
            ? {
                ...emp,
                team_id: parseInt(selectedTeamId, 10),
                teams: newTeam ? { team_name: newTeam.team_name } : null,
              }
            : emp
        )
      );
    } catch {
      setTeamChangeError('网络错误');
    } finally {
      setTeamChangeLoading(false);
    }
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

  const getActions = (employee: Employee) => {
    const isLoading = actionLoading === employee.id;

    switch (employee.status) {
      case 'pending':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleStatusChange(employee.id, 'active')}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              <span className="ml-1">通过</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(employee.id, 'rejected')}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              <span className="ml-1">拒绝</span>
            </Button>
          </div>
        );
      case 'active':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTeamChangeClick(employee)}
              className="h-7 text-xs"
            >
              <Users className="h-3 w-3" />
              <span className="ml-1">调组</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(employee.id, 'disabled')}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
              <span className="ml-1">禁用</span>
            </Button>
          </div>
        );
      case 'disabled':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTeamChangeClick(employee)}
              className="h-7 text-xs"
            >
              <Users className="h-3 w-3" />
              <span className="ml-1">调组</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(employee.id, 'active')}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
              <span className="ml-1">启用</span>
            </Button>
          </div>
        );
      default:
        return <span className="text-xs text-muted-foreground">--</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">员工管理</h1>
          <p className="text-sm text-muted-foreground">
            管理员工账号、审核注册申请
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
          {success}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无员工数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead className="hidden md:table-cell">所属团队</TableHead>
                    <TableHead className="hidden md:table-cell">注册时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const statusConfig = STATUS_CONFIG[employee.status] || {
                      label: employee.status,
                      variant: 'outline' as const,
                    };
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.name}
                        </TableCell>
                        <TableCell>{employee.username}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {employee.teams?.team_name || '--'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatDate(employee.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {getActions(employee)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 修改团队对话框 */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              修改团队 - {employeeToChangeTeam?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {teamChangeError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {teamChangeError}
              </div>
            )}
            <div className="space-y-2">
              <Label>所属团队</Label>
              <Select
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择团队" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTeamDialogOpen(false)}
              disabled={teamChangeLoading}
            >
              取消
            </Button>
            <Button onClick={handleTeamChangeConfirm} disabled={teamChangeLoading}>
              {teamChangeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
