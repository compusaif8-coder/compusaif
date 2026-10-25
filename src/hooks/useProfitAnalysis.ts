import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';

interface Order {
  id: string;
  userId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number; // This should be the final price including size/addon options
    image: string;
    selectedSize?: {
      id: string;
      label: string;
      price: number;
    };
    selectedAddons: {
      id: string;
      label: string;
      price_delta: number;
    }[];
    unitFinalPrice: number;
    totalPrice: number;
  }[];
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

interface Sale {
  id: string;
  items: {
    product: {
      id: string;
      name: string;
      price: number;
      wholesaleInfo?: {
        purchasePrice: number;

        quantity: number;
      };
    };
    quantity: number;
    selectedSize?: {
      id: string;
      label: string;
      price: number;
    };
    selectedAddons: {
      id: string;
      label: string;
      price_delta: number;
    }[];
    unitFinalPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  timestamp: Date;
  customerName?: string;
}

interface ProfitAnalysis {
  // إجمالي المبيعات
  totalSales: number;
  totalOrders: number;
  totalCashierSales: number;

  // الأرباح
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;

  // تحليل حسب المصدر
  revenueBySource: {
    online: number;
    cashier: number;
  };

  profitBySource: {
    online: number;
    cashier: number;
  };

  // أكثر المنتجات ربحية
  topProfitableProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
  }>;

  // أكثر المنتجات مبيعاً
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;

  // تحليل شهري
  monthlyAnalysis: Array<{
    month: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
    sales: number;
  }>;

  // تحليل حسب الحالة
  analysisByStatus: {
    pending: { revenue: number; orders: number };
    confirmed: { revenue: number; orders: number };
    shipped: { revenue: number; orders: number };
    delivered: { revenue: number; orders: number };
    cancelled: { revenue: number; orders: number };
  };
}

export const useProfitAnalysis = (timeRange: number = 30) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products } = useStore();

  // جلب الطلبات من Firebase — مع缓存 لمدة 5 دقائق
  const fetchOrders = async () => {
    const PROFIT_ORDERS_CACHE_KEY = `profit_orders_cache_${timeRange}`;
    const PROFIT_ORDERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    try {
      // Check sessionStorage cache first
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(PROFIT_ORDERS_CACHE_KEY);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < PROFIT_ORDERS_CACHE_TTL) {
            setOrders(data.map((o: any) => ({
              ...o,
              createdAt: new Date(o.createdAt),
              updatedAt: new Date(o.updatedAt),
            })));
            return;
          }
        }
      }

      const ordersRef = collection(db, 'orders');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);

      const q = query(
        ordersRef,
        where('createdAt', '>=', cutoffDate),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const ordersData: Order[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ordersData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        } as Order);
      });

      // Save to sessionStorage cache
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(PROFIT_ORDERS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: ordersData.map(o => ({
              ...o,
              createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
              updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
            }))
          }));
        } catch { /* sessionStorage might be full */ }
      }

      setOrders(ordersData);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'فشل في تحميل الطلبات');
    }
  };

  // تحميل مبيعات الكاشير من localStorage
  const loadSales = () => {
    try {
      const savedSales = localStorage.getItem("cashier-sales");
      if (savedSales) {
        const parsedSales = JSON.parse(savedSales);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeRange);

        const salesData = parsedSales
          .map((sale: any) => ({
            ...sale,
            timestamp: new Date(sale.timestamp)
          }))
          .filter((sale: Sale) => sale.timestamp >= cutoffDate);

        setSales(salesData);
      }
    } catch (err: any) {
      console.error('Error loading sales:', err);
      setError(err.message || 'فشل في تحميل المبيعات');
    }
  };

  // حساب تحليل الأرباح
  const profitAnalysis = useMemo((): ProfitAnalysis => {
    if (!products) return {
      totalSales: 0,
      totalOrders: 0,
      totalCashierSales: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      revenueBySource: { online: 0, cashier: 0 },
      profitBySource: { online: 0, cashier: 0 },
      topProfitableProducts: [],
      topSellingProducts: [],
      monthlyAnalysis: [],
      analysisByStatus: {
        pending: { revenue: 0, orders: 0 },
        confirmed: { revenue: 0, orders: 0 },
        shipped: { revenue: 0, orders: 0 },
        delivered: { revenue: 0, orders: 0 },
        cancelled: { revenue: 0, orders: 0 },
      }
    };

    // تحليل الطلبات عبر الإنترنت
    let onlineRevenue = 0;
    let onlineCost = 0;
    const onlineProductStats = new Map<string, {
      quantity: number;
      revenue: number;
      cost: number;
    }>();

    orders.forEach(order => {
      if (order.status === 'delivered') {
        onlineRevenue += order.total;

        order.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.wholesaleInfo) {
            const cost = (product.wholesaleInfo.purchasePrice || 0) * item.quantity;
            onlineCost += cost;

            const existing = onlineProductStats.get(item.productId) || {
              quantity: 0,
              revenue: 0,
              cost: 0
            };

            // Use unitFinalPrice for more accurate profit calculation
            const unitPrice = item.unitFinalPrice || item.price;
            onlineProductStats.set(item.productId, {
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (unitPrice * item.quantity),
              cost: existing.cost + cost
            });
          }
        });
      }
    });

    // تحليل مبيعات الكاشير
    let cashierRevenue = 0;
    let cashierCost = 0;
    const cashierProductStats = new Map<string, {
      quantity: number;
      revenue: number;
      cost: number;
    }>();

    sales.forEach(sale => {
      cashierRevenue += sale.totalAmount;

      sale.items.forEach(item => {
        if (item.product.wholesaleInfo) {
          // Use unitFinalPrice for more accurate profit calculation
          const unitPrice = item.unitFinalPrice || item.product.price;
          const cost = (item.product.wholesaleInfo.purchasePrice || 0) * item.quantity;
          cashierCost += cost;

          const existing = cashierProductStats.get(item.product.id) || {
            quantity: 0,
            revenue: 0,
            cost: 0
          };

          cashierProductStats.set(item.product.id, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.totalPrice, // item.totalPrice already uses unitFinalPrice
            cost: existing.cost + cost
          });
        }
      });
    });

    // دمج إحصائيات المنتجات
    const allProductStats = new Map<string, {
      quantity: number;
      revenue: number;
      cost: number;
    }>();

    onlineProductStats.forEach((stats, productId) => {
      allProductStats.set(productId, stats);
    });

    cashierProductStats.forEach((stats, productId) => {
      const existing = allProductStats.get(productId) || { quantity: 0, revenue: 0, cost: 0 };
      allProductStats.set(productId, {
        quantity: existing.quantity + stats.quantity,
        revenue: existing.revenue + stats.revenue,
        cost: existing.cost + stats.cost
      });
    });

    // حساب أكثر المنتجات ربحية
    const topProfitableProducts = Array.from(allProductStats.entries())
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        const profit = stats.revenue - stats.cost;
        const profitMargin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;

        return {
          productId,
          productName: product?.name || 'منتج غير معروف',
          totalSold: stats.quantity,
          totalRevenue: stats.revenue,
          totalCost: stats.cost,
          totalProfit: profit,
          profitMargin
        };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    // حساب أكثر المنتجات مبيعاً
    const topSellingProducts = Array.from(allProductStats.entries())
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          productName: product?.name || 'منتج غير معروف',
          totalQuantity: stats.quantity,
          totalRevenue: stats.revenue
        };
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // تحليل شهري
    const monthlyData = new Map<string, {
      revenue: number;
      cost: number;
      orders: number;
      sales: number;
    }>();

    // إضافة بيانات الطلبات الشهرية
    orders.forEach(order => {
      const month = order.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyData.get(month) || { revenue: 0, cost: 0, orders: 0, sales: 0 };

      if (order.status === 'delivered') {
        existing.revenue += order.total;

        order.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.wholesaleInfo) {
            existing.cost += (product.wholesaleInfo.purchasePrice || 0) * item.quantity;
          }
        });
      }

      existing.orders += 1;
      monthlyData.set(month, existing);
    });

    // إضافة بيانات مبيعات الكاشير الشهرية
    sales.forEach(sale => {
      const month = sale.timestamp.toISOString().slice(0, 7);
      const existing = monthlyData.get(month) || { revenue: 0, cost: 0, orders: 0, sales: 0 };

      existing.revenue += sale.totalAmount;
      existing.sales += 1;

      sale.items.forEach(item => {
        if (item.product.wholesaleInfo) {
          existing.cost += (item.product.wholesaleInfo.purchasePrice || 0) * item.quantity;
        }
      });

      monthlyData.set(month, existing);
    });

    const monthlyAnalysis = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        orders: data.orders,
        sales: data.sales
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // تحليل حسب الحالة
    const analysisByStatus = {
      pending: { revenue: 0, orders: 0 },
      confirmed: { revenue: 0, orders: 0 },
      shipped: { revenue: 0, orders: 0 },
      delivered: { revenue: 0, orders: 0 },
      cancelled: { revenue: 0, orders: 0 },
    };

    orders.forEach(order => {
      analysisByStatus[order.status].revenue += order.total;
      analysisByStatus[order.status].orders += 1;
    });

    const totalRevenue = onlineRevenue + cashierRevenue;
    const totalCost = onlineCost + cashierCost;
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalSales: orders.length + sales.length,
      totalOrders: orders.length,
      totalCashierSales: sales.length,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      revenueBySource: {
        online: onlineRevenue,
        cashier: cashierRevenue
      },
      profitBySource: {
        online: onlineRevenue - onlineCost,
        cashier: cashierRevenue - cashierCost
      },
      topProfitableProducts,
      topSellingProducts,
      monthlyAnalysis,
      analysisByStatus
    };
  }, [orders, sales, products, timeRange]);

  // تحميل البيانات عند التغيير
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchOrders();
        loadSales();
      } catch (err: any) {
        setError(err.message || 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  // تحديث البيانات
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchOrders();
      loadSales();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return {
    profitAnalysis,
    loading,
    error,
    refreshData,
    orders,
    sales
  };
}; 