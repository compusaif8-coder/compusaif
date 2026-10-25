import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  BarChart3,
  TrendingUp,
  Package,
  LayoutDashboard,
  Lock,
  User,
  LogOut,
  Eye,
  EyeOff,
  ShieldCheck,
  Calculator,
  Clock,
  ClipboardList,
  Paintbrush,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  loginDashboardUser,
  getDashboardSession,
  clearDashboardSession,
  refreshSessionPermissions,
  DashboardSession,
  DashboardPermission,
} from '@/lib/dashboardAuth';

interface DashboardTool {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  permission: DashboardPermission;
}

const ALL_TOOLS: DashboardTool[] = [
  {
    title: 'إحصائيات الزوار',
    description: 'تحليل مفصل لحركة الزوار وسلوكهم في الموقع',
    icon: BarChart3,
    href: '/analytics',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    permission: 'analytics',
  },
  {
    title: 'تحليل الأرباح',
    description: 'تحليل الإيرادات والأرباح من المبيعات والطلبات',
    icon: TrendingUp,
    href: '/profit-analysis',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    permission: 'profit-analysis',
  },
  {
    title: 'إدارة الطلبات',
    description: 'متابعة وإدارة طلبات العملاء وحالات التوصيل',
    icon: ShoppingCart,
    href: '/orders',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    permission: 'orders',
  },
  {
    title: 'إدارة المنتجات',
    description: 'إدارة المنتجات والمخزون (لوحة التحكم الرئيسية)',
    icon: Package,
    href: '/admin',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    permission: 'admin',
  },
  {
    title: 'عرض المواصفات',
    description: 'نسخ مواصفات الأجهزة (للبائعين)',
    icon: ShoppingCart,
    href: '/works',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    permission: 'works',
  },
  {
    title: 'الكاشير',
    description: 'نظام الكاشير وإدارة المبيعات ونقاط البيع',
    icon: Calculator,
    href: '/cashier',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    permission: 'cashier',
  },
  {
    title: 'الحضور والغياب',
    description: 'إدارة وتسجيل حضور وغياب الموظفين',
    icon: Clock,
    href: '/attendance',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    permission: 'attendance',
  },
  {
    title: 'سجل الزوار المفصل',
    description: 'عرض وتتبع تفاصيل وحركة الزيارات',
    icon: ClipboardList,
    href: '/visitor-logs',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    permission: 'visitor-logs',
  },
  {
    title: 'CP Superadmin Level 2',
    description: 'إدارة متقدمة للنظام وصلاحيات المدير',
    icon: ShieldCheck,
    href: '/cp',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    permission: 'superadmin',
  },
  {
    title: 'تخصيص الموقع',
    description: 'تغيير الألوان والصور والنصوص والثيم (مثل WordPress)',
    icon: Paintbrush,
    href: '/site-customizer',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    permission: 'site-customizer',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing session on mount and refresh permissions from Firestore
  useEffect(() => {
    const existing = getDashboardSession();
    if (existing) {
      setSession(existing);
      // Refresh permissions from Firestore silently
      refreshSessionPermissions(existing).then(refreshed => {
        if (refreshed) setSession(refreshed);
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setIsLoading(true);
    try {
      const result = await loginDashboardUser(username.trim(), password);
      if (result.success && result.session) {
        setSession(result.session);
        toast.success(`مرحباً ${result.session.displayName} 👋`);
      } else {
        toast.error(result.error || 'فشل تسجيل الدخول');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearDashboardSession();
    setSession(null);
    setUsername('');
    setPassword('');
    toast.info('تم تسجيل الخروج');
  };

  // ── Login Screen ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
        <Helmet>
          <title>تسجيل الدخول - لوحة التحكم المركزية</title>
        </Helmet>

        <div className="w-full max-w-md">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 backdrop-blur">
              <LayoutDashboard className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">لوحة التحكم</h1>
            <p className="text-blue-300 mt-1">سجّل دخولك للمتابعة</p>
          </div>

          {/* Card */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <CardContent className="pt-8 pb-8 px-8 space-y-5">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-200 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    اسم المستخدم
                  </label>
                  <Input
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 h-11 text-center"
                    autoFocus
                    autoComplete="username"
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-200 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 h-11 text-center pr-10"
                      autoComplete="current-password"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-xl mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      جاري التحقق...
                    </div>
                  ) : (
                    'دخول'
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-white/30 pt-2">
                يتم إنشاء الحسابات من قِبَل المسؤول فقط
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Dashboard Screen ──────────────────────────────────────────────────────────
  const allowedTools = ALL_TOOLS.filter(t => session.permissions.includes(t.permission));

  return (
    <>
      <Helmet>
        <title>لوحة التحكم - {session.displayName}</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                لوحة التحكم المركزية
              </h1>
              <p className="text-muted-foreground">
                مرحباً،{' '}
                <span className="font-semibold text-gray-700">{session.displayName}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Permissions badge */}
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full text-sm font-medium">
                <ShieldCheck className="h-4 w-4" />
                {session.permissions.length} صلاحية
              </div>

              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>

          {/* Tools Grid */}
          {allowedTools.length === 0 ? (
            <div className="text-center py-24 text-gray-400 space-y-3">
              <Lock className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-lg font-medium">لا توجد صلاحيات مُعيَّنة لحسابك</p>
              <p className="text-sm">تواصل مع المسؤول لمنحك الصلاحيات المطلوبة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allowedTools.map((tool) => (
                <Link key={tool.href} to={tool.href} className="group block h-full">
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-transparent hover:border-primary/20 overflow-hidden">
                    <CardContent className="p-6 flex flex-col items-start gap-4 h-full relative">
                      <div
                        className={`p-4 rounded-2xl ${tool.bgColor} ${tool.color} transition-all duration-300 group-hover:scale-110 mb-2`}
                      >
                        <tool.icon className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {tool.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {tool.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
