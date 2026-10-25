import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Package,
  Calendar,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Truck,
  CheckSquare,
  ShoppingCart,
  ArrowUpDown,
  MoreHorizontal,
  Copy,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';
import { useRevenue } from '@/hooks/useRevenue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPortal } from 'react-dom';
import { getColorByName } from '@/constants/colors';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  image: string;
  selectedColor?: string;
  selectedSize?: {
    id: string;
    label: string;
    price: number;
  } | null;
  selectedOptionGroups?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionLabel: string;
    extraPrice: number;
  }>;
  selectedAddons?: Array<{
    id: string;
    label: string;
    price_delta: number;
  }>;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
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
  reservationInfo?: { // Added reservationInfo
    fullName: string;
    phoneNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  couponCode?: string | null;
  couponDiscountAmount?: number;
}

type SortConfig = {
  key: keyof Order | 'createdAt' | 'total';
  direction: 'asc' | 'desc';
};

const AdminOrders = () => {
  const { t } = useTranslation();
  const { loading: revenueLoading, refreshData, totalRevenue } = useRevenue();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });


  const fetchAdminOrders = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingOrders(true);
      }
      
      const ordersRef = collection(db, 'orders');
      
      let q;
      if (isLoadMore && lastVisible) {
        q = query(
          ordersRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(8)
        );
      } else {
        q = query(
          ordersRef,
          orderBy('createdAt', 'desc'),
          limit(8)
        );
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        if (querySnapshot.docs.length < 8) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        setHasMore(false);
      }

      const ordersData: Order[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        ordersData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        } as Order);
      });

      if (isLoadMore) {
        setOrders(prev => {
          const newOrders = [...prev, ...ordersData];
          return newOrders.filter((v,i,a)=>a.findIndex(v2=>(v2.id===v.id))===i);
        });
      } else {
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      toast.error('حدث خطأ أثناء جلب الطلبات');
    } finally {
      setLoadingOrders(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAdminOrders();
  }, []);

  useEffect(() => {
    filterData();
  }, [orders, searchTerm, statusFilter, dateFilter, sortConfig]);

  const filterData = () => {
    let filtered = [...orders];

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.deliveryInfo.fullName.toLowerCase().includes(lowerTerm) ||
        order.deliveryInfo.phoneNumber.includes(lowerTerm) ||
        order.id.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date range
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => new Date(order.createdAt) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= endDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle dates specifically if sort key is createdAt or updatedAt
      if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredOrders(filtered);
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const exportOrdersToJson = () => {
    const formattedOrders = filteredOrders.map(order => {
      const isReservation = order.type === 'reservation';
      const customerInfo = isReservation ? order.reservationInfo : order.deliveryInfo;
      
      const formattedItems = order.items.map(item => {
        let optionsStr = '';
        if (item.selectedOptionGroups && item.selectedOptionGroups.length > 0) {
          optionsStr = item.selectedOptionGroups.map(g => `${g.groupName}: ${g.optionLabel}`).join(' | ');
        }
        
        let addonsStr = '';
        if (item.selectedAddons && item.selectedAddons.length > 0) {
          addonsStr = item.selectedAddons.map(a => a.label).join('، ');
        }

        let itemData: any = {
          "اسم المنتج": item.productName,
          "السعر": item.price,
          "الكمية": item.quantity,
        };

        if (optionsStr || addonsStr || item.selectedSize || item.selectedColor) {
          let details = [];
          if (item.selectedSize) details.push(`الحجم: ${item.selectedSize.label}`);
          if (item.selectedColor) details.push(`اللون: ${getColorByName(item.selectedColor)?.name || item.selectedColor}`);
          if (optionsStr) details.push(`المواصفات: ${optionsStr}`);
          if (addonsStr) details.push(`الإضافات: ${addonsStr}`);
          
          itemData["تفاصيل إضافية"] = details.join(' - ');
        }

        return itemData;
      });

      let orderData: any = {
        "اسم الزبون": customerInfo?.fullName || 'غير محدد',
        "رقم الهاتف": customerInfo?.phoneNumber || 'غير محدد',
      };

      if (!isReservation && order.deliveryInfo) {
        orderData["المحافظة"] = order.deliveryInfo.city;
        orderData["العنوان"] = order.deliveryInfo.address;
      } else if (isReservation && order.reservationInfo) {
        orderData["تاريخ الحجز"] = order.reservationInfo.appointmentDate;
        orderData["وقت الحجز"] = order.reservationInfo.appointmentTime;
      }

      if (customerInfo?.notes) {
        orderData["الملاحظات"] = customerInfo.notes;
      }

      orderData["نوع الطلب"] = isReservation ? "حجز منتج في الفرع" : "شراء أونلاين";
      orderData["المنتجات"] = formattedItems;

      if (order.couponCode) {
        orderData["كوبون الخصم"] = `${order.couponCode} (-${order.couponDiscountAmount || 0} جنيه)`;
      }

      orderData["السعر النهائي"] = order.total;
      orderData["تاريخ الطلب"] = formatDateTime(order.createdAt);

      return orderData;
    });

    const dataStr = JSON.stringify(formattedOrders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير البيانات بنجاح");
  };

  const copyOrderDetails = (order: Order) => {
    // 1. Format Items
    const itemsText = order.items.map((item, index) => {
      const lines: string[] = [];
      lines.push(`${index + 1}. ${item.productName}`);
      lines.push(`   الكمية: ${item.quantity}`);
      if (item.selectedSize) lines.push(`   الحجم: ${item.selectedSize.label}`);

      if (item.selectedColor) {
        const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
        lines.push(`   اللون: ${colorName}`);
      }

      if (item.selectedOptionGroups && item.selectedOptionGroups.length > 0) {
        lines.push(`   المواصفات: ${item.selectedOptionGroups.map(opt => `${opt.groupName}: ${opt.optionLabel}`).join(' | ')}`);
      }

      if (item.selectedAddons && item.selectedAddons.length > 0) {
        lines.push(`   الإضافات: ${item.selectedAddons.map(a => a.label).join(', ')}`);
      }
      lines.push(`   السعر: ${formatCurrency(item.price * item.quantity, 'جنيه')}`);
      return lines.join('\n');
    }).join('\n\n');

    // 2. Format Details based on type
    let detailsText = '';
    let title = '';

    if (order.type === 'reservation' && order.reservationInfo) {
      title = '📅 طلب حجز منتج';
      detailsText = [
        `👤 الاسم: ${order.reservationInfo.fullName}`,
        `📱 الهاتف: ${order.reservationInfo.phoneNumber}`,
        `📅 التاريخ: ${order.reservationInfo.appointmentDate}`,
        `⏰ الوقت: ${order.reservationInfo.appointmentTime}`,
        order.reservationInfo.notes ? `📝 ملاحظات: ${order.reservationInfo.notes}` : null,
      ].filter(Boolean).join('\n');
    } else {
      title = '🚀 طلب جديد (شراء أونلاين)';
      detailsText = [
        `👤 الاسم: ${order.deliveryInfo.fullName}`,
        `🏙 المحافظة: ${order.deliveryInfo.city}`,
        `📍 العنوان: ${order.deliveryInfo.address}`,
        `📱 الهاتف: ${order.deliveryInfo.phoneNumber}`,
        order.deliveryInfo.notes ? `📝 ملاحظات: ${order.deliveryInfo.notes}` : null,
      ].filter(Boolean).join('\n');
    }

    // 3. Construct Message
    const message = [
      title,
      '========================',
      itemsText,
      '========================',
      order.type === 'reservation' ? '*تفاصيل الحجز:*' : '*بيانات الشحن:*',
      detailsText,
      '========================',
      `💰 إجمالي المبلغ: ${formatCurrency(order.total, 'جنيه')}`,
      `📅 التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-EG')}`,
      '========================'
    ].join('\n');

    // 4. Copy to clipboard
    navigator.clipboard.writeText(message).then(() => {
      toast.success("تم نسخ تفاصيل الطلب بنجاح");
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast.error("فشل نسخ تفاصيل الطلب");
    });
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date() } : o));

      await refreshData();
      toast.success(`تم تحديث حالة الطلب إلى ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  const getStatusText = (status: Order['status']) => {
    const statusMap = {
      pending: 'قيد الانتظار',
      confirmed: 'تم التأكيد',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    };
    return statusMap[status];
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', icon: Clock, text: 'قيد الانتظار' },
      confirmed: { color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', icon: CheckCircle, text: 'تم التأكيد' },
      shipped: { color: 'bg-purple-100 text-purple-800 hover:bg-purple-200', icon: Truck, text: 'تم الشحن' },
      delivered: { color: 'bg-green-100 text-green-800 hover:bg-green-200', icon: CheckSquare, text: 'تم التوصيل' },
      cancelled: { color: 'bg-red-100 text-red-800 hover:bg-red-200', icon: XCircle, text: 'ملغي' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0 px-2 py-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  if (revenueLoading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container py-8 max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">إدارة الطلبات</h1>
              <p className="text-muted-foreground mt-1">
                نظرة شاملة على جميع الطلبات وحالاتها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={exportOrdersToJson}
              variant="outline"
              className="gap-2 bg-white shadow-sm border-gray-200 hover:bg-gray-50"
              title="تصدير بيانات الطلبات (JSON)"
            >
              <Download className="h-4 w-4" />
              <span>تصدير JSON</span>
            </Button>
            <Card className="px-4 py-2 bg-white shadow-sm border-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">الإجمالي:</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue, 'جنيه')}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters & Search */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="بحث بالاسم، رقم الهاتف، أو رقم الطلب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="الحالة" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="confirmed">تم التأكيد</SelectItem>
                    <SelectItem value="shipped">تم الشحن</SelectItem>
                    <SelectItem value="delivered">تم التوصيل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-md border">
                  <Input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="w-auto h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="w-auto h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                  />
                </div>

                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                  {filteredOrders.length} طلب
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || dateFilter.start
                ? 'لم يتم العثور على طلبات تطابق معايير البحث الحالية.'
                : 'لم يتم استلام أي طلبات حتى الآن.'}
            </p>
            {(searchTerm || statusFilter !== 'all' || dateFilter.start) && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter({ start: '', end: '' });
                }}
              >
                مسح التصفيات
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="w-[120px] text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-2">
                        التاريخ
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('total')}>
                      <div className="flex items-center gap-2">
                        الإجمالي
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDetails(true);
                    }}>
                      <TableCell className="font-medium text-primary">#{order.id.slice(-6)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{order.deliveryInfo.fullName}</span>
                          <span className="text-xs text-muted-foreground">{order.deliveryInfo.phoneNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-col">
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex">
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">{formatCurrency(order.total, 'جنيه')}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyOrderDetails(order)}>
                              <Copy className="mr-2 h-4 w-4" />
                              نسخ التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>تحديث الحالة</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                              قيد التحضير
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'shipped')}>
                              تم الشحن
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>
                              تم التوصيل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                              إلغاء الطلب
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden border-none shadow-sm" onClick={() => {
                  setSelectedOrder(order);
                  setShowOrderDetails(true);
                }}>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">#{order.id.slice(-8)}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{order.deliveryInfo.fullName}</p>
                        <p className="text-xs text-muted-foreground">{order.deliveryInfo.phoneNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <span className="font-bold text-lg text-primary">{formatCurrency(order.total, 'جنيه')}</span>
                      <Button variant="ghost" size="sm" className="text-xs">
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {hasMore && orders.length >= 8 && (
              <div className="flex justify-center mt-8 pt-4">
                <Button 
                  onClick={() => fetchAdminOrders(true)} 
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full max-w-sm bg-white"
                >
                  {loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Order Details Modal via Portal */}
        {showOrderDetails && selectedOrder && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed at top */}
              <div className="flex-none bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-gray-900">تفاصيل الطلب #{selectedOrder.id.slice(-8)}</h2>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyOrderDetails(selectedOrder)}
                    className="gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:text-primary"
                    title="نسخ جميع تفاصيل الطلب"
                  >
                    <Copy className="h-4 w-4" />
                    <span>نسخ </span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowOrderDetails(false)} className="hover:bg-gray-100 rounded-full text-gray-500">
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Info Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      معلومات العميل
                    </h3>
                    <div className="bg-gray-50/50 p-4 rounded-lg space-y-3 text-sm border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الاسم:</span>
                        <span className="font-medium">{selectedOrder.deliveryInfo.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الهاتف:</span>
                        <span className="font-medium text-right font-mono" dir="ltr">{selectedOrder.deliveryInfo.phoneNumber}</span>
                      </div>

                      {selectedOrder.type === 'reservation' && selectedOrder.reservationInfo ? (
                        <>
                          <div className="pt-2 border-t mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                حجز موعد
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white p-2.5 rounded border">
                                <p className="text-xs text-muted-foreground mb-1">تاريخ الحجز</p>
                                <div className="font-medium flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                  {selectedOrder.reservationInfo.appointmentDate}
                                </div>
                              </div>
                              <div className="bg-white p-2.5 rounded border">
                                <p className="text-xs text-muted-foreground mb-1">وقت الحجز</p>
                                <div className="font-medium flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                                  {(() => {
                                    const time = selectedOrder.reservationInfo.appointmentTime;
                                    if (!time) return '';
                                    const [hoursStr, minutes] = time.split(':');
                                    let hours = parseInt(hoursStr, 10);
                                    let suffix = 'صباحاً';

                                    if (hours >= 12) {
                                      if (hours >= 12 && hours < 15) suffix = 'ظهراً';
                                      else if (hours >= 15 && hours < 18) suffix = 'عصراً';
                                      else suffix = 'مساءً';

                                      if (hours > 12) hours -= 12;
                                    } else if (hours === 0) {
                                      hours = 12;
                                    }
                                    return `${hours}:${minutes} ${suffix}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الموقع:</span>
                            <span className="font-medium text-right">{selectedOrder.deliveryInfo.city}</span>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground mb-1">العنوان بالتفصيل:</p>
                            <p className="font-medium leading-relaxed">{selectedOrder.deliveryInfo.address}</p>
                          </div>
                        </>
                      )}

                      {(selectedOrder.deliveryInfo.notes || selectedOrder.reservationInfo?.notes) && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground mb-1">ملاحظات:</p>
                          <p className="font-medium text-amber-600">
                            {selectedOrder.type === 'reservation' && selectedOrder.reservationInfo?.notes
                              ? selectedOrder.reservationInfo.notes
                              : selectedOrder.deliveryInfo.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      ملخص الطلب
                    </h3>
                    <div className="bg-gray-50/50 p-4 rounded-lg space-y-3 text-sm border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الطلب:</span>
                        <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">وقت الطلب:</span>
                        <span className="font-medium">{new Date(selectedOrder.createdAt).toLocaleTimeString('ar-EG')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">عدد المنتجات:</span>
                        <span className="font-medium">{selectedOrder.items.length} منتجات</span>
                      </div>
                      <div className="pt-3 border-t flex justify-between items-center">
                        <span className="font-semibold text-lg">الإجمالي:</span>
                        <span className="font-bold text-xl text-primary">{formatCurrency(selectedOrder.total, 'جنيه')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items List */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    المنتجات ({selectedOrder.items.length})
                  </h3>
                  <div className="space-y-3">
                    <div className="border rounded-2xl overflow-hidden bg-white shadow-sm divide-y divide-gray-100">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 hover:bg-gray-50/60 transition-colors group items-start border-b last:border-0 border-gray-50">
                          {/* Top Mobile / Left Desktop: Image & Name */}
                          <div className="flex gap-4 w-full sm:w-auto">
                            {/* Product Image */}
                            <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                              <img
                                src={item.image}
                                alt={item.productName}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>

                            {/* Mobile Only: Name & Size Header */}
                            <div className="flex-1 min-w-0 sm:hidden flex flex-col justify-center">
                              <h4 className="font-bold text-gray-900 text-base leading-tight mb-2">
                                {item.productName}
                              </h4>
                              {item.selectedSize && (
                                <div className="flex">
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                                    {item.selectedSize.label}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Desktop Right: Content Body */}
                          <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
                            {/* Desktop Only: Name Header */}
                            <div className="hidden sm:block">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900 text-lg leading-tight">
                                  {item.productName}
                                </h4>
                              </div>
                            </div>

                            {/* Options (Size & Addons) */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {/* Desktop Size Badge */}
                              {item.selectedSize && (
                                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
                                  <span className="opacity-70">الحجم:</span>
                                  <span>{item.selectedSize.label}</span>
                                </div>
                              )}

                              {item.selectedOptionGroups && item.selectedOptionGroups.map((opt, i) => (
                                <span
                                  key={`opt-${i}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium"
                                >
                                  <span className="opacity-70">{opt.groupName}:</span>
                                  <span>{opt.optionLabel}</span>
                                </span>
                              ))}

                              {/* Addons List - Visible on both */}
                              {item.selectedAddons && item.selectedAddons.map((addon, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-800 text-xs sm:text-sm font-medium"
                                >
                                  {addon.label}
                                  {addon.price_delta > 0 && (
                                    <span className="text-amber-600 font-bold mr-1 text-[10px] sm:text-xs">
                                      (+{formatCurrency(addon.price_delta, '')})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>

                            {/* Footer: Financials (Responsive Stack) */}
                            <div className="mt-auto pt-3 border-t border-gray-100 border-dashed w-full">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {/* Quantity Box */}
                                <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-50/80 px-3 py-2 rounded-lg border border-gray-100 text-sm w-full sm:w-auto">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium text-xs">الكمية:</span>
                                    <span className="font-bold text-gray-900">{item.quantity}</span>
                                  </div>
                                  <div className="h-4 w-px bg-gray-300 mx-2"></div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(item.price, 'جنيه')} / قطعة
                                  </span>
                                </div>

                                {/* Total Price Box */}
                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                  <span className="text-sm text-gray-500 font-medium sm:hidden">الإجمالي:</span>
                                  <span className="font-black text-lg sm:text-xl text-primary bg-primary/5 px-4 py-1.5 rounded-lg border border-primary/10 dashed w-fit ml-auto sm:ml-0">
                                    {formatCurrency(item.totalPrice || (item.price * item.quantity), 'جنيه')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="flex-none bg-gray-50 p-4 border-t flex gap-3 justify-end items-center">
                <span className="text-sm text-muted-foreground ml-auto">
                  تغيير الحالة إلى:
                </span>
                <div className="flex gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'confirmed');
                        setShowOrderDetails(false);
                      }}
                    >
                      تأكيد الطلب
                    </Button>
                  )}
                  {['confirmed', 'shipped'].includes(selectedOrder.status) && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'delivered');
                        setShowOrderDetails(false);
                      }}
                    >
                      تأكيد التوصيل
                    </Button>
                  )}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setShowOrderDetails(false);
                      }}
                    >
                      إلغاء الطلب
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default AdminOrders;