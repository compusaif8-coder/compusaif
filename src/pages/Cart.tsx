import { useStore } from "@/store/useStore";
import { ProductModal } from "@/components/ProductModal";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Eye,
  Settings,
  ShoppingBag,
  Truck,
  MapPin,
  CalendarClock,
  User,
  Phone,
  AlertCircle,
  Trash2 as Trash2Icon,
  CheckCircle,
  ClipboardCopy
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { checkOrderSpam } from "@/lib/spamProtection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { trackMetaInitiateCheckout } from "@/lib/metaPixel";
import { trackPurchase } from "@/lib/analytics";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { getColorByName } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { db, updateProductQuantitiesAtomically, createOrderAndUpdateProductQuantitiesAtomically } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { getOrderWhatsAppNumber } from "@/utils/whatsapp";
import { motion } from "framer-motion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STORE_GOVERNORATES } from "@/constants/store";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getProductUrl } from "@/utils/url";
import { checkCoupon, incrementCouponUsage, Coupon } from "@/lib/coupons";
import { Tag, Loader2, Ticket } from "lucide-react";

interface ReservationFormData {
  fullName: string;
  phoneNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  depositMethod?: 'vodafone_cash' | 'instapay' | 'store_visit';
  notes?: string;
}

interface DeliveryFormData {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  notes?: string;
}

interface SupplierGroup {
  supplierName: string;
  supplierPhone: string;
  items: { product: Product; quantity: number }[];
  total: number;
}

const Cart = () => {
  const cart = useStore((state) => state.cart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateCartItemQuantity = useStore((state) => state.updateCartItemQuantity);
  const { userProfile } = useAuth();
  const { settings } = useSiteSettings();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showClearCartAlert, setShowClearCartAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState<"online_purchase" | "reservation">("online_purchase");

  // Track Meta Pixel InitiateCheckout
  useEffect(() => {
    if (cart.length > 0) {
      const items = cart.map(item => ({
        id: item.product.id,
        price: getCartItemPrice(item),
        quantity: item.quantity
      }));
      trackMetaInitiateCheckout(items, getCartTotal());
    }
  }, []);

  // Order Success Modal State
  const [orderSuccess, setOrderSuccess] = useState<{
    isOpen: boolean;
    type: 'online' | 'reservation';
    governorate?: string;
    whatsappUrl: string;
    totalAmount?: number;
  }>({
    isOpen: false,
    type: 'online',
    whatsappUrl: ''
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<DeliveryFormData>({
    mode: 'onChange'
  });

  const notes = watch("notes");

  const totalAmount = getCartTotal();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCouponFieldOpen, setIsCouponFieldOpen] = useState(false);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.applicableProductIds && appliedCoupon.applicableProductIds.length > 0) {
      const applicableTotal = cart
        .filter(item => item.product?.id && appliedCoupon.applicableProductIds!.includes(item.product.id))
        .reduce((sum, item) => sum + item.totalPrice, 0);
      if (applicableTotal > 0) {
        couponDiscountAmount = appliedCoupon.type === 'fixed'
          ? appliedCoupon.value
          : (applicableTotal * appliedCoupon.value) / 100;
      }
    } else {
      couponDiscountAmount = appliedCoupon.type === 'fixed'
        ? appliedCoupon.value
        : (totalAmount * appliedCoupon.value) / 100;
    }
  }

  const selectedCity = watch("city");
  const shippingCost = STORE_GOVERNORATES.find(g => g.name === selectedCity)?.shippingCost || 0;
  const currentShippingCost = orderType === "online_purchase" ? shippingCost : 0;
  const numericShippingCost = typeof currentShippingCost === 'number' ? currentShippingCost : 0;

  const finalTotalAmount = Math.max(0, totalAmount - couponDiscountAmount) + numericShippingCost;

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    setIsCouponLoading(true);
    try {
      const result = await checkCoupon(couponInput);
      if (result.coupon) {
        if (result.coupon.applicableProductIds && result.coupon.applicableProductIds.length > 0) {
          const hasApplicableProduct = cart.some(item => item.product?.id && result.coupon!.applicableProductIds!.includes(item.product.id));
          if (!hasApplicableProduct) {
            setCouponError('هذا الكوبون لا يشمل المنتجات في سلتك');
            setAppliedCoupon(null);
            return;
          }
        }
        setAppliedCoupon(result.coupon);
        setIsCouponFieldOpen(false);
        toast.success('تم تفعيل الكوبون بنجاح!');
      } else {
        setCouponError(result.error || 'كوبون غير صالح أو غير مفعل');
        setAppliedCoupon(null);
      }
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError('');
    setIsCouponFieldOpen(false);
    toast.info('تم إلغاء الكوبون');
  };

  const {
    register: registerReservation,
    handleSubmit: handleSubmitReservation,
    setValue: setReservationValue,
    watch: watchReservation,
    formState: { errors: reservationErrors, isValid: isReservationValid },
    reset: resetReservation,
  } = useForm<ReservationFormData>({
    mode: 'onChange',
    defaultValues: {
      depositMethod: 'vodafone_cash'
    }
  });

  const depositMethod = watchReservation("depositMethod");

  if (cart.length === 0) {
    return (
      <div className="min-h-screen">
        <main className="container py-8">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Breadcrumb>
              <BreadcrumbList className="flex items-center text-sm">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/"
                      className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      {t("navigation.home")}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <span className="mx-2 text-muted-foreground">&lt;</span>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold">{t("cart.title")}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </motion.div>

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t("cart.title")}</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-white rounded-lg border shadow-sm p-8 max-w-md w-full text-center">
              <div className="mx-auto mb-6">
                <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("cart.emptyTitle")}
              </h2>
              <p className="text-gray-600 mb-8">
                {t("cart.emptyDescription")}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/products")}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {t("cart.startShopping")}
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  العودة للرئيسية
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Helper to map cart items ---
  const mapCartItemsToOrderItems = (cartItems: typeof cart) => {
    return cartItems
      .filter((item) => item.product && item.product.id)
      .map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.unitFinalPrice,
        totalPrice: item.totalPrice,
        image: item.product.images[0],
        selectedSize: item.selectedSize ? {
          id: item.selectedSize.id,
          label: item.selectedSize.label,
          price: item.selectedSize.price
        } : null,
        selectedAddons: item.selectedAddons.map((addon: any) => ({
          id: addon.id,
          label: addon.label,
          price_delta: addon.price_delta
        })),
        selectedOptionGroups: item.selectedOptionGroups || [],
        selectedColor: item.selectedColor
      }));
  };

  const formatOrderLines = (items: any[]) => {
    return items.map((item, i) => {
      const lines: string[] = [];
      lines.push(`${i + 1}. ${item.productName}`);
      lines.push(`   الكمية: ${item.quantity}`);
      if (item.selectedSize) lines.push(`   الحجم: ${item.selectedSize.label}`);
      if (item.selectedColor) {
        const colorName = getColorByName(item.selectedColor).name || item.selectedColor;
        lines.push(`   اللون: ${colorName}`);
      }
      if (item.selectedOptionGroups && item.selectedOptionGroups.length > 0) {
        lines.push(`   المواصفات: \n${item.selectedOptionGroups.map((opt: any) => `      - ${opt.groupName}: ${opt.optionLabel} (+${formatCurrency(opt.extraPrice, 'جنيه')})`).join('\n')}`);
      }
      lines.push(`   السعر: ${formatCurrency(item.totalPrice, 'جنيه')}`);
      return lines.join('\n');
    }).join('\n---------\n');
  };

  const processOrder = async (orderData: any, message: string) => {
    const whatsappNumber = getOrderWhatsAppNumber(settings);
    const deductions = cart
      .filter((item) => item.product && item.product.id)
      .map(item => ({
        productId: item.product.id,
        quantityToDeduct: item.quantity
      }));

    try {
      if (typeof createOrderAndUpdateProductQuantitiesAtomically === 'function') {
        await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
        if (typeof updateProductQuantitiesAtomically === 'function') {
          await updateProductQuantitiesAtomically(deductions);
        }
      }

      if (appliedCoupon?.id) {
        await incrementCouponUsage(appliedCoupon.id);
      }

      // Track Purchase (GA4 + Meta Pixel & CAPI Deduplicated)
      trackPurchase(orderData.userId, orderData.total, orderData.items);

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      setOrderSuccess({
        isOpen: true,
        type: orderData.type === 'reservation' ? 'reservation' : 'online',
        governorate: orderData.type === 'reservation' ? undefined : orderData.deliveryInfo?.city,
        whatsappUrl,
        totalAmount: orderData.total
      });

    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('حدث خطأ في حفظ الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeliverySubmit = async (data: DeliveryFormData) => {
    setIsSubmitting(true);

    // Check for spam/duplicate orders
    const spamResult = await checkOrderSpam({
      orderType: 'online_purchase',
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      productId: ""
    });

    if (spamResult.isSpam) {
      toast.error(spamResult.message);
      setIsSubmitting(false);
      return;
    }

    const orderItems = mapCartItemsToOrderItems(cart);
    const deliveryInfo = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      city: data.city,
      notes: data.notes || ''
    };

    const orderData = {
      userId: userProfile?.uid || `guest-${Date.now()}`,
      items: orderItems,
      total: finalTotalAmount,
      couponCode: appliedCoupon?.code || null,
      couponDiscountAmount: couponDiscountAmount,
      status: 'pending',
      deliveryInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderLines = formatOrderLines(orderItems);
    const deliverySection = [
      `👤 الاسم: ${deliveryInfo.fullName}`,
      `🏙 المحافظة: ${deliveryInfo.city}`,
      `📍 العنوان: ${deliveryInfo.address}`,
      `📱 الهاتف: ${deliveryInfo.phoneNumber}`,
      deliveryInfo.notes ? `📝 ملاحظات: ${deliveryInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const message = [
      '🚀 طلب جديد (شراء أونلاين)',
      '========================',
      orderLines,
      '========================',
      '*بيانات الشحن:*',
      deliverySection,
      '========================',
      appliedCoupon ? `🎟 كود الخصم: ${appliedCoupon.code} (-${formatCurrency(couponDiscountAmount, 'جنيه')})` : null,
      currentShippingCost !== 0 ? `🚚 مصاريف الشحن: ${typeof currentShippingCost === 'number' ? formatCurrency(currentShippingCost as number, 'جنيه') : currentShippingCost}` : null,
      `💰 الإجمالي النهائي: ${formatCurrency(finalTotalAmount, 'جنيه')}`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
      '========================',
      'يرجى تأكيد الطلب ومراجعة تكاليف الشحن'
    ].join('\n');

    await processOrder(orderData, message);
  };



  const handleReservationSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true);

    const selectedDate = new Date(data.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 2);

    if (selectedDate > maxDate) {
      toast.error("عذراً، لا يمكن الحجز لأكثر من يومين مقدماً");
      setIsSubmitting(false);
      return;
    }
    if (selectedDate < today) {
      toast.error("تاريخ الحجز لا يمكن أن يكون في الماضي");
      setIsSubmitting(false);
      return;
    }

    // Check for spam/duplicate orders
    const spamResult = await checkOrderSpam({
      orderType: 'reservation',
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      productId: ""
    });

    if (spamResult.isSpam) {
      toast.error(spamResult.message);
      setIsSubmitting(false);
      return;
    }

    const orderItems = mapCartItemsToOrderItems(cart);
    const reservationInfo = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      depositMethod: data.depositMethod,
      notes: data.notes || ''
    };

    const orderData = {
      userId: userProfile?.uid || `guest-${Date.now()}`,
      items: orderItems,
      total: finalTotalAmount,
      couponCode: appliedCoupon?.code || null,
      couponDiscountAmount: couponDiscountAmount,
      status: 'pending',
      type: 'reservation',
      reservationInfo,
      deliveryInfo: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        address: 'استلام من المحل',
        city: 'لا يوجد',
        notes: `حجز موعد: ${data.appointmentDate}`
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderLines = formatOrderLines(orderItems);


    const reservationDetails = [
      `👤 الاسم: ${reservationInfo.fullName}`,
      `📱 الهاتف: ${reservationInfo.phoneNumber}`,
      `📅 التاريخ: ${reservationInfo.appointmentDate}`,
      `⏰ الوقت: ${reservationInfo.appointmentTime}`,
      reservationInfo.notes ? `📝 ملاحظات: ${reservationInfo.notes}` : null,
    ].filter(Boolean).join('\n');

    const message = [
      '📅 طلب حجز منتج',
      '========================',
      orderLines,
      '========================',
      '*تفاصيل الحجز:*',
      reservationDetails,
      '========================',
      appliedCoupon ? `🎟 كود الخصم: ${appliedCoupon.code} (-${formatCurrency(couponDiscountAmount, 'جنيه')})` : null,
      `💰 الإجمالي النهائي: ${formatCurrency(finalTotalAmount, 'جنيه')}`,
      '========================',
      `   سأرسل العربون بعد هذه الرساله *`,

    ].join('\n');

    // Manually call process logic here because resetReservation is involved
    const deductions = cart
      .filter((item) => item.product && item.product.id)
      .map(item => ({
        productId: item.product.id,
        quantityToDeduct: item.quantity
      }));

    try {
      const whatsappNumber = getOrderWhatsAppNumber(settings);
      if (typeof createOrderAndUpdateProductQuantitiesAtomically === 'function') {
        await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
        if (typeof updateProductQuantitiesAtomically === 'function') {
          await updateProductQuantitiesAtomically(deductions);
        }
      }

      if (appliedCoupon?.id) {
        await incrementCouponUsage(appliedCoupon.id);
      }

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      setOrderSuccess({
        isOpen: true,
        type: 'reservation',
        whatsappUrl,
        totalAmount: orderData.total
      });

    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ في حفظ الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date constraints
  const todayDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(todayDate.getDate() + 2);
  const minDateStr = todayDate.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteAlert(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="container py-8">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Breadcrumb>
            <BreadcrumbList className="flex items-center text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {t("navigation.home")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <span className="mx-2 text-muted-foreground">&lt;</span>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">{t("cart.title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </motion.div>

        <h1 className="text-3xl font-bold mb-8">{t("cart.title")}</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Right Column: Cart Items & Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <CardHeader className="bg-gray-50/50 py-4 border-b">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  محتويات السلة ({cart.reduce((acc, item) => acc + item.quantity, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {cart
                    .filter((item) => item.product && item.product.id)
                    .map((item) => {
                      return (
                        <div
                          key={`${item.product.id}-${item.selectedSize?.id || 'no-size'}-${item.selectedAddons.map(a => a.id).sort().join('-')}-${JSON.stringify(item.selectedOptionGroups || [])}`}
                          className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors group"
                        >
                          <div className="relative h-24 w-24 flex-shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
                            {(() => {
                              const availableColors = item.product.color ? item.product.color.split(',').map(c => c.trim()) : [];
                              const colorImageMapping: { [key: string]: string } = {};
                              availableColors.forEach((color, index) => {
                                if (item.product.images && item.product.images[index]) {
                                  colorImageMapping[color] = item.product.images[index];
                                }
                              });
                              const displayImage = item.selectedColor && colorImageMapping[item.selectedColor]
                                ? colorImageMapping[item.selectedColor]
                                : item.product.images[0];
                              return (
                                <img
                                  src={displayImage}
                                  alt={item.product.name}
                                  className="h-full w-full object-contain p-1 cursor-pointer"
                                  onClick={() => navigate(getProductUrl(item.product.id, item.product.name))}
                                />
                              );
                            })()}
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h3
                                  className="font-semibold text-gray-900 md:text-base text-sm line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => navigate(getProductUrl(item.product.id, item.product.name))}
                                >
                                  {item.product.name}
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 -mt-1 -ml-2 transition-colors"
                                  onClick={() => handleDeleteClick(item.product.id)}
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-sm text-gray-500 mt-2 space-y-1.5">
                                {item.selectedSize && (
                                  <p className="flex items-center gap-2">
                                    <span className="w-16">الحجم:</span>
                                    <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">{item.selectedSize.label}</span>
                                  </p>
                                )}
                                {item.selectedColor && (
                                  <p className="flex items-center gap-2">
                                    <span className="w-16">اللون:</span>
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                                      <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: item.selectedColor }} />
                                      <span className="font-medium text-gray-900 text-xs">{getColorByName(item.selectedColor).name}</span>
                                    </span>
                                  </p>
                                )}
                                {item.selectedOptionGroups && item.selectedOptionGroups.length > 0 && (
                                  <div className="flex flex-col gap-1 mt-1 border-t border-gray-100 pt-1">
                                    {item.selectedOptionGroups.map((opt: any, idx: number) => (
                                      <p key={idx} className="flex items-center gap-2">
                                        <span className="w-16 text-gray-400">{opt.groupName}:</span>
                                        <span className="font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded border text-xs">{opt.optionLabel}</span>
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                  <p className="flex items-start gap-2">
                                    <span className="w-16 shrink-0 mt-0.5">الإضافات:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {item.selectedAddons.map(a => (
                                        <span key={a.id} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                                          {a.label}
                                        </span>
                                      ))}
                                    </div>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed border-gray-200">
                              <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none hover:bg-gray-100"
                                  onClick={async () => {
                                    const newQuantity = Math.max(0, item.quantity - 1);
                                    if (newQuantity === 0) handleDeleteClick(item.product.id);
                                    else {
                                      updateCartItemQuantity(
                                        item.product.id,
                                        newQuantity,
                                        item.selectedSize?.id || null,
                                        item.selectedOptionGroups || [],
                                        item.selectedAddons?.map(a => a.id) || [],
                                        item.selectedColor
                                      );
                                    }
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                                </Button>
                                <span className="w-10 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none hover:bg-gray-100"
                                  onClick={async () => {
                                    updateCartItemQuantity(
                                      item.product.id,
                                      item.quantity + 1,
                                      item.selectedSize?.id || null,
                                      item.selectedOptionGroups || [],
                                      item.selectedAddons?.map(a => a.id) || [],
                                      item.selectedColor
                                    );
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                                </Button>
                              </div>
                              <div className="font-bold text-sm md:text-base text-primary flex items-center gap-1">
                                {formatCurrency(item.totalPrice, 'جنيه')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="bg-gray-50/80 p-6 border-t border-gray-100">
                  <div className="space-y-3">
                    <div className="flex justify-between flex-col items-start text-gray-600">
                      <span>إجمالي المنتجات ({cart.reduce((acc, item) => acc + item.quantity, 0)})</span>
                      <div className="flex justify-between w-full items-center gap-2 mt-2">
                        <span className="text-lg font-bold flex flex-col items-start"> المجموع
                          <span className="text-[12px] text-gray-400"> (غير شامل الشحن) </span>
                        </span>
                        <span className={`text-xl font-bold ${appliedCoupon ? 'line-through text-gray-400' : ''}`}>
                          {formatCurrency(totalAmount, 'جنيه')}
                        </span>
                      </div>
                      {currentShippingCost !== 0 && (
                        <div className="flex justify-between w-full items-center gap-2 mt-2">
                          <span className="text-lg font-bold"> مصاريف الشحن </span>
                          <span className="text-xl font-bold">
                            {typeof currentShippingCost === 'number' ? formatCurrency(currentShippingCost as number, 'جنيه') : currentShippingCost}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Coupon Toggle + Input Area */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      {!appliedCoupon ? (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setIsCouponFieldOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Ticket className="w-4 h-4 text-purple-500" />
                              <span className="text-sm font-bold text-gray-700">لديك كوبون خصم؟</span>
                            </div>
                            <CheckCircle className={`w-4 h-4 transition-all duration-200 ${isCouponFieldOpen ? 'rotate-45 text-red-400' : 'text-gray-300'}`} />
                          </button>

                          {isCouponFieldOpen && (
                            <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    placeholder="رمز الكوبون"
                                    value={couponInput}
                                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                                    className={`h-10 bg-white uppercase text-center font-bold tracking-widest ${couponError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                                    autoFocus
                                  />
                                  {couponError && <span className="absolute -bottom-5 right-1 text-[10px] text-red-500 font-medium">{couponError}</span>}
                                </div>
                                <Button
                                  onClick={handleApplyCoupon}
                                  disabled={isCouponLoading || !couponInput.trim()}
                                  className="h-10 px-5 bg-purple-700 text-white font-bold hover:bg-purple-800"
                                >
                                  {isCouponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تفعيل'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Coupon badge */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <div>
                                <div className="font-bold text-green-800 text-sm">تم تفعيل كوبون خصم!</div>
                                <div className="font-mono text-xs text-green-600 font-bold tracking-widest">{appliedCoupon.code}</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs font-bold">
                              إلغاء
                            </Button>
                          </div>

                          {/* Price breakdown table */}
                          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden text-sm">
                            <div className="flex justify-between items-center px-4 py-2.5">
                              <span className="text-gray-500">المجموع الأصلي</span>
                              <span className="font-bold text-gray-800">{formatCurrency(totalAmount, 'جنيه')}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2.5 bg-green-50">
                              <span className="text-green-700 font-medium flex items-center gap-1.5">
                                <Tag className="w-3 h-3" />
                                خصم الكوبون
                                {appliedCoupon.type === 'percentage' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold ml-1">{appliedCoupon.value}%</span>
                                )}
                              </span>
                              <span className="font-black text-green-700">- {formatCurrency(couponDiscountAmount, 'جنيه')}</span>
                            </div>
                            {currentShippingCost !== 0 && (
                              <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50">
                                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                                  <Truck className="w-3 h-3" />
                                  مصاريف الشحن
                                </span>
                                <span className="font-black text-gray-800">
                                  {typeof currentShippingCost === 'number' ? formatCurrency(currentShippingCost as number, 'جنيه') : currentShippingCost}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center px-4 py-3 bg-blue-900">
                              <span className="font-bold text-white text-base">الإجمالي بعد الخصم</span>
                              <span className="text-2xl font-black text-white">{formatCurrency(finalTotalAmount, 'جنيه')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    <Button
                      variant="outline"
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 transition-colors h-10 text-sm"
                      onClick={() => setShowClearCartAlert(true)}
                    >
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      مسح السلة بالكامل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Left Column: Checkout Forms */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Tabs defaultValue="online_purchase" onValueChange={(v) => setOrderType(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 h-12 p-1 bg-gray-100/80">
                  <TabsTrigger value="online_purchase" className="h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                    <Truck className="h-4 w-4 mr-2" />
                    شراء أونلاين
                  </TabsTrigger>
                  <TabsTrigger value="reservation" className="h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                    <CalendarClock className="h-4 w-4 mr-2" />
                    حجز منتج
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="online_purchase" className="space-y-4">

                  <Accordion type="multiple" className="w-full mb-6">


                    <AccordionItem value="payment" className="bg-purple-50/50 rounded-lg border border-purple-100 shadow-sm px-4">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex gap-3 items-center text-purple-900">
                          <div className="p-2 bg-white rounded-lg h-fit shadow-sm border border-purple-100">
                            <MessageCircle className="h-5 w-5 text-purple-600" />
                          </div>
                          <span className="font-bold text-sm">طرق الدفع</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-1 pb-2">
                          <div className="bg-white/60 p-3 rounded border border-purple-100/50 space-y-2">
                            <div className="flex items-center gap-2 font-medium text-purple-800 text-sm">
                              <Phone className="h-4 w-4" /> فودافون كاش / انستا باي
                            </div>
                            <p className="text-lg font-bold font-mono dir-ltr text-left text-purple-700 pl-6 select-all">01080027827</p>
                          </div>
                          <div className="text-xs text-purple-700 font-medium bg-purple-100/50 p-2 rounded flex items-start gap-2">
                            <span className="mt-0.5 block w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            يتم أخذ سكرين شوت للتحويل وإرساله على الواتساب لنفس الرقم لتأكيد الطلب.
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <form onSubmit={handleSubmit(onDeliverySubmit)} className="space-y-6">

                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                        <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" /> بيانات العميل وعنوان التوصيل
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-xs font-semibold text-gray-600">الاسم بالكامل <span className="text-red-500">*</span></Label>
                            <Input
                              id="fullName"
                              placeholder="أدخل اسمك الكامل"
                              {...register('fullName', { required: 'هذا الحقل إلزامي' })}
                              className={errors.fullName ? 'border-red-500' : ''}
                            />
                            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-xs font-semibold text-gray-600">رقم الهاتف <span className="text-red-500">*</span></Label>
                            <Input
                              id="phoneNumber"
                              type="tel"
                              placeholder="01XXXXXXXXX"
                              {...register('phoneNumber', {
                                required: 'هذا الحقل إلزامي',
                                pattern: {
                                  value: /^01[0-9]{9,}$/,
                                  message: 'رقم هاتف غير صحيح'
                                }
                              })}
                              className={errors.phoneNumber ? 'border-red-500' : ''}
                            />
                            {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-xs font-semibold text-gray-600">المحافظة <span className="text-red-500">*</span></Label>
                          <select
                            id="city"
                            {...register('city', { required: 'هذا الحقل إلزامي' })}
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.city ? 'border-red-500' : ''}`}
                          >
                            <option value="">اختر المحافظة</option>
                            {STORE_GOVERNORATES.map(gov => (
                              <option key={gov.name} value={gov.name}>
                                {gov.name} - {gov.shippingCost}
                              </option>
                            ))}
                          </select>
                          {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address" className="text-xs font-semibold text-gray-600">العنوان بالتفصيل <span className="text-red-500">*</span></Label>
                          <Input
                            id="address"
                            placeholder="الشارع، رقم العمارة، الشقة"
                            {...register('address', { required: 'هذا الحقل إلزامي' })}
                            className={errors.address ? 'border-red-500' : ''}
                          />
                          {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes" className="text-xs font-semibold text-gray-600">ملاحظات <span className="text-gray-400 text-xs">(اختياري)</span></Label>
                          <Textarea
                            id="notes"
                            placeholder="تعليمات إضافية للتوصيل..."
                            className="resize-none min-h-[80px]"
                            {...register('notes')}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="w-full h-12 text-lg bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 mt-2 text-white"
                    >
                      {isSubmitting ? 'جاري الإرسال...' : (
                        <span className="flex items-center gap-2">
                          <FaWhatsapp className="h-5 w-5" /> إتمام الطلب عبر واتساب
                        </span>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="reservation" className="space-y-4">
                  <form onSubmit={handleSubmitReservation(handleReservationSubmit)} className="space-y-6">

                    <Accordion type="single" collapsible className="w-full mb-6">
                      <AccordionItem value="deposit" className="bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex gap-3 items-center text-blue-900">
                            <div className="p-2 bg-white rounded-lg h-fit shadow-sm border border-blue-100">
                              <AlertCircle className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-bold text-sm">تأكيد جدية الحجز</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-1 pb-2">
                            <p className="text-blue-800 text-sm leading-relaxed">
                              لضمان الحجز، يفضل دفع مبلغ <span className="font-bold text-blue-700">200 جنيه</span> كجدية حجز.
                            </p>
                            <div className="bg-white/60 p-3 rounded border border-blue-100/50 space-y-2">
                              <p className="font-semibold text-blue-800 flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4" /> طرق الدفع المتاحة:
                              </p>
                              <div className="grid gap-1 pr-6 text-sm">
                                <p className="font-medium text-blue-900">فودافون كاش / انستا باي</p>
                                <p className="text-lg font-bold font-mono dir-ltr text-left text-blue-700 select-all">01080027827</p>
                              </div>
                            </div>
                            <div className="text-xs text-blue-700 font-medium bg-blue-100/50 p-2 rounded">
                              بعد التحويل، يرجى إرسال صورة التحويل (سكرين شوت) على نفس الرقم عبر واتساب.
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                        <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-primary" /> بيانات الحجز والموعد
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="res-fullName" className="text-xs font-semibold text-gray-600">الاسم بالكامل <span className="text-red-500">*</span></Label>
                            <Input
                              id="res-fullName"
                              placeholder="الاسم"
                              {...registerReservation("fullName", { required: "مطلوب" })}
                            />
                            {reservationErrors.fullName && <p className="text-xs text-red-500">{reservationErrors.fullName.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="res-phone" className="text-xs font-semibold text-gray-600">رقم الهاتف <span className="text-red-500">*</span></Label>
                            <Input
                              id="res-phone"
                              placeholder="01XXXXXXXXX"
                              {...registerReservation("phoneNumber", {
                                required: "مطلوب",
                                pattern: { value: /^01[0-9]{9,}$/, message: "رقم غير صحيح" }
                              })}
                            />
                            {reservationErrors.phoneNumber && <p className="text-xs text-red-500">{reservationErrors.phoneNumber.message}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">التاريخ <span className="text-red-500">*</span></Label>
                            <Input
                              type="date"
                              min={minDateStr}
                              max={maxDateStr}
                              {...registerReservation("appointmentDate", { required: "مطلوب" })}
                            />
                            {reservationErrors.appointmentDate && <p className="text-xs text-red-500">مطلوب</p>}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-600">الوقت <span className="text-red-500">*</span></Label>
                            <Input
                              type="time"
                              {...registerReservation("appointmentTime", { required: "مطلوب" })}
                            />
                            {reservationErrors.appointmentTime && <p className="text-xs text-red-500">مطلوب</p>}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <Label className="text-xs font-semibold text-gray-600">ملاحظات إضافية <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                          <Textarea
                            placeholder="تفاصيل أخرى..."
                            {...registerReservation("notes")}
                            className="min-h-[60px]"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      type="submit"
                      disabled={!isReservationValid || isSubmitting}
                      className="w-full h-12 text-lg bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 mt-2 text-white"
                    >
                      {isSubmitting ? 'جاري الحجز...' : (
                        <span className="flex items-center gap-2">
                          <FaWhatsapp className="h-5 w-5" /> تأكيد الحجز واتساب
                        </span>
                      )}
                    </Button>

                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المنتج من السلة؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (productToDelete) {
                  try {
                    removeFromCart(productToDelete);
                    toast.success("تم حذف المنتج من السلة");
                  } catch (error) {
                    toast.error("خطأ في حذف المنتج");
                  }
                }
                setShowDeleteAlert(false);
                setProductToDelete(null);
              }}>
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Cart Confirmation Dialog */}
        <AlertDialog open={showClearCartAlert} onOpenChange={setShowClearCartAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>مسح السلة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من مسح جميع المنتجات من السلة؟ سيتم استعادة الكميات المحفوظة في المخزن.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                try {
                  await clearCart();
                  setShowClearCartAlert(false);
                  toast.success("تم مسح السلة");
                } catch (error) {
                  console.error('Error clearing cart:', error);
                  toast.error("فشل في مسح السلة");
                }
              }}>
                مسح
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ProductModal
          product={selectedProduct}
          open={modalOpen}
          onOpenChange={setModalOpen}
          hideAddToCart={true}
        />
        <LoginRequiredModal
          open={showLoginRequiredModal}
          onOpenChange={setShowLoginRequiredModal}
        />

        {/* Success Modal */}
        <Dialog open={orderSuccess.isOpen} onOpenChange={(open) => {
          if (!open) {
            setOrderSuccess(prev => ({ ...prev, isOpen: false }));
            reset();
            resetReservation();
            useStore.getState().clearCart(true);
            useStore.getState().loadProducts();
            navigate('/products');
          }
        }}>
          <DialogContent
            className="w-[calc(100vw-2rem)] sm:max-w-md mx-auto p-0 overflow-hidden rounded-2xl border-0"
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.25)' }}
          >
            {/* Gradient header */}
            <div className="relative bg-gradient-to-br from-[#0f2a4e] via-[#1a3f6f] to-[#0d3460] px-6 pt-10 pb-16 text-center overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />

              {/* Animated checkmark */}
              <div
                className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 0 0 8px rgba(34,197,94,0.2), 0 0 0 16px rgba(34,197,94,0.08)'
                }}
              >
                <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>

              <h2 className="text-white text-2xl sm:text-3xl font-bold mb-2 leading-snug">
                تم الحجز بنجاح! 🎉
              </h2>
              <p className="text-blue-200 text-sm sm:text-base leading-relaxed px-2">
                سنتواصل معاك قريباً بعد دفع عربون <span className="font-bold text-white bg-blue-500/30 px-1.5 py-0.5 rounded">300 ج</span>
              </p>
            </div>

            {/* White card pulled up over the gradient */}
            <div className="relative -mt-8 mx-4 bg-white rounded-2xl shadow-lg p-5 space-y-4">

              {/* Payment badges */}
              <div className="space-y-4 pt-2">
                <p className="text-sm font-bold text-gray-800 text-center mb-2">
                  اختر طريقة الدفع :
                </p>

                <div className="flex justify-center items-center gap-6">
                  {/* Vodafone Cash */}
                  <div className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center text-white shadow-xl border-2 border-red-100" style={{ backgroundImage: 'linear-gradient(to right, #E60000, #ff3333)' }}>
                    <span className="text-[11px] font-black leading-tight drop-shadow-sm">Vodafone</span>
                    <span className="text-[13px] font-black leading-tight drop-shadow-sm">Cash</span>
                  </div>

                  {/* InstaPay */}
                  <div className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center text-white shadow-xl border-2 border-purple-100" style={{ backgroundImage: 'linear-gradient(to right, #6A0E7E, #9b28b5)' }}>
                    <span className="text-[14px] font-black leading-tight tracking-wide drop-shadow-sm">InstaPay</span>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 mt-4 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">الرقم الموحد للدفع</p>
                    <p dir="ltr" className="font-bold font-mono text-xl text-gray-900 tracking-widest select-all">01080027827</p>
                  </div>
                  <button onClick={() => {
                    navigator.clipboard.writeText('01080027827');
                    toast.success('تم نسخ الرقم بنجاح');
                  }} className="bg-white hover:bg-gray-100 border border-gray-200 p-2.5 rounded-lg transition-colors text-gray-700 shadow-sm active:scale-95">
                    <ClipboardCopy className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-center text-[13px] text-gray-600 font-medium pb-2">
                  يفضل إرسال رسالة بعملية الدفع عبر واتساب
                </p>
              </div>

              {/* WhatsApp CTA */}
              <a
                href={orderSuccess.whatsappUrl || `https://wa.me/${getOrderWhatsAppNumber(settings)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
              >
                <MessageCircle className="w-5 h-5" />
                تأكيد الطلب وإرسال التحويل
              </a>

              {/* Close button */}
              <button
                onClick={() => {
                  setOrderSuccess(prev => ({ ...prev, isOpen: false }));
                  reset();
                  resetReservation();
                  useStore.getState().clearCart(true);
                  useStore.getState().loadProducts();
                  navigate('/products');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                العودة للمتجر
              </button>
            </div>

            {/* Bottom padding */}
            <div className="h-4" />
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default Cart;

function getCartItemPrice(item: any) {
  if (typeof item?.unitFinalPrice === "number") {
    return item.unitFinalPrice;
  }
  const now = new Date();
  const product = item?.product || {};
  let price = Number(product.price ?? 0);
  const hasDiscount =
    product.specialOffer &&
    ((typeof product.discountPrice === "number" && product.discountPrice > 0) ||
      (typeof product.discountPercentage === "number" && product.discountPercentage > 0));

  if (hasDiscount) {
    if (typeof product.discountPrice === "number" && product.discountPrice > 0) {
      price = Number(product.discountPrice);
    } else if (typeof product.discountPercentage === "number") {
      const discount = Number(product.discountPercentage);
      price = price * (1 - discount / 100);
    }
  }

  if (item?.selectedSize?.price != null) {
    price += Number(item.selectedSize.price);
  }

  if (Array.isArray(item?.selectedAddons)) {
    price += item.selectedAddons.reduce((sum: number, addon: any) => {
      return sum + Number(addon.price_delta ?? addon.price ?? 0);
    }, 0);
  }
  return Math.round(price * 100) / 100;
}

async function clearCart(): Promise<void> {
  const store = useStore.getState();
  const currentCart = store.cart ?? [];
  if (currentCart.length === 0) {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    }
    return;
  }
  const restorePayload = currentCart
    .filter((item: any) => item.product && item.product.id)
    .map((item: any) => ({
      productId: item.product.id,
      quantityToRestore: item.quantity,
    }));
  const negativeDeductPayload = currentCart
    .filter((item: any) => item.product && item.product.id)
    .map((item: any) => ({
      productId: item.product.id,
      quantityToDeduct: -item.quantity,
    }));

  try {
    const lib = await import("@/lib/firebase");
    if (typeof lib.restoreProductQuantitiesAtomically === "function") {
      try {
        await lib.restoreProductQuantitiesAtomically(restorePayload);
      } catch {
        await lib.restoreProductQuantitiesAtomically(restorePayload as any);
      }
    } else if (typeof lib.updateProductQuantitiesAtomically === "function") {
      await lib.updateProductQuantitiesAtomically(negativeDeductPayload);
    }
  } catch (err) {
    console.warn("clearCart: failed to restore quantities atomically", err);
  } finally {
    if (typeof store.clearCart === "function") {
      store.clearCart();
    } else if (typeof (store as any).setCart === "function") {
      (store as any).setCart([]);
    } else if (typeof (store as any).removeAll === "function") {
      (store as any).removeAll();
    }
  }
}
