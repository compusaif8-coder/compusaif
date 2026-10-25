import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import {
  getAllDashboardUsers,
  createDashboardUser,
  updateDashboardUser,
  deleteDashboardUser,
  DashboardUser,
  DashboardPermission,
  PERMISSION_LABELS,
} from '@/lib/dashboardAuth';

const ALL_PERMISSIONS: DashboardPermission[] = [
  'analytics',
  'profit-analysis',
  'orders',
  'admin',
  'works',
  'cashier',
  'attendance',
  'visitor-logs',
  'superadmin',
  'site-customizer',
];

const EMPTY_FORM = {
  username: '',
  password: '',
  displayName: '',
  permissions: [] as DashboardPermission[],
  isActive: true,
};

export function DashboardUsersManager() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [showNewPass, setShowNewPass] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllDashboardUsers();
      setUsers(data);
    } catch {
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const togglePermission = (perm: DashboardPermission) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.password.trim() || !form.displayName.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (form.permissions.length === 0) {
      toast.error('يرجى منح صلاحية واحدة على الأقل');
      return;
    }

    try {
      if (editingId) {
        const result = await updateDashboardUser(editingId, {
          username: form.username.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
          permissions: form.permissions,
          isActive: form.isActive,
        });
        if (!result.success) { toast.error(result.error); return; }
        toast.success('تم تحديث المستخدم بنجاح');
      } else {
        const result = await createDashboardUser({
          username: form.username.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
          permissions: form.permissions,
          isActive: form.isActive,
        });
        if (!result.success) { toast.error(result.error); return; }
        toast.success('تم إنشاء المستخدم بنجاح');
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingId(null);
      loadUsers();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleEdit = (user: DashboardUser) => {
    setForm({
      username: user.username,
      password: user.password,
      displayName: user.displayName,
      permissions: user.permissions,
      isActive: user.isActive !== false,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (user: DashboardUser) => {
    if (!confirm(`هل تريد حذف المستخدم "${user.displayName}"؟`)) return;
    const result = await deleteDashboardUser(user.id);
    if (result.success) { toast.success('تم الحذف'); loadUsers(); }
    else toast.error(result.error);
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-5 w-5 text-primary" />
          إدارة مستخدمي لوحة التحكم
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => { cancelForm(); setShowForm(true); }} className="gap-2">
            <UserPlus className="h-4 w-4" />
            مستخدم جديد
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Create / Edit Form ── */}
        {showForm && (
          <div className="border rounded-xl p-5 bg-muted/30 space-y-4">
            <h3 className="font-bold text-base">
              {editingId ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">الاسم المعروض *</label>
                <Input
                  placeholder="مثال: محمد المسوّق"
                  value={form.displayName}
                  onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">اسم المستخدم *</label>
                <Input
                  placeholder="مثال: marketing1"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">كلمة المرور *</label>
                <div className="relative">
                  <Input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    dir="ltr"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(v => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                الصلاحيات (اختر الصفحات المسموح بها)
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISSIONS.map(perm => {
                  const selected = form.permissions.includes(perm);
                  return (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => togglePermission(perm)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {selected && '✓ '}
                      {PERMISSION_LABELS[perm]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="user-active"
                checked={form.isActive}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="user-active" className="text-sm font-medium">الحساب مفعّل</label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                {editingId ? 'حفظ التعديلات' : 'إنشاء الحساب'}
              </Button>
              <Button variant="outline" onClick={cancelForm} className="gap-2">
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* ── Users List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            جاري التحميل...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>لا يوجد مستخدمون بعد. أنشئ أول مستخدم.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl bg-card hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    user.isActive !== false ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {user.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{user.displayName}</span>
                      <span className="text-xs text-muted-foreground font-mono">@{user.username}</span>
                      {user.isActive === false && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">موقوف</span>
                      )}
                    </div>

                    {/* Password display */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-muted-foreground">كلمة المرور:</span>
                      <span className="text-xs font-mono text-gray-700" dir="ltr">
                        {showPasswords[user.id] ? user.password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, [user.id]: !p[user.id] }))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords[user.id]
                          ? <EyeOff className="h-3 w-3" />
                          : <Eye className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Permissions */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {user.permissions.map(perm => (
                        <span
                          key={perm}
                          className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
                        >
                          {PERMISSION_LABELS[perm]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(user)} className="gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(user)} className="gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
