'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Plus, Edit, Trash2, Users, Phone, Eye, Upload, CheckCircle, XCircle, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { CustomerDetailDialog } from '@/components/customer/customer-detail-dialog';

interface Customer {
  id: number;
  customer_name: string;
  phone: string | null;
  wechat_id: string | null;
  remark: string | null;
  customer_level: 'A' | 'B' | 'C' | 'D' | null;
  created_at: string;
}

// 客户等级配置
const CUSTOMER_LEVEL_CONFIG = {
  A: { label: 'A类', desc: '新增客户', color: 'bg-blue-100 text-blue-700' },
  B: { label: 'B类', desc: '深聊客户', color: 'bg-green-100 text-green-700' },
  C: { label: 'C类', desc: '付费意向', color: 'bg-orange-100 text-orange-700' },
  D: { label: 'D类', desc: '成交客户', color: 'bg-red-100 text-red-700' },
};

// 验证步骤状态
type VerifyStep = 'upload' | 'verifying' | 'verified' | 'failed';

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

  // 客户查重状态
  const [duplicateCheck, setDuplicateCheck] = useState<{
    checking: boolean;
    isDuplicate: boolean;
    duplicateCustomer?: {
      customer_name: string;
      employee_name: string;
      team_name: string;
      customer_level: 'A' | 'B' | 'C' | 'D';
    };
  }>({ checking: false, isDuplicate: false });

  // 微信截图验证状态
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('upload');
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [verifyMessage, setVerifyMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 客户查重（基于微信号/手机号）
  const checkDuplicate = async (wechatId: string, phone: string) => {
    if (!wechatId && !phone) {
      setDuplicateCheck({ checking: false, isDuplicate: false });
      return;
    }
    setDuplicateCheck({ checking: true, isDuplicate: false });
    try {
      const res = await fetch('/api/employee/customers/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wechat_id: wechatId, phone: phone }),
      });
      const data = await res.json();
      if (data.success && data.data.is_duplicate) {
        setDuplicateCheck({
          checking: false,
          isDuplicate: true,
          duplicateCustomer: data.data.customer,
        });
      } else {
        setDuplicateCheck({ checking: false, isDuplicate: false });
      }
    } catch {
      setDuplicateCheck({ checking: false, isDuplicate: false });
    }
  };

  const handleAdd = async () => {
    // 如果检测到重复，阻止提交
    if (duplicateCheck.isDuplicate) {
      setMessage('该客户已存在，无法重复创建');
      return;
    }
    if (!formData.customer_name.trim()) {
      setMessage('客户姓名不能为空');
      return;
    }
    if (!verificationId) {
      setMessage('请先完成微信截图验证');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      // 先进行客户查重
      if (formData.wechat_id || formData.phone) {
        const checkRes = await fetch(`/api/employee/customers/check-duplicate?wechat_id=${encodeURIComponent(formData.wechat_id)}&phone=${encodeURIComponent(formData.phone)}`);
        const checkData = await checkRes.json();
        if (checkData.exists) {
          alert(`该客户已存在！\n\n客户姓名：${checkData.customer?.name}\n所属员工：${checkData.customer?.employee_name || '未知'}\n所属团队：${checkData.customer?.team_name || '未知'}\n当前等级：${checkData.customer?.customer_level || 'A'}类\n\n禁止重复创建。`);
          setSubmitting(false);
          return;
        }
      }
      
      const res = await fetch('/api/employee/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, verification_id: verificationId }),
      });
      const data = await res.json();
      console.log('[CREATE_CUSTOMER_FE] response:', { status: res.status, ok: res.ok, data });
      if (data.success) {
        setShowAddDialog(false);
        setFormData({ customer_name: '', phone: '', wechat_id: '', remark: '' });
        resetVerification();
        fetchCustomers();
        setMessage('客户添加成功');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const detail = data.detail ? ` (${data.detail})` : '';
        const code = data.code ? ` [${data.code}]` : '';
        setMessage((data.error || '添加失败') + detail + code);
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // === 微信截图验证 ===
  const resetVerification = () => {
    setVerifyStep('upload');
    setVerifyFile(null);
    setVerifyPreview(null);
    setVerificationId(null);
    setVerifyMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setVerifyMessage('仅支持 JPG、PNG、WEBP 格式');
      return;
    }
    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setVerifyMessage('文件大小不能超过 10MB');
      return;
    }

    setVerifyFile(file);
    setVerifyMessage('');
    // 预览
    const reader = new FileReader();
    reader.onload = (ev) => setVerifyPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setVerifyStep('upload');
  };

  const handleVerify = async () => {
    if (!verifyFile) {
      setVerifyMessage('请先选择微信聊天截图');
      return;
    }
    setVerifyStep('verifying');
    setVerifyMessage('');

    const formDataUpload = new FormData();
    formDataUpload.append('file', verifyFile);

    try {
      const res = await fetch('/api/employee/verify-wechat', {
        method: 'POST',
        body: formDataUpload,
      });

      // 检查 HTTP 状态码
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await res.json();
          setVerifyStep('failed');
          setVerifyMessage(errData.error || `服务器错误 (${res.status})`);
        } else if (res.status === 413) {
          setVerifyStep('failed');
          setVerifyMessage('图片文件过大，请上传小于 10MB 的图片');
        } else {
          setVerifyStep('failed');
          setVerifyMessage(`服务器错误 (${res.status})，请稍后重试`);
        }
        return;
      }

      const data = await res.json();

      if (data.success) {
        setVerifyStep('verified');
        setVerificationId(data.data.verification_id);
        setVerifyMessage('微信截图验证通过，可以继续填写客户信息。');
      } else if (data.duplicate) {
        setVerifyStep('failed');
        const info = data.duplicateInfo || {};
        if (data.duplicate === 'exact') {
          setVerifyMessage(`该微信截图已存在（精确匹配），不能重复创建客户。上传者：${info.employee_name || '未知'}（${info.team_name || '未知'}）`);
        } else {
          setVerifyMessage(`该微信截图与已有图片高度相似，不能重复创建客户。上传者：${info.employee_name || '未知'}（${info.team_name || '未知'}）`);
        }
      } else {
        setVerifyStep('failed');
        setVerifyMessage(data.error || '验证失败');
      }
    } catch (err) {
      setVerifyStep('failed');
      // 区分网络错误和其他错误
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setVerifyMessage('网络连接异常，请检查网络后重试');
      } else if (err instanceof SyntaxError) {
        setVerifyMessage('服务器响应格式错误，请联系管理员');
      } else {
        setVerifyMessage('网络错误，请重试');
      }
    }
  };

  const handleRetry = () => {
    resetVerification();
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
                <TableHead>等级</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>微信号</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const level = customer.customer_level || 'A';
                const levelConfig = CUSTOMER_LEVEL_CONFIG[level];
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.customer_name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${levelConfig.color}`}>
                        {levelConfig.label}
                      </span>
                    </TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 新增客户对话框 - 两步流程 */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetVerification();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {verifyStep === 'verified' ? '第二步：填写客户信息' : '第一步：微信截图验证'}
            </DialogTitle>
          </DialogHeader>

          {verifyStep !== 'verified' ? (
            /* 步骤1：微信截图验证 */
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                新增客户前必须先上传并验证微信聊天截图，验证通过后才能填写客户信息。
              </div>

              {verifyStep === 'upload' && (
                <>
                  <div className="space-y-2">
                    <Label>上传微信聊天截图</Label>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {verifyPreview ? (
                        <div className="space-y-2">
                          <img src={verifyPreview} alt="预览" className="max-h-48 mx-auto rounded" />
                          <p className="text-sm text-muted-foreground">{verifyFile?.name}</p>
                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleRetry();
                          }}>
                            重新选择
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-10 h-10 mx-auto text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            点击上传微信聊天截图
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            支持 JPG、PNG、WEBP，最大 10MB
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>

                  {verifyMessage && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {verifyMessage}
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowAddDialog(false);
                      resetVerification();
                    }}>
                      取消
                    </Button>
                    <Button onClick={handleVerify} disabled={!verifyFile}>
                      开始验证
                    </Button>
                  </DialogFooter>
                </>
              )}

              {verifyStep === 'verifying' && (
                <div className="py-8 text-center space-y-4">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                  <div className="space-y-1">
                    <p className="font-medium">正在验证微信截图...</p>
                    <p className="text-sm text-muted-foreground">
                      正在进行图片格式检查、SHA-256 精确查重和 pHash 相似检测
                    </p>
                  </div>
                </div>
              )}

              {verifyStep === 'failed' && (
                <div className="py-4 space-y-4">
                  <div className="text-center space-y-2">
                    <XCircle className="w-12 h-12 mx-auto text-destructive" />
                    <p className="font-medium text-destructive">验证未通过</p>
                    <p className="text-sm text-muted-foreground">{verifyMessage}</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowAddDialog(false);
                      resetVerification();
                    }}>
                      取消
                    </Button>
                    <Button onClick={handleRetry}>
                      重新上传
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          ) : (
            /* 步骤2：填写客户信息 */
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-primary/10 text-primary text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                微信截图验证通过，可以填写客户信息。
              </div>

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
                  onBlur={(e) => checkDuplicate(e.target.value, formData.phone)}
                  placeholder="请输入手机号"
                />
              </div>
              <div className="space-y-2">
                <Label>微信号</Label>
                <Input
                  value={formData.wechat_id}
                  onChange={(e) => setFormData({ ...formData, wechat_id: e.target.value })}
                  onBlur={(e) => checkDuplicate(e.target.value, formData.phone)}
                  placeholder="请输入微信号"
                />
              </div>

              {/* 客户查重提示 */}
              {duplicateCheck.isDuplicate && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    该客户已存在
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>客户姓名：{duplicateCheck.duplicateCustomer?.customer_name}</p>
                    <p>所属员工：{duplicateCheck.duplicateCustomer?.employee_name}</p>
                    <p>所属团队：{duplicateCheck.duplicateCustomer?.team_name}</p>
                    <p>当前等级：{duplicateCheck.duplicateCustomer?.customer_level}类客户</p>
                  </div>
                </div>
              )}
              {duplicateCheck.checking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  正在检查客户是否已存在...
                </div>
              )}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="请输入备注信息"
                  rows={3}
                />
              </div>

              {message && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {message}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  resetVerification();
                  setVerifyStep('upload');
                }}>
                  返回上一步
                </Button>
                <Button onClick={handleAdd} disabled={submitting}>
                  {submitting ? '提交中...' : '确认添加'}
                </Button>
              </DialogFooter>
            </div>
          )}
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
