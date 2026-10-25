import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditProductModal } from "@/components/EditProductModal";
import { ProductSearch } from "@/components/ProductSearch";
import { ProductTable } from "@/components/ProductTable";
import { ProductForm } from "@/components/ProductForm";
import { CouponsManager } from "@/components/CouponsManager";
import { AdminFilters } from "@/components/AdminFilters";
import { getDashboardSession } from "@/lib/dashboardAuth";
import { toast } from "sonner";
import {
  Package,
  Tag,
  Percent,
  Timer,
  Building2,
  Calendar as CalendarIcon,
  ChevronDown,
  Filter,
  ArrowLeft,
  ShoppingCart,
  ClipboardList,
  Clock,
  CheckCircle,
  Truck,
  CheckSquare,
  XCircle,
  LogOut,
  User,
  RotateCcw,
  UserCheck,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { exportProductsToExcel } from "@/utils/excelExport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { Card } from "@/components/ui/card";
import { useRevenue } from "@/hooks/useRevenue";
import { salesService } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { formatCurrency } from "@/utils/format";
import { initializeAdmin, cleanupLocalAdminConfig } from "@/lib/adminAuth";

interface Order {
  id: string;
  userId: string;
  items: any[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const Admin = () => {
  const navigate = useNavigate();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { totalRevenue, revenueByStatus, orderStatistics, loading: revenueLoading, error: revenueError } = useRevenue();
  const [filters, setFilters] = useState({
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    category: undefined as string | undefined,
    isArchived: false,
    archivedStatus: "active" as "all" | "archived" | "active",
    stockStatus: "all" as "all" | "out-of-stock" | "low-stock",
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const dashboardSession = getDashboardSession();
  const hasDashboardAdminPerm = dashboardSession?.permissions.includes('admin');
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(() => {
    // Read from sessionStorage cache to avoid an extra Firestore read on mount
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('global_tracking_enabled_cache');
      if (cached !== null) return cached === 'true';
    }
    return true;
  });

  // Fetch tracking status on mount — only if not cached
  useEffect(() => {
    const cached = typeof window !== 'undefined'
      ? sessionStorage.getItem('global_tracking_enabled_cache')
      : null;
    if (cached !== null) return; // Already have cached value, skip Firestore read

    const fetchTrackingStatus = async () => {
      try {
        const snap = await getDoc(doc(db, "admin_config", "settings"));
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.trackingEnabled === 'boolean') {
            setTrackingEnabled(data.trackingEnabled);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('global_tracking_enabled_cache', data.trackingEnabled ? 'true' : 'false');
            }
          }
        }
      } catch (err) {
        console.error("Error fetching tracking status:", err);
      }
    };
    fetchTrackingStatus();
  }, []);

  const toggleTrackingStatus = async () => {
    try {
      const newState = !trackingEnabled;
      toast.loading("جاري تحديث الحالة...", { id: "tracking-toggle" });
      await setDoc(doc(db, "admin_config", "settings"), { trackingEnabled: newState }, { merge: true });
      setTrackingEnabled(newState);
      toast.success(newState ? "تم تفعيل تسجيل الإحصائيات (الزوار والمبيعات)" : "تم إيقاف تسجيل الإحصائيات (للحفاظ على قراءات Firebase)", { id: "tracking-toggle" });

      // Update sessionStorage so it applies immediately to this session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('global_tracking_disabled', newState ? 'false' : 'true');
        sessionStorage.setItem('global_tracking_enabled_cache', newState ? 'true' : 'false');
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تعديل حالة التسجيل", { id: "tracking-toggle" });
    }
  };

  const { products, adminProducts, adminProductsLoading, addProduct, deleteProduct, updateProduct, loadProducts, loadProductsForAdmin, loading, error, updateProductQuantity } = useStore();

  // Removed authentication effect monitor

  // Load all products (including archived) for admin panel
  useEffect(() => {
    // Always load admin products fresh from Firebase
    // This ensures archived products are visible in the admin panel
    if (adminProducts.length === 0 && !adminProductsLoading) {
      loadProductsForAdmin();
    }
    // Also load public products if not yet loaded (for stats)
    if (products.length === 0 && !loading) loadProducts();
  }, [adminProducts.length, adminProductsLoading, loadProductsForAdmin, products.length, loading, loadProducts]);

  // Clean up any locally stored admin config on mount for security
  useEffect(() => {
    cleanupLocalAdminConfig();
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
    if (revenueError) {
      toast.error(`خطأ في تحميل البيانات المالية: ${revenueError}`);
    }
  }, [error, revenueError]);

  // Fetch orders
  // Remove old fetchOrders useEffect - now handled by useRevenue hook

  // Get unique suppliers from products
  const uniqueSuppliers = useMemo(() => {
    return [];
  }, []);

  // Memoize statistics calculations
  const statistics = useMemo(
    () => ({
      totalProducts: adminProducts?.filter(p => !p.isArchived).length || 0,
      totalCategories: new Set(adminProducts?.filter(p => !p.isArchived).map((p) => p.category)).size,
      totalBrands: new Set(adminProducts?.filter(p => !p.isArchived).map((p) => p.brand)).size,
      productsWithOffers: adminProducts?.filter((p) => p.specialOffer && !p.isArchived).length || 0,
      archivedProducts: adminProducts?.filter((p) => p.isArchived).length || 0,
      totalOrders: orderStatistics?.totalOrders || 0,
      pendingOrders: orderStatistics?.pendingOrders || 0,
      confirmedOrders: orderStatistics?.confirmedOrders || 0,
      shippedOrders: orderStatistics?.shippedOrders || 0,
      deliveredOrders: orderStatistics?.deliveredOrders || 0,
      cancelledOrders: orderStatistics?.cancelledOrders || 0,
      totalRevenue: totalRevenue,
    }),
    [adminProducts, uniqueSuppliers, orderStatistics, totalRevenue]
  );

  const filterProductsByDate = (products: Product[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate()
    );
    const yearAgo = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate()
    );

    return products.filter((product) => {
      const productDate = new Date(product.createdAt || new Date());
      let matchesDate = true;

      if (dateRange?.from && dateRange?.to) {
        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = productDate >= startDate && productDate <= endDate;
      } else {
        switch (dateFilter) {
          case "today":
            matchesDate = productDate >= today;
            break;
          case "week":
            matchesDate = productDate >= weekAgo;
            break;
          case "month":
            matchesDate = productDate >= monthAgo;
            break;
          case "year":
            matchesDate = productDate >= yearAgo;
            break;
          default:
            matchesDate = true;
        }
      }

      const matchesPrice =
        (!filters.minPrice || product.price >= filters.minPrice) &&
        (!filters.maxPrice || product.price <= filters.maxPrice);

      const matchesCategory =
        !filters.category || product.category === filters.category;

      const matchesArchiveStatus =
        filters.archivedStatus === "all" ||
        (filters.archivedStatus === "archived" && product.isArchived) ||
        (filters.archivedStatus === "active" && !product.isArchived);

      const quantity = product.wholesaleInfo?.quantity ?? 0;
      const matchesStockStatus =
        filters.stockStatus === "all" ||
        (filters.stockStatus === "out-of-stock" && quantity === 0) ||
        (filters.stockStatus === "low-stock" && quantity > 0 && quantity < 5);

      return (
        matchesDate &&
        matchesPrice &&
        matchesCategory &&
        matchesArchiveStatus &&
        matchesStockStatus
      );
    });
  };

  const filteredProducts = filterProductsByDate(adminProducts);

  // Sort products by displayPriority (lower number = higher priority)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Sort by displayPriority (lower number = higher priority)
    // Products without displayPriority or with 0 will be shown after products with priority
    const aPriority = (a.displayPriority && a.displayPriority > 0) ? a.displayPriority : Number.MAX_SAFE_INTEGER;
    const bPriority = (b.displayPriority && b.displayPriority > 0) ? b.displayPriority : Number.MAX_SAFE_INTEGER;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // If both have same priority (or both don't have priority), sort by creation date (newest first)
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  // Filtered products matching all active criteria (date, filters, search query)
  const currentFilteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return sortedProducts;
    const query = searchQuery.toLowerCase().trim();
    return sortedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query)
    );
  }, [sortedProducts, searchQuery]);

  const handleExportFilteredToExcel = useCallback(() => {
    if (currentFilteredProducts.length === 0) {
      toast.error("لا توجد منتجات مطابقة للتصفية الحالية لتصديرها");
      return;
    }

    let dateFilterLabel = "";
    if (dateRange?.from && dateRange?.to) {
      dateFilterLabel = `من_${format(dateRange.from, "yyyy-MM-dd")}_إلى_${format(dateRange.to, "yyyy-MM-dd")}`;
    } else if (dateFilter && dateFilter !== "all") {
      dateFilterLabel = dateFilter;
    }

    const result = exportProductsToExcel(currentFilteredProducts, {
      customFileName: dateFilterLabel
        ? `تقرير_المنتجات_المصفاة_${dateFilterLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
        : undefined,
    });

    if (result.success) {
      toast.success(`تم تصدير ${result.count} منتج بنجاح إلى ملف Excel منظم ومقروء`);
    } else {
      toast.error(result.error || "فشل في تصدير المنتجات");
    }
  }, [currentFilteredProducts, dateRange, dateFilter]);

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteProduct(id);
        toast.success("Product deleted successfully");
      } catch (error) {
        toast.error("Failed to delete product");
      }
    },
    [deleteProduct]
  );

  const handleUpdateQuantity = useCallback(
    async (productId: string, newQuantity: number) => {
      try {
        await updateProductQuantity(productId, newQuantity);
      } catch (error) {
        toast.error("فشل في تحديث الكمية");
      }
    },
    [updateProductQuantity]
  );

  const handleUpdatePriority = useCallback(
    async (productId: string, newPriority: number | null): Promise<boolean> => {
      try {
        // Check for duplicate priority
        if (newPriority !== null) {
          const existingProduct = adminProducts.find(
            (p) => p.displayPriority === newPriority && p.id !== productId
          );

          if (existingProduct) {
            toast.error(`رقم الأولوية ${newPriority} مستخدم بالفعل للمنتج: ${existingProduct.name}`);
            return false;
          }
        }

        const product = adminProducts.find(p => p.id === productId);
        if (product) {
          await updateProduct({ ...product, displayPriority: newPriority });
          return true;
        }
        return false;
      } catch (error) {
        toast.error("فشل في تحديث أولوية الظهور");
        return false;
      }
    },
    [adminProducts, updateProduct]
  );

  const handleToggleArchive = useCallback(
    async (productId: string, isArchived: boolean): Promise<boolean> => {
      try {
        const product = adminProducts.find(p => p.id === productId);
        if (product) {
          await updateProduct({ ...product, isArchived });
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error toggling archive status:", error);
        return false;
      }
    },
    [adminProducts, updateProduct]
  );

  // Reset all pages data
  // دالة لتهيئة إعدادات الإدارة يدوياً
  const handleInitializeAdmin = useCallback(async () => {
    try {
      console.log('🔧 Initializing admin configuration manually...');
      toast.loading('جاري تهيئة إعدادات الإدارة...', { id: 'init-admin' });

      const result = await initializeAdmin();

      if (result.success) {
        toast.success('تم تهيئة إعدادات الإدارة بنجاح! كلمة المرور: 45086932', {
          id: 'init-admin',
          duration: 5000
        });
        console.log('✅ Admin configuration initialized successfully');
      } else {
        toast.error(`فشل في تهيئة الإعدادات: ${result.error}`, {
          id: 'init-admin'
        });
        console.error('❌ Failed to initialize admin:', result.error);
      }
    } catch (error) {
      console.error('❌ Error initializing admin:', error);
      toast.error('حدث خطأ أثناء تهيئة الإعدادات', {
        id: 'init-admin'
      });
    }
  }, []);

  const handleResetAllPages = useCallback(async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "⚠️ تحذير: إعادة تعيين البيانات\n\n" +
      "هل أنت متأكد من إعادة تعيين جميع البيانات؟\n\n" +
      "سيتم حذف:\n" +
      "• جميع عمليات البيع في الكاشير (من Firebase و localStorage)\n" +
      "• بيانات إحصائيات الزوار\n" +
      "• بيانات تحليل الأرباح\n" +
      "• بيانات إدارة الطلبات\n\n" +
      "⚠️ لا يمكن التراجع عن هذا الإجراء!\n" +
      "سيتم إعادة تحميل الصفحة تلقائياً."
    );

    if (!confirmed) {
      toast.info("تم إلغاء عملية إعادة التعيين");
      return;
    }

    try {
      // Show loading toast
      toast.loading("جاري إعادة تعيين البيانات...", {
        id: "reset-data"
      });

      // Clear cashier sales data from Firebase
      console.log('Admin: Clearing sales from Firebase...');
      await salesService.clearAllSales();
      console.log('Admin: Firebase sales cleared successfully');

      // Clear cashier sales data from localStorage
      localStorage.removeItem("cashier-sales");

      // Clear analytics visitor data
      localStorage.removeItem("returning_visitor");

      // Clear any other related data
      const keysToRemove = [
        "cashier-sales",
        "returning_visitor",
        "analytics-data",
        "profit-analysis-data",
        "orders-data"
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Update toast to success
      toast.success("تم إعادة تعيين جميع البيانات بنجاح", {
        id: "reset-data"
      });

      // Force page refresh to ensure all components reload with fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("حدث خطأ أثناء إعادة تعيين البيانات", {
        id: "reset-data"
      });
    }
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedProduct: Product) => {
      try {
        await updateProduct(updatedProduct);
        setEditingProduct(null);
        toast.success("Product updated successfully");
      } catch (error) {
        toast.error("Failed to update product");
      }
    },
    [updateProduct]
  );



  return (
    <div className="min-h-screen">
      <Helmet>
        <title>لوحة التحكم</title>
        <meta
          name="description"
          content="لوحة تحكم المسؤول لإدارة منتجات المتجر والمخزون"
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="w-full px-4 md:px-8 mx-auto py-8">
        <div className="mx-auto">
          <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <div className="flex flex-wrap items-center gap-2">
              {hasDashboardAdminPerm && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{dashboardSession ? dashboardSession.displayName : 'المسؤول'}</span>
                </div>
              )}
              {hasDashboardAdminPerm && (
                <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  لوحة التحكم
                </Button>
              )}
            </div>
          </div>

          {/* Statistics Section */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
            role="region"
            aria-label="إحصائيات المتجر"
          >
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Package
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">إجمالي المنتجات</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalProducts}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">التصنيفات</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalCategories}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">العلامات التجارية</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.totalBrands}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Percent
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">العروض النشطة</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.productsWithOffers}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Timer
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium">المنتجات المؤرشفة</h3>
              </div>
              <p className="text-2xl font-bold mt-2">
                {statistics.archivedProducts}
              </p>
            </div>
          </div>

          {/* Orders Statistics Section */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8"
            role="region"
            aria-label="إحصائيات الطلبات"
          >
            {revenueLoading && (
              <div className="col-span-full flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">جاري تحميل بيانات الطلبات...</span>
              </div>
            )}
            {!revenueLoading && (
              <>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardList
                      className="h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">إجمالي الطلبات</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {statistics.totalOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Clock
                      className="h-5 w-5 text-yellow-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">قيد الانتظار</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-yellow-600">
                    {statistics.pendingOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className="h-5 w-5 text-blue-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">تم التأكيد</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-blue-600">
                    {statistics.confirmedOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Truck
                      className="h-5 w-5 text-purple-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">تم الشحن</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-purple-600">
                    {statistics.shippedOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckSquare
                      className="h-5 w-5 text-green-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">تم التوصيل</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-green-600">
                    {statistics.deliveredOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <XCircle
                      className="h-5 w-5 text-red-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">ملغي</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-red-600">
                    {statistics.cancelledOrders}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ShoppingCart
                      className="h-5 w-5 text-blue-600"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-medium">مبيعات الكاشير</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-blue-600">
                    {orderStatistics?.totalCashierSales || 0}
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold text-lg">$</span>
                    <h3 className="text-sm font-medium">إجمالي الإيرادات</h3>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-green-600">
                    {formatCurrency((statistics.totalRevenue || 0), 'جنيه')}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    <div>طلبات: {formatCurrency((revenueByStatus?.delivered || 0), 'جنيه')}</div>
                    <div>كاشير: {formatCurrency((revenueByStatus?.cashier || 0), 'جنيه')}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <ProductForm onSubmit={addProduct} />

          {/* Coupons Manager Section */}
          <div className="mt-6">
            <CouponsManager />
          </div>



          <hr />
          <div className="mt-28 mb-8">
            {adminProductsLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">جاري تحميل المنتجات...</span>
              </div>
            )}
            <Card className="p-6 mb-6 bg-card shadow-sm">
              <Collapsible
                open={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
                className="w-full space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-bold">تصفية المنتجات</h3>
                    </div>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isFiltersOpen ? "rotate-180" : "rotate-0"
                          }`}
                      />
                      <span className="sr-only">Toggle filters</span>
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <AdminFilters
                    filters={filters}
                    onFilterChange={setFilters}
                  />
                </CollapsibleContent>
              </Collapsible>
            </Card>
            <div className="flex flex-col lg:flex-row gap-3 mb-4 w-full items-stretch lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <div className="w-full sm:w-auto flex-1">
                  <ProductSearch value={searchQuery} onChange={setSearchQuery} />
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Select
                    value={dateFilter}
                    onValueChange={(value) => {
                      setDateFilter(value);
                      if (value !== "custom") {
                        setDateRange(undefined);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[170px]">
                      <SelectValue placeholder="فلتر حسب التاريخ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الفترات</SelectItem>
                      <SelectItem value="today">اليوم</SelectItem>
                      <SelectItem value="week">الأسبوع الحالي</SelectItem>
                      <SelectItem value="month">الشهر الحالي</SelectItem>
                      <SelectItem value="year">السنة الحالية</SelectItem>
                      <SelectItem value="custom">تحديد نطاق تاريخ</SelectItem>
                    </SelectContent>
                  </Select>
                  {dateFilter === "custom" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full sm:w-[260px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "PPP", { locale: ar })} -{" "}
                                {format(dateRange.to, "PPP", { locale: ar })}
                              </>
                            ) : (
                              format(dateRange.from, "PPP", { locale: ar })
                            )
                          ) : (
                            <span>اختر نطاق التاريخ</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          initialFocus
                          locale={ar}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportFilteredToExcel}
                  variant="outline"
                  disabled={currentFilteredProducts.length === 0}
                  className="w-full lg:w-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm transition-all duration-200 gap-2 font-medium h-10 px-4"
                  title="تصدير المنتجات المصفاة المعروضة حالياً إلى ملف Excel منظم"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تصدير Excel للمنتجات المصفاة</span>
                  <span className="text-xs bg-emerald-600 text-white dark:bg-emerald-500 px-2 py-0.5 rounded-full font-bold">
                    {currentFilteredProducts.length}
                  </span>
                </Button>
              </div>
            </div>
          </div>



          <ProductTable
            products={sortedProducts}
            searchQuery={searchQuery}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdatePriority={handleUpdatePriority}
            onToggleArchive={handleToggleArchive}
            onExportExcel={handleExportFilteredToExcel}
          />
        </div>
      </main>

      <EditProductModal
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default Admin;
