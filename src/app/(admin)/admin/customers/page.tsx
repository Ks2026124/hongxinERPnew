'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Search, X, Users, Image as ImageIcon } from 'lucide-react';
import { AdminImageGallery } from '@/components/customer/admin-image-gallery';

interface Team {
  id: number;
  team_name: string;
  team_code: string;
}

interface Employee {
  id: number;
  name: string;
  username: string;
}

interface Customer {
  id: number;
  customer_name: string;
  phone: string | null;
  wechat_id: string | null;
  remark: string | null;
  employee_id: number;
  team_id: number;
  created_at: string;
  employee: Employee | null;
  team: Team | null;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    wechat_id: '',
    remark: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  // 筛选条件
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showImageGallery, setShowImageGallery] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchEmployees();
    fetchCustomers();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      const teamList = data.data || data;
      if (Array.isArray(teamList)) {
        setTeams(teamList);
      }
    } catch (err) {
      console.error('获取团队列表失败:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      const empList = data.data || data;
      if (Array.isArray(empList)) {
        setEmployees(empList);
      }
    } catch (err) {
      console.error('获取员工列表失败:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterTeamId) params.set('team_id', filterTeamId);
      if (filterEmployeeId) params.set('employee_id', filterEmployeeId);
      if (filterStartDate) params.set('start_date', filterStartDate);
      if (filterEndDate) params.set('end_date', filterEndDate);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('获取客户列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    fetchCustomers();
  };

  const handleResetFilter = () => {
    setFilterTeamId('');
    setFilterEmployeeId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setLoading(true);
    setTimeout(() => fetchCustomers(), 0);
  };

  const handleEdit = async () => {
    if (!selectedCustomer) return;
    if (!formData.customer_name.trim()) {
      setMessage('客户姓名不能为空');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditDialog(false);
        setSelectedCustomer(null);
        fetchCustomers();
        setMessage('客户信息已更新');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '修改失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setShowDeleteDialog(false);
        setSelectedCustomer(null);
        fetchCustomers();
        setMessage('客户已删除');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '删除失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      customer_name: customer.customer_name,
      phone: customer.phone || '',
      wechat_id: customer.wechat_id || '',
      remark: customer.remark || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">客户管理</h1>
          <p className="text-muted-foreground mt-1">查看和管理所有客户信息</p>
        </div>
        <Button variant="outline" onClick={() => setShowImageGallery(true)}>
          <ImageIcon className="w-4 h-4 mr-2" />
          微信截图
        </Button>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-primary/10 text-primary text-sm">
          {message}
        </div>
      )}

      {/* 筛选区域 */}
      <div className="p-4 border rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">筛选条件</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>团队</Label>
            <Select value={filterTeamId} onValueChange={setFilterTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="全部团队" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部团队</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>员工</Label>
            <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="全部员工" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部员工</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>开始日期</Label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>结束日期</Label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleFilter}>
            <Search className="w-4 h-4 mr-2" />
            查询
          </Button>
          <Button variant="outline" onClick={handleResetFilter}>
            <X className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>
      </div>

      {/* 客户列表 */}
      {customers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">暂无客户数据</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>客户姓名</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>微信号</TableHead>
                <TableHead>所属员工</TableHead>
                <TableHead>所属团队</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>{customer.wechat_id || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {customer.employee?.name || '未知'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.team?.team_name || '未知'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(customer.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(customer)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(customer)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 编辑客户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑客户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>客户姓名 *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="请输入客户姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
              />
            </div>
            <div className="space-y-2">
              <Label>微信号</Label>
              <Input
                value={formData.wechat_id}
                onChange={(e) => setFormData({ ...formData, wechat_id: e.target.value })}
                placeholder="请输入微信号"
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="请输入备注信息"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除客户「{selectedCustomer?.customer_name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {submitting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 微信截图画廊 */}
      <AdminImageGallery
        open={showImageGallery}
        onOpenChange={setShowImageGallery}
      />
    </div>
  );
}
