'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Edit, Trash2, Users, Phone, Eye } from 'lucide-react';
import { CustomerDetailDialog } from '@/components/customer/customer-detail-dialog';

interface Customer {
  id: number;
  customer_name: string;
  phone: string | null;
  wechat_id: string | null;
  remark: string | null;
  created_at: string;
}

export default function EmployeeCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
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
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/employee/customers');
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

  const handleAdd = async () => {
    if (!formData.customer_name.trim()) {
      setMessage('客户姓名不能为空');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/employee/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddDialog(false);
        setFormData({ customer_name: '', phone: '', wechat_id: '', remark: '' });
        fetchCustomers();
        setMessage('客户添加成功');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '添加失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSubmitting(false);
    }
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
      const res = await fetch(`/api/employee/customers/${selectedCustomer.id}`, {
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
      const res = await fetch(`/api/employee/customers/${selectedCustomer.id}`, {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">我的客户</h1>
          <p className="text-muted-foreground mt-1">管理您添加的客户信息</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          新增客户
        </Button>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-primary/10 text-primary text-sm">
          {message}
        </div>
      )}

      {customers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">暂无客户</p>
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加第一个客户
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>客户姓名</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>微信号</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell>
                    {customer.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{customer.wechat_id || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {customer.remark || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(customer.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowDetailDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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

      {/* 新增客户对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增客户</DialogTitle>
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
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? '提交中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* 客户详情对话框（含微信截图） */}
      <CustomerDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        customer={selectedCustomer}
      />
    </div>
  );
}
