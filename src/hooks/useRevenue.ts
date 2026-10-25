import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Order {
  id: string;
  userId: string;
  items: any[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  type?: 'online' | 'reservation'; // Added type
  deliveryInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    notes?: string;
  };
  reservationInfo?: {
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Sale {
  id: string;
  items: any[];
  totalAmount: number;
  timestamp: Date;
  customerName?: string;
}

export const useRevenue = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders from Firebase — cached for 5 minutes per session
  const fetchOrders = async () => {
    const ORDERS_CACHE_KEY = 'orders_cache';
    const ORDERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    try {
      setError(null);

      // Check sessionStorage cache first
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(ORDERS_CACHE_KEY);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < ORDERS_CACHE_TTL) {
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
      const q = query(ordersRef, orderBy('createdAt', 'desc'));

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
          sessionStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify({
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
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'خطأ في تحميل الطلبات');
      // Don't throw, just set empty array to prevent crashes
      setOrders([]);
    }
  };

  // Load sales from localStorage
  const loadSales = () => {
    try {
      const savedSales = localStorage.getItem("cashier-sales");
      if (savedSales) {
        const parsedSales = JSON.parse(savedSales);
        const salesData = parsedSales.map((sale: any) => ({
          ...sale,
          timestamp: new Date(sale.timestamp)
        }));
        setSales(salesData);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    }
  };

  // Calculate total revenue from both sources
  const totalRevenue = useMemo(() => {
    // Revenue from delivered orders (Firebase)
    const ordersRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0);

    // Revenue from cashier sales (localStorage)
    const salesRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    return ordersRevenue + salesRevenue;
  }, [orders, sales]);

  // Calculate revenue by status
  const revenueByStatus = useMemo(() => {
    const ordersByStatus = {
      pending: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total, 0),
      confirmed: orders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + o.total, 0),
      shipped: orders.filter(o => o.status === 'shipped').reduce((sum, o) => sum + o.total, 0),
      delivered: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0),
      cancelled: orders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + o.total, 0),
    };

    return {
      ...ordersByStatus,
      cashier: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    };
  }, [orders, sales]);

  // Calculate order statistics
  const orderStatistics = useMemo(() => ({
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
    shippedOrders: orders.filter(o => o.status === 'shipped').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    totalCashierSales: sales.length,
  }), [orders, sales]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchOrders();
      loadSales();
      setLoading(false);
    };

    loadData();
  }, []);

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    await fetchOrders();
    loadSales();
    setLoading(false);
  };

  return {
    orders,
    sales,
    totalRevenue,
    revenueByStatus,
    orderStatistics,
    loading,
    error,
    refreshData,
  };
}; 