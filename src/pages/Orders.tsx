import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Calendar,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice?: number;
  image: string;
  selectedSize?: {
    id: string;
    label: string;
    price: number;
  } | null;
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
  type?: 'online_purchase' | 'reservation';
  deliveryInfo?: {
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

const Orders = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // If auth is still loading, wait.
    if (authLoading) return;

    if (userProfile && userProfile.uid) {
      console.log('User profile loaded, fetching orders...');
      fetchOrders();
    } else {
      console.log('No user profile, stopping load.');
      setLoading(false);
    }
  }, [userProfile, authLoading]);

  const fetchOrders = async (isLoadMore = false) => {
    if (!userProfile || !userProfile.uid) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const ordersRef = collection(db, 'orders');

      let q;
      if (isLoadMore && lastVisible) {
        q = query(
          ordersRef,
          where('userId', '==', userProfile.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(8)
        );
      } else {
        q = query(
          ordersRef,
          where('userId', '==', userProfile.uid),
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
        setOrders(prev => [...prev, ...ordersData]);
      } else {
        setOrders(ordersData);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.message && error.message.includes('index')) {
        toast.error('يحتاج هذا الاستعلام إلى Index في Firebase، يرجى مراجعة الـ Console');
      } else {
        toast.error('حدث خطأ أثناء جلب الطلبات');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'قيد الانتظار' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'تم التأكيد' },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: Package, text: 'تم الشحن' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'تم التوصيل' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'ملغي' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getTypeBadge = (type?: string) => {
    if (type === 'reservation') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          حجز موعد في المحل
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-gray-300 text-gray-600">
        شراء أونلاين
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-4">
            يجب عليك تسجيل الدخول لعرض طلباتك
          </p>
          <Link to="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">طلباتي</h1>
            <p className="text-muted-foreground">
              عرض جميع طلباتك السابقة والحالية
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>جاري تحميل الطلبات...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
              <p className="text-muted-foreground mb-4">
                لم تقم بأي طلب بعد. ابدأ بالتسوق الآن!
              </p>
              <Link to="/products">
                <Button>تصفح المنتجات</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            طلب #{order.id.slice(-8)}
                          </CardTitle>
                          {getTypeBadge(order.type)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {order.deliveryInfo?.fullName || order.reservationInfo?.fullName || 'غير محدد'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(order.status)}
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          {formatCurrency(order.total, 'جنيه')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} منتج
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Info Section */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      {order.type === 'reservation' && order.reservationInfo ? (
                        <>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            تفاصيل الحجز
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><strong>الاسم:</strong> {order.reservationInfo.fullName}</p>
                            <p><strong>الهاتف:</strong> {order.reservationInfo.phoneNumber}</p>
                            <p><strong>تاريخ الموعد:</strong> {order.reservationInfo.appointmentDate}</p>
                            <p><strong>الوقت:</strong> {order.reservationInfo.appointmentTime}</p>
                            {order.reservationInfo.notes && (
                              <p><strong>ملاحظات:</strong> {order.reservationInfo.notes}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            معلومات التوصيل
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><strong>الاسم:</strong> {order.deliveryInfo?.fullName || 'غير محدد'}</p>
                            <p><strong>الهاتف:</strong> {order.deliveryInfo?.phoneNumber || 'غير محدد'}</p>
                            <p><strong>العنوان:</strong> {order.deliveryInfo?.address || 'غير محدد'}</p>
                            <p><strong>المدينة:</strong> {order.deliveryInfo?.city || 'غير محدد'}</p>
                            {order.deliveryInfo?.notes && (
                              <p><strong>ملاحظات:</strong> {order.deliveryInfo.notes}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">تفاصيل الطلب</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>رقم الطلب:</strong> {order.id}</p>
                        <p><strong>تاريخ الطلب:</strong> {formatDateTime(order.createdAt)}</p>
                        <p><strong>آخر تحديث:</strong> {formatDateTime(order.updatedAt)}</p>
                        <p><strong>عدد المنتجات:</strong> {order.items.length}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold mb-4">المنتجات المطلوبة</h4>
                    <div className="space-y-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <h5 className="font-medium">{item.productName}</h5>
                            {item.selectedSize && (
                              <p className="text-sm text-blue-600 font-medium">
                                📐 الحجم: {item.selectedSize.label}
                              </p>
                            )}
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <p className="text-sm text-green-600">
                                ➕ الإضافات: {item.selectedAddons.map(addon => addon.label).join(', ')}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              الكمية: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency((item.totalPrice || (item.price * item.quantity)), 'جنيه')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.price, 'جنيه')} للقطعة
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Order Summary */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">المجموع الكلي</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(order.total, 'جنيه')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">حالة الطلب</p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {hasMore && orders.length >= 8 && (
              <div className="flex justify-center mt-8 pt-4">
                <Button
                  onClick={() => fetchOrders(true)}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full max-w-sm"
                >
                  {loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders; 