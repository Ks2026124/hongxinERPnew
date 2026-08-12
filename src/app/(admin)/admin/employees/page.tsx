'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Ban,
  Unlock,
  Loader2,
  AlertCircle,
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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
        );
      case 'disabled':
        return (
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
    </div>
  );
}
