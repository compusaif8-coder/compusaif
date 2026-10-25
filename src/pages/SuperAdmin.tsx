import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasPermission } from "@/lib/dashboardAuth";
import { BulkPriceUpdateTool } from "@/components/BulkPriceUpdateTool";
import { SlugMigrationTool } from "@/components/SlugMigrationTool";
import { ExportProductsTool } from "@/components/ExportProductsTool";
import { ImportProductsTool } from "@/components/ImportProductsTool";
import { DashboardUsersManager } from "@/components/DashboardUsersManager";
import AdminLogin from "@/components/AdminLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { salesService } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ShieldCheck, Lock, AlertTriangle, Zap, Settings, Database,
  Activity, RotateCcw, KeyRound, Eye, EyeOff, Users,
  Globe, RefreshCw, CheckCircle2, Link, Clock,
} from "lucide-react";

// ── Layer 1: Needs Admin Auth first ──────────────────────────────────────────
function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, login } = useAdminAuth();

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  const hasDashboardAccess = hasPermission('superadmin');

  const handleLogin = async (password: string) => {
    return await login(password);
  };

  if (!isAuthenticated && !hasDashboardAccess) {
    return (
      <>
        <Helmet>
          <title>تسجيل دخول المسؤول</title>
          <meta
            name="description"
            content="صفحة تسجيل دخول المسؤول لنظام إدارة المتجر"
          />
        </Helmet>
        <AdminLogin onLogin={handleLogin} loading={loading} />
      </>
    );
  }

  return <>{children}</>;
}

// ── Section divider helper ────────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs shrink-0">
        {icon} {label}
      </div>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Deploy Hook Section ───────────────────────────────────────────────────────
function DeploySection() {
  const [hookUrl, setHookUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [lastDeploy, setLastDeploy] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [editingHook, setEditingHook] = useState(false);
  const [savingHook, setSavingHook] = useState(false);

  // Load hook URL and last deploy time from Firebase
  useEffect(() => {
    getDoc(doc(db, 'admin_config', 'deploy')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.hookUrl) setHookUrl(data.hookUrl);
        if (data?.lastDeploy) setLastDeploy(data.lastDeploy);
      }
    }).catch(() => {});
  }, []);

  const handleSaveHook = useCallback(async () => {
    const url = inputUrl.trim();
    if (!url.startsWith('https://api.vercel.com/v1/integrations/deploy/')) {
      toast.error('رابط الـ Deploy Hook غير صحيح. يجب أن يبدأ بـ https://api.vercel.com/v1/integrations/deploy/');
      return;
    }
    setSavingHook(true);
    try {
      await setDoc(doc(db, 'admin_config', 'deploy'), { hookUrl: url }, { merge: true });
      setHookUrl(url);
      setInputUrl('');
      setEditingHook(false);
      toast.success('تم حفظ رابط الـ Deploy Hook بنجاح');
    } catch {
      toast.error('فشل حفظ الرابط');
    } finally {
      setSavingHook(false);
    }
  }, [inputUrl]);

  const handleDeploy = useCallback(async () => {
    if (!hookUrl) {
      toast.error('لم يتم إعداد رابط الـ Deploy Hook بعد');
      return;
    }
    const confirmed = window.confirm(
      'سيتم إطلاق عملية تحديث الموقع على Vercel الآن.\nسيستغرق ذلك من 2 إلى 3 دقائق.\nهل تريد المتابعة؟'
    );
    if (!confirmed) return;

    setIsDeploying(true);
    setDeployStatus('idle');
    toast.loading('جاري إطلاق عملية التحديث...', { id: 'deploy' });
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (res.ok) {
        const now = new Date().toLocaleString('ar-EG', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        await setDoc(doc(db, 'admin_config', 'deploy'), { lastDeploy: now }, { merge: true });
        setLastDeploy(now);
        setDeployStatus('success');
        toast.success('✅ تم إطلاق التحديث بنجاح! سيكتمل خلال 2-3 دقائق.', { id: 'deploy', duration: 6000 });
      } else {
        setDeployStatus('error');
        toast.error('❌ فشل الاتصال بـ Vercel. تحقق من رابط الـ Hook.', { id: 'deploy' });
      }
    } catch {
      setDeployStatus('error');
      toast.error('❌ حدث خطأ. تحقق من الاتصال بالإنترنت.', { id: 'deploy' });
    } finally {
      setIsDeploying(false);
    }
  }, [hookUrl]);

  return (
    <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-4">
      {/* Main deploy button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-l from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="space-y-1">
          <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            تحديث فهرسة جوجل والـ SEO
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            بعد إضافة أجهزة جديدة أو تعديل الأسعار، اضغط هذا الزر لتحديث صفحات الـ HTML وخريطة الموقع تلقائياً.
          </p>
          {lastDeploy && (
            <p className="text-xs text-indigo-500 flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3" />
              آخر تحديث: {lastDeploy}
            </p>
          )}
        </div>
        <Button
          id="deploy-seo-btn"
          onClick={handleDeploy}
          disabled={isDeploying || !hookUrl}
          className={`gap-2 shrink-0 min-w-[160px] font-bold shadow-md transition-all ${
            deployStatus === 'success'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : deployStatus === 'error'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
          }`}
        >
          {isDeploying ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> جاري التحديث...</>
          ) : deployStatus === 'success' ? (
            <><CheckCircle2 className="w-4 h-4" /> تم بنجاح!</>
          ) : (
            <><Globe className="w-4 h-4" /> تحديث جوجل والـ SEO</>
          )}
        </Button>
      </div>

      {/* Steps explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { num: '١', text: 'يجلب جميع المنتجات من قاعدة البيانات' },
          { num: '٢', text: 'يولد صفحة HTML لكل جهاز بمواصفاته وسعره' },
          { num: '٣', text: 'يحدث خريطة الموقع ويرسلها لجوجل' },
        ].map(step => (
          <div key={step.num} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{step.num}</span>
            <p className="text-xs text-gray-600 leading-relaxed">{step.text}</p>
          </div>
        ))}
      </div>

      {/* Hook URL config */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Link className="w-3 h-3" />
            رابط Vercel Deploy Hook
          </p>
          <button
            onClick={() => { setEditingHook(v => !v); setInputUrl(hookUrl); }}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {editingHook ? 'إلغاء' : hookUrl ? 'تعديل الرابط' : 'إعداد الرابط'}
          </button>
        </div>

        {!editingHook && hookUrl && (
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 truncate" dir="ltr">
            {hookUrl.slice(0, 60)}...
          </p>
        )}

        {editingHook && (
          <div className="space-y-2">
            <Input
              id="deploy-hook-url-input"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://api.vercel.com/v1/integrations/deploy/..."
              dir="ltr"
              className="text-xs font-mono"
            />
            <p className="text-[11px] text-gray-400">
              احصل على الرابط من: Vercel Dashboard → المشروع → Settings → Git → Deploy Hooks
            </p>
            <Button
              id="save-deploy-hook-btn"
              onClick={handleSaveHook}
              disabled={savingHook || !inputUrl.trim()}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {savingHook ? 'جاري الحفظ...' : 'حفظ الرابط'}
            </Button>
          </div>
        )}

        {!hookUrl && !editingHook && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              لم يتم إعداد رابط الـ Deploy Hook بعد. اضغط "إعداد الرابط" أعلاه لإضافته.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Super Admin Dashboard ─────────────────────────────────────────────────────
function SuperAdminDashboard() {
  // System management state
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'admin_config', 'settings')).then(snap => {
      if (snap.exists() && typeof snap.data()?.trackingEnabled === 'boolean') {
        setTrackingEnabled(snap.data().trackingEnabled);
      }
    }).catch(() => { });
  }, []);

  const toggleTracking = useCallback(async () => {
    const next = !trackingEnabled;
    try {
      toast.loading('جاري تحديث الحالة...', { id: 'tracking' });
      await setDoc(doc(db, 'admin_config', 'settings'), { trackingEnabled: next }, { merge: true });
      setTrackingEnabled(next);
      if (typeof window !== 'undefined')
        sessionStorage.setItem('global_tracking_disabled', next ? 'false' : 'true');
      toast.success(next ? 'تم تفعيل الإحصائيات' : 'تم إيقاف الإحصائيات مؤقتاً', { id: 'tracking' });
    } catch { toast.error('حدث خطأ', { id: 'tracking' }); }
  }, [trackingEnabled]);

  const handleResetData = useCallback(async () => {
    const ok = window.confirm(
      '⚠️ تحذير: إعادة تعيين البيانات\n\nسيتم حذف:\n• جميع عمليات البيع في الكاشير\n• بيانات إحصائيات الزوار\n• بيانات تحليل الأرباح\n• بيانات إدارة الطلبات\n\n⚠️ لا يمكن التراجع عن هذا الإجراء!'
    );
    if (!ok) return;
    try {
      toast.loading('جاري إعادة تعيين البيانات...', { id: 'reset' });
      await salesService.clearAllSales();
      ['cashier-sales', 'returning_visitor', 'analytics-data', 'profit-analysis-data', 'orders-data']
        .forEach(k => localStorage.removeItem(k));
      toast.success('تم إعادة تعيين جميع البيانات بنجاح', { id: 'reset' });
      setTimeout(() => window.location.reload(), 1500);
    } catch { toast.error('حدث خطأ أثناء إعادة التعيين', { id: 'reset' }); }
  }, []);

  const handleSavePassword = useCallback(async () => {
    const pw = newPassword.trim();
    if (pw.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setSavingPassword(true);
    try {
      toast.loading('جاري حفظ كلمة المرور...', { id: 'pw' });
      await setDoc(doc(db, 'admin_config', 'auth'), { password: pw }, { merge: true });
      toast.success('تم تحديث كلمة المرور بنجاح', { id: 'pw' });
      setNewPassword('');
    } catch { toast.error('فشل حفظ كلمة المرور', { id: 'pw' }); }
    finally { setSavingPassword(false); }
  }, [newPassword]);

  const { logout } = useAdminAuth();

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-gray-900 font-bold text-sm">Super Admin</span>
              <span className="text-indigo-500 text-[10px] font-mono tracking-widest">LEVEL 2</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="gap-2 text-gray-600 hover:text-gray-900"
            >
              <Lock className="w-4 h-4" />
              تسجيل الخروج
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              مفعّل
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">لوحة التحكم المتقدمة</h1>
          <p className="text-gray-500 text-sm">أدوات حساسة للتحكم في المنتجات والبيانات والنظام</p>
        </div>

        {/* ── Section: Deploy / SEO Update ── */}
        <SectionLabel icon={<Globe className="w-3.5 h-3.5" />} label="تحديث الفهرسة والـ SEO (جوجل)" />
        <div className="mb-2"><DeploySection /></div>

        {/* ── Section: Bulk Price ── */}
        <SectionLabel icon={<Settings className="w-3.5 h-3.5" />} label="تحديث الأسعار المجمع" />
        <div className="mb-2"><BulkPriceUpdateTool /></div>

        {/* ── Section: Slug Migration ── */}
        <SectionLabel icon={<Zap className="w-3.5 h-3.5" />} label="أداة ترحيل Filter Slugs" />
        <div className="mb-2"><SlugMigrationTool /></div>

        {/* ── Section: Import/Export ── */}
        <SectionLabel icon={<Database className="w-3.5 h-3.5" />} label="استيراد وتصدير المنتجات" />
        <div className="flex flex-col gap-4 mb-2">
          <ExportProductsTool />
          <ImportProductsTool />
        </div>

        {/* ── Section: Analytics ── */}
        <SectionLabel icon={<Activity className="w-3.5 h-3.5" />} label="حالة الإحصائيات" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-2 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
            <div className="space-y-1">
              <p className="font-semibold text-gray-800 text-sm">
                {trackingEnabled ? 'الإحصائيات مفعّلة' : 'الإحصائيات موقوفة مؤقتاً'}
              </p>
              <p className="text-xs text-gray-500">
                {trackingEnabled
                  ? 'يتم الآن تسجيل بيانات الزوار والمبيعات في Firebase'
                  : 'تم إيقاف التسجيل — يفيد لتقليل استهلاك قاعدة البيانات'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${trackingEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <Switch checked={trackingEnabled} onCheckedChange={toggleTracking} />
            </div>
          </div>
          <Button
            onClick={toggleTracking}
            variant={trackingEnabled ? 'outline' : 'default'}
            size="sm"
            className={`gap-2 ${trackingEnabled ? 'border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-600 hover:bg-green-700 text-white'}`}
          >
            <Activity className="h-4 w-4" />
            {trackingEnabled ? 'إيقاف الإحصائيات مؤقتاً' : 'تفعيل الإحصائيات'}
          </Button>
        </div>

        {/* ── Section: Reset Data ── */}
        <SectionLabel icon={<RotateCcw className="w-3.5 h-3.5" />} label="إعادة تعيين البيانات" />
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5 mb-2 space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 space-y-1">
                <p className="font-semibold">سيتم حذف:</p>
                <ul className="list-disc mr-4 space-y-0.5">
                  <li>جميع عمليات البيع في الكاشير</li>
                  <li>بيانات إحصائيات الزوار</li>
                  <li>بيانات تحليل الأرباح</li>
                  <li>بيانات إدارة الطلبات</li>
                </ul>
              </div>
            </div>
          </div>
          <Button onClick={handleResetData} variant="destructive" className="gap-2 w-full">
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين جميع البيانات
          </Button>
        </div>

        {/* ── Section: Password ── */}
        <SectionLabel icon={<KeyRound className="w-3.5 h-3.5" />} label="كلمة مرور لوحة الإدارة" />
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 mb-2 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">كلمة المرور الجديدة</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                className="pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">6 أحرف على الأقل. تُطبَّق فوراً عند تسجيل الدخول.</p>
          </div>
          <Button
            onClick={handleSavePassword}
            disabled={savingPassword || newPassword.trim().length < 6}
            className="gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            <KeyRound className="h-4 w-4" />
            {savingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
          </Button>
        </div>

        {/* ── Section: Dashboard Users ── */}
        <SectionLabel icon={<Users className="w-3.5 h-3.5" />} label="إدارة مستخدمي لوحة التحكم" />
        <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-5 mb-2">
          <DashboardUsersManager />
        </div>

        {/* Footer warning */}
        <div className="mt-8 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700 text-xs leading-relaxed">
            جميع العمليات في هذه الصفحة تؤثر مباشرةً على قاعدة البيانات الرئيسية.
            تأكد من صحة البيانات قبل التنفيذ. العمليات لا يمكن التراجع عنها.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function SuperAdmin() {
  return (
    <>
      <Helmet>
        <title>لوحة التحكم المتقدمة</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="description" content="لوحة التحكم المتقدمة" />
      </Helmet>

      <AdminAuthGate>
        <SuperAdminDashboard />
      </AdminAuthGate>
    </>
  );
}
