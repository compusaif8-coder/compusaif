import { useState } from "react";
import { useProfitAnalysis } from "@/hooks/useProfitAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { clearAllProfitData } from "@/lib/firebase";
import {
  TrendingUp,
  Trash2,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft,
  RefreshCw,
  Download,
  Calendar,
  Target,
  MousePointer,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  Store,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Info,
  HelpCircle,
  Settings,
  FileText,
  Calculator,
  Percent,
  Minus,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  Square,
  Triangle,
  Star,
  Award,
  Trophy,
  Medal,
  Crown,
  Zap,
  Flame,
  Rocket,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  PackageIcon,
  UsersIcon,
  BarChart3Icon,
  PieChartIcon,
  ActivityIcon,
  CalendarIcon,
  TargetIcon,
  MousePointerIcon,
  ExternalLinkIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  StoreIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  SearchIcon,
  SortAscIcon,
  SortDescIcon,
  MoreHorizontalIcon,
  InfoIcon,
  HelpCircleIcon,
  SettingsIcon,
  FileTextIcon,
  CalculatorIcon,
  PercentIcon,
  MinusIcon,
  PlusIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  CircleIcon,
  SquareIcon,
  TriangleIcon,
  StarIcon,
  AwardIcon,
  TrophyIcon,
  MedalIcon,
  CrownIcon,
  ZapIcon,
  FlameIcon,
  RocketIcon,
} from "lucide-react";
import { formatPrice, formatNumber, formatCurrency, formatLargeNumber, formatPercentage } from "@/utils/format";

const ProfitAnalysis = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("30");
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<"profit" | "revenue" | "quantity">("profit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const { 
    profitAnalysis, 
    loading, 
    error, 
    refreshData 
  } = useProfitAnalysis(parseInt(timeRange));

  const handleDeleteProfitData = async () => {
    if (window.confirm("تحذير: هل أنت متأكد من حذف جميع بيانات الأرباح (الطلبات ومبيعات الكاشير) نهائياً؟\nسيؤدي ذلك إلى توفير مساحات القراءة والكتابة في صيانة النظام ولن يمكنك استرجاع هذه البيانات.")) {
      toast.loading("جاري حذف بيانات الأرباح...", { id: 'delete-profit' });
      try {
        await clearAllProfitData();
        localStorage.removeItem('cashier-sales');
        toast.success("تم حذف جميع البيانات بنجاح", { id: 'delete-profit' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error('Error clearing profit data:', error);
        toast.error("حدث خطأ أثناء عملية الحذف", { id: 'delete-profit' });
      }
    }
  };

  // Custom number formatting functions for better display
  const formatDisplayNumber = (num: number) => {
    // For very large numbers, use abbreviations
    if (num >= 1000000) {
      return formatLargeNumber(num);
    }
    // For regular numbers, use thousand separators
    return formatNumber(num);
  };

  const formatDisplayPrice = (num: number) => {
    // For very large amounts, show abbreviated version in tooltips/secondary text
    if (num >= 1000000) {
      return {
        full: formatCurrency(num),
        abbreviated: formatLargeNumber(num) + ' ج.م'
      };
    }
    return {
      full: formatCurrency(num),
      abbreviated: formatCurrency(num)
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'shipped': return 'text-blue-600 bg-blue-100';
      case 'confirmed': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircleIcon className="h-4 w-4" />;
      case 'shipped': return <TruckIcon className="h-4 w-4" />;
      case 'confirmed': return <ClockIcon className="h-4 w-4" />;
      case 'pending': return <AlertCircleIcon className="h-4 w-4" />;
      case 'cancelled': return <XCircleIcon className="h-4 w-4" />;
      default: return <CircleIcon className="h-4 w-4" />;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'delivered': return 'تم التوصيل';
      case 'shipped': return 'تم الشحن';
      case 'confirmed': return 'مؤكد';
      case 'pending': return 'في الانتظار';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const exportData = () => {
    if (!profitAnalysis) return;

    const exportData = {
      ...profitAnalysis,
      exportDate: new Date().toISOString(),
      timeRange: `${timeRange} days`,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('تم تصدير البيانات بنجاح');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">خطأ في تحميل البيانات</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <Button onClick={refreshData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>تحليل الأرباح والمكاسب - لوحة التحكم</title>
        <meta name="description" content="تحليل مفصل للأرباح والمكاسب من المبيعات والطلبات" />
      </Helmet>

      <div className="max-w-[95%] mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة للوحة التحكم
            </Button>
            <div>
              <h1 className="text-3xl font-bold">تحليل الأرباح والمكاسب</h1>
              <p className="text-muted-foreground">تحليل مفصل للأرباح والمكاسب من المبيعات والطلبات</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              className="gap-2"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </Button>
            <Button
              onClick={refreshData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              onClick={exportData}
              disabled={!profitAnalysis}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير البيانات
            </Button>
            <Button
              onClick={handleDeleteProfitData}
              variant="destructive"
              className="gap-2"
              title="حذف جميع بيانات الأرباح والطلبات"
            >
              <Trash2 className="h-4 w-4" />
              حذف الأرباح
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">إجمالي الإيرادات</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800" title={formatDisplayPrice(profitAnalysis.totalRevenue).full}>
                {formatDisplayPrice(profitAnalysis.totalRevenue).abbreviated}
              </div>
              <p className="text-xs text-green-600">
                من {formatDisplayNumber(profitAnalysis.totalSales)} عملية بيع
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">إجمالي الأرباح</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800" title={formatDisplayPrice(profitAnalysis.totalProfit).full}>
                {formatDisplayPrice(profitAnalysis.totalProfit).abbreviated}
              </div>
              <p className="text-xs text-blue-600">
                هامش ربح: {formatPercentage(profitAnalysis.profitMargin)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">إجمالي التكلفة</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800" title={formatDisplayPrice(profitAnalysis.totalCost).full}>
                {formatDisplayPrice(profitAnalysis.totalCost).abbreviated}
              </div>
              <p className="text-xs text-orange-600">
                تكلفة البضاعة المباعة
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">إجمالي المبيعات</CardTitle>
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">
                {formatDisplayNumber(profitAnalysis.totalSales)}
              </div>
              <p className="text-xs text-purple-600">
                {formatDisplayNumber(profitAnalysis.totalOrders)} طلب + {formatDisplayNumber(profitAnalysis.totalCashierSales)} كاشير
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Source */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                الإيرادات حسب المصدر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="font-medium">المبيعات عبر الإنترنت</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" title={formatDisplayPrice(profitAnalysis.revenueBySource.online).full}>
                      {formatDisplayPrice(profitAnalysis.revenueBySource.online).abbreviated}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profitAnalysis.totalRevenue > 0 ? 
                        formatPercentage((profitAnalysis.revenueBySource.online / profitAnalysis.totalRevenue) * 100) : 
                        '0%'
                      }
                    </p>
                  </div>
                </div>
                <Progress 
                  value={profitAnalysis.totalRevenue > 0 ? 
                    (profitAnalysis.revenueBySource.online / profitAnalysis.totalRevenue) * 100 : 0
                  } 
                  className="h-2" 
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium">مبيعات الكاشير</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" title={formatDisplayPrice(profitAnalysis.revenueBySource.cashier).full}>
                      {formatDisplayPrice(profitAnalysis.revenueBySource.cashier).abbreviated}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profitAnalysis.totalRevenue > 0 ? 
                        formatPercentage((profitAnalysis.revenueBySource.cashier / profitAnalysis.totalRevenue) * 100) : 
                        '0%'
                      }
                    </p>
                  </div>
                </div>
                <Progress 
                  value={profitAnalysis.totalRevenue > 0 ? 
                    (profitAnalysis.revenueBySource.cashier / profitAnalysis.totalRevenue) * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                الأرباح حسب المصدر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="font-medium">أرباح الإنترنت</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" title={formatDisplayPrice(profitAnalysis.profitBySource.online).full}>
                      {formatDisplayPrice(profitAnalysis.profitBySource.online).abbreviated}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profitAnalysis.revenueBySource.online > 0 ? 
                        formatPercentage((profitAnalysis.profitBySource.online / profitAnalysis.revenueBySource.online) * 100) : 
                        '0%'
                      } هامش ربح
                    </p>
                  </div>
                </div>
                <Progress 
                  value={profitAnalysis.revenueBySource.online > 0 ? 
                    (profitAnalysis.profitBySource.online / profitAnalysis.revenueBySource.online) * 100 : 0
                  } 
                  className="h-2" 
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium">أرباح الكاشير</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" title={formatDisplayPrice(profitAnalysis.profitBySource.cashier).full}>
                      {formatDisplayPrice(profitAnalysis.profitBySource.cashier).abbreviated}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profitAnalysis.revenueBySource.cashier > 0 ? 
                        formatPercentage((profitAnalysis.profitBySource.cashier / profitAnalysis.revenueBySource.cashier) * 100) : 
                        '0%'
                      } هامش ربح
                    </p>
                  </div>
                </div>
                <Progress 
                  value={profitAnalysis.revenueBySource.cashier > 0 ? 
                    (profitAnalysis.profitBySource.cashier / profitAnalysis.revenueBySource.cashier) * 100 : 0
                  } 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                أكثر المنتجات ربحية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profitAnalysis.topProfitableProducts.slice(0, 8).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDisplayNumber(product.totalSold)} قطعة
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600" title={formatDisplayPrice(product.totalProfit).full}>
                        {formatDisplayPrice(product.totalProfit).abbreviated}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPercentage(product.profitMargin)} ربح
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-600" />
                أكثر المنتجات مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profitAnalysis.topSellingProducts.slice(0, 8).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDisplayNumber(product.totalQuantity)} قطعة
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" title={formatDisplayPrice(product.totalRevenue).full}>
                        {formatDisplayPrice(product.totalRevenue).abbreviated}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDisplayNumber(product.totalQuantity)} مبيعات
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Status Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              تحليل الطلبات حسب الحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(profitAnalysis.analysisByStatus).map(([status, data]) => (
                <div key={status} className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {getStatusIcon(status)}
                    <span className="font-medium">{getStatusName(status)}</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatDisplayNumber(data.orders)}
                  </div>
                  <div className="text-sm text-muted-foreground" title={formatDisplayPrice(data.revenue).full}>
                    {formatDisplayPrice(data.revenue).abbreviated}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Analysis Chart */}
        {profitAnalysis.monthlyAnalysis.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                التحليل الشهري
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-2 h-32 items-end">
                {profitAnalysis.monthlyAnalysis.map((month) => {
                  const maxRevenue = Math.max(...profitAnalysis.monthlyAnalysis.map(m => m.revenue));
                  const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                  const monthName = new Date(month.month + '-01').toLocaleDateString('ar-EG', { 
                    month: 'short',
                    year: 'numeric'
                  });
                  
                  return (
                    <div key={month.month} className="flex flex-col items-center">
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${monthName}: ${formatDisplayPrice(month.revenue).full} ربح: ${formatDisplayPrice(month.profit).full}`}
                      />
                      <span className="text-xs text-muted-foreground mt-1 text-center">
                        {monthName}
                      </span>
                      <span className="text-xs font-medium" title={formatDisplayPrice(month.revenue).full}>
                        {formatDisplayPrice(month.revenue).abbreviated}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                الإيرادات الشهرية
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Analysis */}
        {showDetails && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  تحليل مفصل للأرباح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">تحليل التكلفة</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>إجمالي التكلفة:</span>
                        <span className="font-medium" title={formatDisplayPrice(profitAnalysis.totalCost).full}>
                          {formatDisplayPrice(profitAnalysis.totalCost).abbreviated}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>متوسط التكلفة لكل عملية:</span>
                        <span className="font-medium">
                          {profitAnalysis.totalSales > 0 ? 
                            formatDisplayPrice(profitAnalysis.totalCost / profitAnalysis.totalSales).abbreviated : 
                            '0 ج.م'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">تحليل الربح</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>إجمالي الربح:</span>
                        <span className="font-medium text-green-600" title={formatDisplayPrice(profitAnalysis.totalProfit).full}>
                          {formatDisplayPrice(profitAnalysis.totalProfit).abbreviated}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>متوسط الربح لكل عملية:</span>
                        <span className="font-medium text-green-600">
                          {profitAnalysis.totalSales > 0 ? 
                            formatDisplayPrice(profitAnalysis.totalProfit / profitAnalysis.totalSales).abbreviated : 
                            '0 ج.م'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">تحليل الكفاءة</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>هامش الربح الإجمالي:</span>
                        <span className="font-medium text-blue-600">
                          {formatPercentage(profitAnalysis.profitMargin)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>نسبة المبيعات المكتملة:</span>
                        <span className="font-medium text-blue-600">
                          {profitAnalysis.totalOrders > 0 ? 
                            formatPercentage((profitAnalysis.analysisByStatus.delivered.orders / profitAnalysis.totalOrders) * 100) : 
                            '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitAnalysis; 