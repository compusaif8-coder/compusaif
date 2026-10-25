import { useParams, useNavigate } from "react-router-dom";
import { SEOHelmet } from "@/components/SEOHelmet";
import seoData from "@/constants/seo.json";
import { useStore } from "@/store/useStore";
import { Product, ProductSize, ProductAddon } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";
import { ProductModal } from "@/components/ProductModal";
import { ProductOptions, CheckoutFormData } from "@/components/ProductOptions";
import { useAuth } from "@/contexts/AuthContext";
import { createOrderAndUpdateProductQuantitiesAtomically } from '@/lib/firebase';
import { checkOrderSpam } from '@/lib/spamProtection';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { analytics, trackProductView, trackPurchase } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { extractProductId, getProductUrl, generateSlug } from "@/utils/url";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { getOrderWhatsAppNumber } from "@/utils/whatsapp";
import {
  ShoppingCart,
  Share2,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Package,
  Battery,
  HardDrive,
  Clock,
  CheckCircle,
  Monitor,
  Cpu,
  CircuitBoard,
  Play,
  Film,
  Settings2,
  ClipboardCopy,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/utils/format";
import { commonColors, getColorByName } from "@/constants/colors";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createPortal } from "react-dom";
import { SpecsDisplay } from "@/components/SpecsDisplay";
import { STORE_GOVERNORATES } from '@/constants/store';


const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { settings } = useSiteSettings();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showShippingPolicy, setShowShippingPolicy] = useState(false);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedOptionGroups, setSelectedOptionGroups] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchaseVisible, setIsPurchaseVisible] = useState(false);
  const [isSpecsVisible, setIsSpecsVisible] = useState(false);
  const [isBuyButtonManuallyHidden, setIsBuyButtonManuallyHidden] = useState(false);
  const [isSpecsButtonManuallyHidden, setIsSpecsButtonManuallyHidden] = useState(false);

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

  // Special Offer Countdown State
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const products = useStore((state) => state.products);
  const loading = useStore((state) => state.loading);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartItemQuantity = useStore(
    (state) => state.updateCartItemQuantity
  );
  const getCartTotal = useStore((state) => state.getCartTotal);
  const getCartItemPrice = useStore((state) => state.getCartItemPrice);
  const updateProductQuantity = useStore((state) => state.updateProductQuantity);

  // Find current product
  const actualId = extractProductId(id);
  const product = products.find((p) =>
    p.id === id ||
    p.id === actualId ||
    generateSlug(p.name) === id ||
    generateSlug(p.name) === actualId ||
    (p as any).slug === id ||
    (p as any).slug === actualId
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Parse available colors and create color-image mapping
  const availableColors = useMemo(() =>
    product?.color ? product.color.split(',').map(c => c.trim()) : [],
    [product?.color]);

  // Ref for the observer to persist across renders
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset manual hide state when product changes
  useEffect(() => {
    setIsBuyButtonManuallyHidden(false);
    setIsSpecsButtonManuallyHidden(false);

    // Scroll to top ONLY when navigating to a new product
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Handle loading state and analytics
  useEffect(() => {
    if (products.length > 0) {
      if (product) {
        setIsLoading(false);
        try {
          sessionStorage.setItem('current_product', JSON.stringify({
            id: product.id,
            name: product.name,
            slug: product.id
          }));
        } catch (e) {
          console.warn('Failed to store product in sessionStorage:', e);
        }

        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/product/')) {
          // Debounce analytics to avoid multiple calls
          const trackTimeout = setTimeout(() => {
            analytics.trackPageView(currentPath, product.name).catch(console.error);
            trackProductView(product.id, product.name, product.discountPrice || product.price, product.category);
          }, 1000);
          return () => clearTimeout(trackTimeout);
        }
      } else {
        const redirectTimeout = setTimeout(() => navigate("/products"), 100);
        return () => clearTimeout(redirectTimeout);
      }
    }
  }, [products, product, navigate, id, location]);

  // Optimized IntersectionObserver
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'checkout-form-section') {
          setIsPurchaseVisible(entry.isIntersecting);
        }
        if (entry.target.id === 'specs-section') {
          setIsSpecsVisible(entry.isIntersecting);
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: "-50px 0px 0px 0px"
    });

    const purchaseSection = document.getElementById('checkout-form-section');
    const specsSection = document.getElementById('specs-section');

    if (purchaseSection) observerRef.current.observe(purchaseSection);
    if (specsSection) observerRef.current.observe(specsSection);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, product]); // Re-run only when loading finishes or product changes

  // Special Offer Countdown Effect
  useEffect(() => {
    if (!product?.specialOffer || !product?.offerEndsAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(product.offerEndsAt!).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [product?.specialOffer, product?.offerEndsAt]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Create mapping between colors and images
  const colorImageMapping = useMemo(() => {
    const mapping: { [key: string]: string } = {};
    availableColors.forEach((color, index) => {
      if (product?.images && product.images[index]) {
        mapping[color] = product.images[index];
      }
    });
    return mapping;
  }, [availableColors, product?.images]);

  // Combine videos and images into a single media array
  const mediaItems = useMemo(() => {
    const videos = (product?.videoUrls || []).map(url => ({ type: 'video' as const, url }));
    const images = (product?.images || []).map(url => ({ type: 'image' as const, url }));
    return [...videos, ...images];
  }, [product?.videoUrls, product?.images]);

  // Get current image/video based on selected image index
  const currentMedia = useMemo(() => {
    return mediaItems[selectedImage] || mediaItems[0];
  }, [selectedImage, mediaItems]);

  const currentImage = currentMedia?.url;
  const isCurrentVideo = currentMedia?.type === 'video';

  // Helper to check if addons match
  const areAddonsMatching = useCallback((itemAddons: ProductAddon[], targetAddons: ProductAddon[]) => {
    if ((!itemAddons || itemAddons.length === 0) && (!targetAddons || targetAddons.length === 0)) return true;
    if (!itemAddons || !targetAddons) return false;
    if (itemAddons.length !== targetAddons.length) return false;
    const itemAddonIds = itemAddons.map(a => a.id).sort();
    const targetAddonIds = targetAddons.map(a => a.id).sort();
    return itemAddonIds.every((id, index) => id === targetAddonIds[index]);
  }, []);

  // Check if product is in cart (considering selected size, color AND addons)
  const cartItem = useMemo(() => cart.find((item) =>
    item.product &&
    item.product.id === id &&
    (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
    (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor) &&
    areAddonsMatching(item.selectedAddons || [], selectedAddons || []) &&
    JSON.stringify(item.selectedOptionGroups || []) === JSON.stringify(selectedOptionGroups || [])
  ), [cart, id, selectedSize, selectedColor, selectedAddons, selectedOptionGroups, areAddonsMatching]);

  // Local quantity for products not in cart
  const [localQuantity, setLocalQuantity] = useState(1);

  // Reset local quantity when selections change and item is not in cart
  useEffect(() => {
    if (!cartItem) {
      setLocalQuantity(1);
    }
  }, [selectedSize, selectedColor, selectedAddons, selectedOptionGroups, cartItem]);

  // Determine actual quantity to display
  const currentQuantity = cartItem ? cartItem.quantity : localQuantity;

  const handleQuantityChange = async (newQuantity: number) => {
    if (cartItem) {
      // If item is in cart, update cart immediately
      try {
        await updateCartItemQuantity(
          product!.id,
          newQuantity,
          selectedSize?.id || null,
          selectedOptionGroups,
          selectedAddons.map(a => a.id),
          selectedColor
        );
      } catch (error) {
        toast.error("خطأ في تحديث الكمية");
      }
    } else {
      // If not in cart, just update local state
      setLocalQuantity(newQuantity);
    }
  };

  // Find suggested products (same category, excluding current product)
  const suggestedProducts = products
    .filter(
      (p) =>
        p.category === product?.category &&
        p.id !== product?.id &&
        !p.isArchived
    )
    .slice(0, 4);

  const [undiscountedPrice, setUndiscountedPrice] = useState(0);

  useEffect(() => {
    if (product) {
      // Initialize final price with base price or first size price
      let basePrice = product.price;
      if (product.sizes && product.sizes.length > 0) {
        basePrice = product.sizes[0].price;
      }

      // Initialize undiscounted price
      setUndiscountedPrice(basePrice);

      // Apply special offer discount to the calculated base price
      let finalPrice = basePrice;
      if (product.specialOffer) {
        if (product.discountPrice) {
          // Use fixed discount amount (original price - discountPrice) as saving
          // This ensures the saving is always the fixed amount regardless of selected options
          const discountAmount = Math.max(0, product.price - product.discountPrice);
          finalPrice = Math.max(0, basePrice - discountAmount);
        } else if (product.discountPercentage) {
          // Fallback: use percentage discount only if no discountPrice is set
          const discountAmount = (basePrice * product.discountPercentage) / 100;
          finalPrice = basePrice - discountAmount;
        }
      }

      setFinalPrice(finalPrice);

      // Set first color as default if available and no color is selected
      if (availableColors.length > 0 && !selectedColor) {
        setSelectedColor(availableColors[0]);
      }
    }
  }, [product, availableColors, selectedColor]);

  // Handle selection changes from ProductOptions component
  const handleSelectionChange = useCallback((
    newSelectedSize: ProductSize | null,
    newSelectedOptionGroups: any[],
    newSelectedAddons: ProductAddon[],
    calculatedPrice: number
  ) => {
    setSelectedSize(newSelectedSize);
    setSelectedOptionGroups(newSelectedOptionGroups);
    setSelectedAddons(newSelectedAddons);
    setUndiscountedPrice(calculatedPrice);

    // Apply special offer discount to the calculated price (including sizes and addons)
    let finalPrice = calculatedPrice;
    if (product?.specialOffer) {
      if (product.discountPrice) {
        // Use fixed discount amount (original price - discountPrice) as saving
        // This ensures the saving is always the fixed amount regardless of selected options
        const discountAmount = Math.max(0, product.price - product.discountPrice);
        finalPrice = Math.max(0, calculatedPrice - discountAmount);
      } else if (product.discountPercentage) {
        // Fallback: use percentage discount only if no discountPrice is set
        const discountAmount = (calculatedPrice * product.discountPercentage) / 100;
        finalPrice = calculatedPrice - discountAmount;
      }
    }

    setFinalPrice(finalPrice);
  }, [product]);

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المنتج...</p>
        </div>
      </div>
    );
  }

  // Show 404 if product not found after loading is complete
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-8">المنتج غير موجود</p>
          <Button onClick={() => navigate("/products")}>
            العودة إلى المنتجات
          </Button>
        </div>
      </div>
    );
  }

  // SEO: Build dynamic meta info
  const plainDescription = (product.description || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const baseDescription = plainDescription || `${product.brand} - ${product.category}`;
  const metaDescription = baseDescription.length > 160
    ? `${baseDescription.slice(0, 157)}...`
    : baseDescription;

  const categorySeo = product.category === 'أجهزة All in One' ? seoData.categories.allInOne :
    product.category === 'كيسات كمبيوتر' ? seoData.categories.desktops :
      seoData.categories.laptops;

  const optimizedTitle = `${product.name} ${product.brand ? `- ${product.brand}` : ''} | استيراد بحالة الزيرو | ${seoData.global.siteName}`;
  const optimizedKeywords = `${product.name}, ${product.brand}, ${product.category}, ${product.subcategory || ''}, ${categorySeo?.keywords || seoData.global.defaultKeywords}`;

  const canonicalUrl = `${window.location.origin}${getProductUrl(product.id, product.name)}`;

  const handleAddToCart = async () => {
    if (!product) return;

    const availableQuantity = product.wholesaleInfo?.quantity || 0;
    if (availableQuantity <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("يرجى اختيار حجم المنتج أولاً");
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      toast.error("يرجى اختيار لون المنتج أولاً");
      return;
    }

    try {
      await addToCart(
        product,
        currentQuantity,
        selectedSize,
        selectedOptionGroups,
        selectedAddons,
        selectedColor
      );
      toast.success(`${t("cart.productAdded")}: ${product.name}`, {
        description: t("cart.whatWouldYouLikeToDo"),
        action: {
          label: t("cart.checkout"),
          onClick: () => navigate("/cart"),
        },
        cancel: {
          label: t("cart.continueShopping"),
          onClick: () => { },
        },
        duration: 5000,
        dismissible: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الإضافة للسلة");
    }
  };

  const handleBuy = async (quantity: number, formData: CheckoutFormData) => {
    if (!product) return;

    // Check if product is out of stock
    const availableQuantity = product.wholesaleInfo?.quantity || 0;
    if (availableQuantity <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error("يرجى اختيار حجم المنتج أولاً");
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      toast.error("يرجى اختيار لون المنتج أولاً");
      return;
    }

    // Process Order
    try {
      const totalAmount = finalPrice * quantity;

      const rawShippingCost = formData.orderType === 'online_purchase'
        ? STORE_GOVERNORATES.find(g => g.name === formData.governorate)?.shippingCost || 0
        : 0;

      const numericShippingCost = typeof rawShippingCost === 'number' ? rawShippingCost : 0;

      const finalTotalAmount = Math.max(0, totalAmount - (formData.couponDiscountAmount || 0)) + numericShippingCost;

      const orderItem = {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        price: finalPrice,
        totalPrice: totalAmount,
        image: product.images[0],
        selectedSize: selectedSize ? {
          id: selectedSize.id,
          label: selectedSize.label,
          price: selectedSize.price
        } : null,
        selectedOptionGroups: selectedOptionGroups || [],
        selectedAddons: selectedAddons.map(addon => ({
          id: addon.id,
          label: addon.label,
          price_delta: addon.price_delta
        })),
        selectedColor: selectedColor
      };

      const orderData = {
        userId: userProfile?.uid || `guest-${Date.now()}`,
        items: [orderItem],
        total: finalTotalAmount,
        couponCode: formData.couponCode || null,
        couponDiscountAmount: formData.couponDiscountAmount || 0,
        status: 'pending',
        type: formData.orderType,
        deliveryInfo: {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.orderType === 'reservation' ? 'استلام من المحل' : formData.address,
          city: formData.orderType === 'reservation' ? 'لا يوجد' : formData.governorate,
          notes: formData.notes || ''
        },
        reservationInfo: formData.orderType === 'reservation' ? {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          appointmentDate: formData.appointmentDate || new Date().toISOString().split('T')[0], // Default to today if not specified in simplified form
          appointmentTime: formData.appointmentTime || '12:00', // Default
          notes: formData.notes || ''
        } : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deductions = [{
        productId: product.id,
        quantityToDeduct: quantity
      }];

      // Check for spam/duplicate orders
      const spamResult = await checkOrderSpam({
        orderType: formData.orderType === 'reservation' ? 'reservation' : 'online_purchase',
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        productId: product.id,
        selectedSize: selectedSize,
        selectedOptionGroups: selectedOptionGroups,
        selectedAddons: selectedAddons,
        selectedColor: selectedColor
      });

      if (spamResult.isSpam) {
        toast.error(spamResult.message);
        return;
      }

      // Save to Firebase
      await createOrderAndUpdateProductQuantitiesAtomically(orderData, deductions);

      // Track Purchase (GA4 + Meta Pixel & CAPI Deduplicated)
      trackPurchase(orderData.userId, finalTotalAmount, orderData.items);

      // Construct WhatsApp Message
      const whatsappNumber = getOrderWhatsAppNumber(settings);
      const orderLines = [
        `1. ${product.name}`,
        `   الكمية: ${quantity}`,
        selectedSize ? `   الحجم: ${selectedSize.label}` : '',
        selectedColor ? `   اللون: ${getColorByName(selectedColor).name}` : '',
        selectedOptionGroups.length > 0 ? `   المواصفات المختارة:\n${selectedOptionGroups.map(opt => `      - ${opt.groupName}: ${opt.optionLabel} (+${formatCurrency(opt.extraPrice, 'جنيه')})`).join('\n')}` : '',
        selectedAddons.length > 0 ? `   الإضافات:\n${selectedAddons.map(addon => `      - ${addon.label} (+${formatCurrency(addon.price_delta, 'جنيه')})`).join('\n')}` : '',
        `   السعر: ${formatCurrency(totalAmount, 'جنيه')}`
      ].filter(Boolean).join('\n');

      const customerInfo = formData.orderType === 'reservation' ?
        [
          `👤 الاسم: ${formData.fullName}`,
          `📱 الهاتف: ${formData.phoneNumber}`,
          `📅 التاريخ: ${formData.appointmentDate}`,
          `⏰ الوقت: ${formData.appointmentTime}`,
          `🏷 النوع: حجز`,
          formData.notes ? `📝 ملاحظات: ${formData.notes}` : null
        ].filter(Boolean).join('\n') :
        [
          `👤 الاسم: ${formData.fullName}`,
          `🏙 المحافظة: ${formData.governorate}`,
          `📍 العنوان: ${formData.address}`,
          `📱 الهاتف: ${formData.phoneNumber}`,
          `🏷 النوع: شراء أونلاين`,
          formData.notes ? `📝 ملاحظات: ${formData.notes}` : null
        ].filter(Boolean).join('\n');

      const message = [
        formData.orderType === 'reservation' ? '📅 طلب حجز جديد' : '🚀 طلب شراء جديد',
        '========================',
        orderLines,
        '========================',
        '*بيانات العميل:*',
        customerInfo,
        '========================',
        formData.couponCode ? `🎟 كود الخصم: ${formData.couponCode} (-${formatCurrency(formData.couponDiscountAmount || 0, 'جنيه')})` : null,
        typeof rawShippingCost === 'number' && rawShippingCost > 0 ? `🚚 مصاريف الشحن: ${formatCurrency(rawShippingCost, 'جنيه')}` : typeof rawShippingCost === 'string' ? `🚚 مصاريف الشحن: ${rawShippingCost}` : null,
        `💰 الإجمالي النهائي: ${formatCurrency(finalTotalAmount, 'جنيه')}`,
        '========================',
        formData.orderType === 'reservation'
          ? 'يرجى تأكيد الحجز وإرسال العربون.'
          : 'يرجى تأكيد الطلب وتحديد مصاريف الشحن.'
      ].filter(Boolean).join('\n');

      // Show Success UI
      // toast.success("سيتم التواصل معك قريبًا لتأكيد الطلب");

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      setOrderSuccess({
        isOpen: true,
        type: formData.orderType === 'reservation' ? 'reservation' : 'online',
        governorate: formData.governorate,
        whatsappUrl,
        totalAmount: finalTotalAmount
      });

    } catch (error) {
      console.error('Order Error:', error);
      toast.error('حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة لاحقاً.');
    }
  };



  const handleShare = () => {
    const productUrl = `${window.location.origin}${getProductUrl(product.id, product.name)}`;

    // Build selection info
    const selectionInfo = [];
    if (selectedSize) {
      selectionInfo.push(`📐 الحجم: ${selectedSize.label}`);
    }
    if (selectedColor) {
      selectionInfo.push(`🎨 اللون: ${getColorByName(selectedColor).name}`);
    }
    if (selectedOptionGroups.length > 0) {
      selectedOptionGroups.forEach(opt => {
        selectionInfo.push(`🔧 ${opt.groupName}: ${opt.optionLabel}`);
      });
    }
    if (selectedAddons.length > 0) {
      selectionInfo.push(`➕ الإضافات: ${selectedAddons.map(addon => addon.label).join(', ')}`);
    }

    const message = [
      `🛍️ *${product.name}*`,
      `🏷️ ${t("products.brand")}: ${product.brand}`,
      ...selectionInfo,
      `💰 السعر النهائي: ${formatCurrency(finalPrice, 'جنيه')}`,
      product.specialOffer
        ? `🎉 ${t("products.specialOffer")}`
        : null,
      product.description
        ? `📝 ${t("products.description")}: ${product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...`
        : null,
      product.category
        ? `📦 ${t("products.category")}: ${product.category}`
        : null,
      `\n🔗 ${t("common.viewProduct")}: ${productUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const handleCopySpecs = async () => {
    if (!product) return;

    // Determine Base Price considering active discounts
    const currentPrice = product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price - (product.price * product.discountPercentage) / 100
        : product.price);

    const textLines = [
      `💻 ${product.name}`,
      ''
    ];

    // Extract filtered specs from admin panel
    const filterSpecs = product.specifications?.filter(s => s.inFilter) || [];

    if (filterSpecs.length > 0) {
      filterSpecs.forEach(spec => {
        const key = spec.key.toLowerCase();
        let emoji = '✨'; // default
        if (key.match(/معالج|processor|cpu/i)) emoji = '⚙️';
        else if (key.match(/كارت|جرافيك|vga|gpu|graphics/i)) {
          emoji = key.match(/مدمج|داخلي|intel/i) ? '🎞️' : '🎮';
        }
        else if (key.match(/شاشة|display|screen/i)) emoji = '🖥️';
        else if (key.match(/رام|ram|ذاكرة/i)) emoji = '🧠';
        else if (key.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i)) emoji = '💽';
        else if (key.match(/جيل|generation/i)) emoji = '📅';

        textLines.push(`${emoji} ${spec.key}: ${spec.value}`);
      });
      textLines.push('');
    } else {
      // Fallback for earlier products without inFilter set
      const cpu = product.specifications?.find(s => s.key.match(/معالج|processor|cpu/i))?.value;
      const gpus = product.specifications?.filter(s => s.key.match(/كارت|جرافيك|vga|gpu|graphics/i)) || [];
      const display = product.specifications?.find(s => s.key.match(/شاشة|display|screen/i) && !s.key.match(/كارت/i))?.value;

      if (cpu) textLines.push(`⚙️ المعالج: ${cpu}`);

      gpus.forEach(gpu => {
        const emoji = gpu.key.match(/مدمج|داخلي|intel/i) ? '🎞️' : '🎮';
        textLines.push(`${emoji} ${gpu.key}: ${gpu.value}`);
      });

      if (display) textLines.push(`🖥 الشاشة: ${display}`);
      if (cpu || gpus.length > 0 || display) textLines.push('');
    }

    // Determine Base RAM & Storage
    let baseRam = product.specifications?.find(s => s.key.match(/رام|ram|ذاكرة/i))?.value;
    let baseStorage = product.specifications?.find(s => s.key.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i))?.value;

    const ramGroup = product.customOptionGroups?.find(g => g.name.match(/رام|ram/i));
    if (ramGroup && ramGroup.options.length > 0) baseRam = ramGroup.options[0].label;

    const storageGroup = product.customOptionGroups?.find(g => g.name.match(/تخزين|مساحة|هارد|storage|hdd|ssd/i));
    if (storageGroup && storageGroup.options.length > 0) baseStorage = storageGroup.options[0].label;

    let baseSpecsText = [baseRam, baseStorage].filter(Boolean).join(' + ');

    // Fallback to sizes if available and no specific base specs found
    if (!baseSpecsText && product.sizes && product.sizes.length > 0) {
      baseSpecsText = product.sizes[0].label;
    }

    if (baseSpecsText) {
      textLines.push(`📦 المواصفات الأساسية:`);
      textLines.push(baseSpecsText);
      textLines.push('');
    }

    textLines.push(`💰 السعر الأساسي: ${formatCurrency(currentPrice, 'جنيه')}`);
    textLines.push('');

    // Add Custom Upgrades (RAM, Storage, etc.)
    if (product.customOptionGroups && product.customOptionGroups.length > 0) {
      product.customOptionGroups.forEach(group => {
        const upgradeOptions = group.options.filter((opt, idx) => idx > 0 && opt.extraPrice > 0);
        if (upgradeOptions.length > 0) {
          const isRam = group.name.match(/رام|ram/i);
          const emoji = isRam ? '🧠' : (group.name.match(/تخزين|هارد|مساحة/i) ? '💽' : '✨');
          textLines.push(`${emoji} ترقية ${group.name}:`);
          upgradeOptions.forEach(opt => {
            textLines.push(`${opt.label} (+${formatCurrency(opt.extraPrice, 'جنيه')})`);
          });
          textLines.push('');
        }
      });
    }

    // Add Size Upgrades if applicable
    if (product.sizes && product.sizes.length > 1) {
      const sizeUpgrades = product.sizes.slice(1);
      textLines.push(`⚡ خيارات إضافية:`);
      sizeUpgrades.forEach(size => {
        const extraPrice = size.price - currentPrice;
        if (extraPrice > 0) {
          textLines.push(`${size.label} (+${formatCurrency(extraPrice, 'جنيه')})`);
        } else {
          textLines.push(`${size.label} (${formatCurrency(size.price, 'جنيه')})`);
        }
      });
      textLines.push('');
    }

    textLines.push(`🔗 شاهد التفاصيل واطلب الآن من الموقع الرسمي:`);
    textLines.push(window.location.href);
    textLines.push('');
    textLines.push(`🚀 اطلب دلوقتي من الموقع واستعرض كل التفاصيل والصور بجودة عالية، واستمتع بتجربة شراء سهلة وسريعة!`);

    const finalString = textLines.join('\n');

    try {
      await navigator.clipboard.writeText(finalString);
      toast.success("تم نسخ المواصفات بنجاح");
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("حدث خطأ أثناء النسخ");
    }
  };


  return (
    <div className="pd-page min-h-screen bg-gray-50/50">
      <SEOHelmet
        title={optimizedTitle}
        description={`${metaDescription} - اشتري الآن بأفضل سعر من كومبيو سيف.`}
        keywords={optimizedKeywords}
        image={product.images?.[0]}
        url={getProductUrl(product.id, product.name)}
        type="product"
        productData={{
          name: product.name,
          brand: product.brand,
          price: finalPrice,
          currency: "EGP",
          availability: (product.wholesaleInfo?.quantity || 0) > 0 ? "InStock" : "OutOfStock",
          condition: "NewCondition",
          sku: product.id,
          images: product.images,
        }}
      />
      <main className="container mx-auto py-6 px-4 md:px-8">
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
                <BreadcrumbLink asChild>
                  <Link
                    to="/products"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("navigation.products")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <span className="mx-2 text-muted-foreground">&lt;</span>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">
                  {product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </motion.div>

        {/* Product Details */}
        <div className="pd-columns flex flex-col lg:flex-row gap-8 lg:gap-16 mb-16 relative">

          {/* Left Column: Product Images (Sticky) */}
          <div className="pd-image-col w-full lg:w-1/2 flex flex-col gap-4">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Main Image */}
              <div className="pd-main-image aspect-[4/5] sm:aspect-square w-full rounded-3xl overflow-hidden relative group bg-white border border-gray-200 transition-all duration-500">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImage}
                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="h-full w-full flex items-center justify-center p-8"
                  >
                    {isCurrentVideo ? (
                      <div className="w-full h-full relative group rounded-2xl overflow-hidden">
                        <iframe
                          src={(() => {
                            let u = currentImage.trim();
                            if (!u.match(/^https?:\/\//i)) {
                              u = `https://${u}`;
                            }
                            if (u.includes("youtube") || u.includes("youtu.be")) {
                              let embed = u
                                .replace("watch?v=", "embed/")
                                .replace("youtu.be/", "www.youtube.com/embed/")
                                .replace("youtube.com/shorts/", "www.youtube.com/embed/");
                              if (!embed.includes("youtube.com/embed/")) {
                                const m = u.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]+)/);
                                if (m) embed = `https://www.youtube.com/embed/${m[1]}?rel=0`;
                              }
                              return embed;
                            } else if (u.includes("facebook")) {
                              let fbUrl = u;
                              if (fbUrl.includes("https://facebook.com")) {
                                fbUrl = fbUrl.replace("https://facebook.com", "https://www.facebook.com");
                              }
                              return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&width=500`;
                            }
                            return u;
                          })()}
                          title="Product Video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <img
                        src={currentImage}
                        alt={`${product.name} - ${product.brand} استيراد أصلي فرز أول | كمبيو سيف`}
                        className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>



                {/* Navigation arrows */}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        const newIdx = selectedImage > 0 ? selectedImage - 1 : mediaItems.length - 1;
                        setSelectedImage(newIdx);
                        const item = mediaItems[newIdx];
                        if (item.type === 'image' && availableColors.length > 1) {
                          const c = availableColors.find(color => colorImageMapping[color] === item.url);
                          if (c) setSelectedColor(c);
                        }
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white backdrop-blur-md p-3 text-gray-800 opacity-0 transition-all duration-300 group-hover:opacity-100 border border-gray-200 -translate-x-4 group-hover:translate-x-0"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        const newIdx = selectedImage < mediaItems.length - 1 ? selectedImage + 1 : 0;
                        setSelectedImage(newIdx);
                        const item = mediaItems[newIdx];
                        if (item.type === 'image' && availableColors.length > 1) {
                          const c = availableColors.find(color => colorImageMapping[color] === item.url);
                          if (c) setSelectedColor(c);
                        }
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white backdrop-blur-md p-3 text-gray-800 opacity-0 transition-all duration-300 group-hover:opacity-100 border border-gray-200 translate-x-4 group-hover:translate-x-0"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {mediaItems.length > 1 && (
                <div className="space-y-3">

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {mediaItems.map((item, index) => {
                      const isSelected = index === selectedImage;

                      return (
                        <motion.button
                          key={index}
                          onClick={() => {
                            setSelectedImage(index);
                            if (item.type === 'image' && availableColors.length > 1) {
                              // Find the color that corresponds to this image
                              const correspondingColor = availableColors.find(color =>
                                colorImageMapping[color] === item.url
                              );
                              if (correspondingColor) {
                                setSelectedColor(correspondingColor);
                              }
                            }
                          }}
                          className={`group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${isSelected
                            ? "border-primary ring-1 ring-primary/20"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {item.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                              <Film className="w-6 h-6 text-gray-500" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                <Play className="w-6 h-6 text-white fill-white opacity-80" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={item.url}
                              alt={`${product.name} - ${product.brand} - صورة ${index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          )}

                          {/* Selection indicator */}
                          {isSelected && (
                            <motion.div
                              className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            </motion.div>
                          )}

                          {/* Color indicator overlay - only for images linked to colors */}
                          {item.type === 'image' && availableColors.length > 1 && availableColors.some(c => colorImageMapping[c] === item.url) && (
                            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white shadow-sm"
                              style={{
                                backgroundColor: availableColors.find(c => colorImageMapping[c] === item.url) || '#ccc'
                              }}
                            />
                          )}

                          {/* Image number badge */}
                          <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 text-white text-xs rounded-full flex items-center justify-center font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            {index + 1}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="pd-info-col w-full lg:w-1/2 space-y-8 lg:py-4"
          >
            {/* Product Header */}
            <div className="space-y-5">
              {/* Premium Red Special Offer Ribbon */}
              {product?.specialOffer && (
                <div className="relative mb-6 mt-2 w-full max-w-sm mr-auto ml-0">
                  {/* The folded piece behind (top-left) */}
                  <div className="absolute -top-2 -left-3 w-4 h-4 bg-[#5c0b0b]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>

                  {/* The main banner pointing right */}
                  <div
                    className="relative flex items-center justify-between py-2 sm:py-3 pl-3 pr-8 shadow-md -left-3 border-y border-[#ff7373]/40"
                    style={{
                      background: 'linear-gradient(90deg, #8a0c0c 0%, #d61c1c 30%, #ff5252 60%, #d61c1c 90%, #a61212 100%)',
                      clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)'
                    }}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[#ffcccc] text-[10px] sm:text-xs uppercase tracking-wider font-extrabold leading-none drop-shadow-md">
                        عرض خاص
                      </span>
                      <span className="text-white text-xs sm:text-sm font-bold drop-shadow-md mt-0.5">
                        {timeLeft ? "ينتهي خلال" : (product.discountPercentage ? `خصم ${product.discountPercentage}%` : "سعر مميز")}
                      </span>
                    </div>
                    {timeLeft ? (
                      <div className="flex items-center">
                        <span className="text-white font-black text-lg sm:text-xl md:text-2xl drop-shadow-lg tracking-widest font-mono" dir="ltr">
                          {timeLeft.days > 0 && <span className="text-[#ffcccc] text-sm sm:text-lg mr-1.5 sm:mr-2">{pad(timeLeft.days)}d</span>}
                          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="text-white font-extrabold text-sm sm:text-base drop-shadow-lg px-2.5 py-1 bg-black/20 rounded-md">
                          سعر مخفض
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Bottom-left fold */}
                  <div className="absolute -bottom-2 -left-3 w-4 h-4 bg-[#5c0b0b]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full tracking-wider uppercase">
                  {product.brand}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                  {product.category}
                </span>

              </div>

              <div className="space-y-3">
                <h1 className="pd-product-name text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Key Specifications (Specs mapped to filters) */}
              {(() => {
                const filterSpecs = product.specifications?.filter(s => s.inFilter && s.value.trim() !== '') || [];
                if (filterSpecs.length === 0) return null;

                let processedSpecs: any[] = [];
                let gpuSpec: any = null;
                let vramSpec: any = null;

                filterSpecs.forEach(spec => {
                  const keyLower = spec.key.toLowerCase();
                  if (keyLower.match(/vram|ذاكرة\s*الكرت|حجم\s*الكرت|video\s*ram/i)) {
                    vramSpec = spec;
                  } else if (keyLower.match(/كارت|كرت|جرافيك|vga|gpu|graphics/i) && !keyLower.match(/مدمج|داخلي/i)) {
                    gpuSpec = spec;
                  } else {
                    processedSpecs.push(spec);
                  }
                });

                if (gpuSpec) {
                  const combinedValue = vramSpec ? `${Math.floor(Number(gpuSpec.value) || 0) ? gpuSpec.value : gpuSpec.value} — ${vramSpec.value}` : gpuSpec.value;
                  processedSpecs.splice(1, 0, { ...gpuSpec, value: combinedValue }); // Insert near the top
                } else if (vramSpec) {
                  processedSpecs.push(vramSpec);
                }

                return (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 pb-2 border-y border-gray-100/60 my-2">
                    {processedSpecs.map((spec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5"
                        title={`${spec.key}: ${spec.value}`}
                      >
                        <span className="text-[12px] font-medium text-gray-400 after:content-[':']">
                          {spec.key}
                        </span>
                        <span className="text-[13px] font-bold text-gray-900 drop-shadow-sm" dir="ltr">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>



            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">اللون: <span className="font-medium text-gray-500 ml-2">{selectedColor ? getColorByName(selectedColor).name : 'اختر لوناً'}</span></h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const colorInfo = getColorByName(color);

                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color);
                          const imgUrl = colorImageMapping[color];
                          if (imgUrl) {
                            const idx = mediaItems.findIndex(m => m.url === imgUrl);
                            if (idx !== -1) setSelectedImage(idx);
                          }
                        }}
                        className={`relative group ${selectedColor === color
                          ? 'ring-2 ring-primary ring-offset-4 ring-offset-white scale-110'
                          : 'ring-1 ring-gray-200 hover:ring-gray-300 hover:scale-105'
                          } rounded-full transition-all duration-300`}
                        title={colorInfo.name}
                      >
                        <div
                          className="w-10 h-10 rounded-full shadow-inner border border-black/5"
                          style={{ backgroundColor: color }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Quantity Display */}
            {/* <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">الكمية المتاحة</h3>
                  <p className="text-sm text-gray-500">المخزون الحالي</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {product.wholesaleInfo?.quantity || 0}
                  </div>
                  <div className="text-sm text-blue-700">
                    قطعة متاحة
                  </div>
                </div>
              </div>
            </div> */}

            {/* Product Options Container */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200">
              <ProductOptions
                product={product}
                currentPrice={finalPrice}
                undiscountedPrice={undiscountedPrice}
                maxQuantity={product.wholesaleInfo?.quantity}
                quantity={currentQuantity}
                onSelectionChange={handleSelectionChange}
                onQuantityChange={handleQuantityChange}
                onBuy={handleBuy}
                onAddToCart={handleAddToCart}
              />
            </div>

            {/* Actions Row */}
            <div className="flex gap-3 pt-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-2xl h-14 bg-white hover:bg-gray-50 hover:text-primary transition-colors border-gray-200 shadow-sm"
                onClick={handleShare}
              >
                <span className="font-bold">مشاركة المنتج</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-2xl h-14 bg-white hover:bg-gray-50 hover:text-primary transition-colors gap-2 border-gray-200 shadow-sm"
                onClick={handleCopySpecs}
              >
                <span className="font-bold">نسخ المواصفات</span>
              </Button>
            </div>
          </motion.div>
        </div>




        {/* Product Description */}
        {product.description && (
          <div className="mb-16">
            <Separator className="mb-8" />
            <div className="max-w-4xl mx-auto">
              <div
                className="prose prose-lg max-w-none
                prose-headings:font-semibold
                prose-p:leading-relaxed
                prose-ul:list-disc prose-ul:pl-4
                prose-ol:list-decimal prose-ol:pl-4
                prose-li:my-1
                prose-strong:text-foreground
                prose-em:text-foreground/80
                prose-ul:marker:text-foreground
                prose-ol:marker:text-foreground"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          </div>
        )}

        <div id="specs-section" className="mb-16 scroll-mt-24">
          <Separator className="mb-8" />
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Settings2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">المواصفات التقنية</h2>
                <p className="text-gray-500 mt-1">المواصفات الفنية الكاملة للجهاز</p>
              </div>
            </div>

            {product.specifications && product.specifications.length > 0 ? (
              <SpecsDisplay
                category={product.category}
                specifications={product.specifications}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد مواصفات مُدخلة لهذا المنتج</p>
              </div>
            )}
          </div>
        </div>



        {/* Suggested Products */}
        <div className="mb-16">
          <Separator className="mb-8" />
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              منتجات مشابهة
            </h2>
            <p className="text-gray-600">
              اكتشف المزيد من المنتجات المميزة
            </p>
          </div>

          {suggestedProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() => {
                    setSelectedProduct(product);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main >

      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Sticky Bottom Navigation - Rendered in Portal to avoid parent stacking contexts */}
      {createPortal(
        <AnimatePresence mode="wait">
          {(!isBuyButtonManuallyHidden && !isPurchaseVisible) || (!isSpecsButtonManuallyHidden && !isSpecsVisible) ? (
            <motion.div
              className="fixed bottom-4 left-4 right-4 z-[100] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-sm pointer-events-none"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              style={{ willChange: "transform, opacity" }}
            >
              <div className="flex items-center justify-center gap-3">
                <AnimatePresence mode="popLayout">
                  {!isBuyButtonManuallyHidden && !isPurchaseVisible && (
                    <motion.div
                      key="buy-btn"
                      layout
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex-1 pointer-events-auto shadow-2xl rounded-2xl relative group"
                    >
                      {/* Close button for Buy button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBuyButtonManuallyHidden(true);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg z-10"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-3 w-3" />
                      </motion.button>

                      <Button
                        onClick={() => {
                          const event = new CustomEvent('open-checkout-form');
                          window.dispatchEvent(event);
                          setTimeout(() => scrollToSection('checkout-form-section'), 100);
                        }}
                        className="w-full rounded-2xl h-12 text-base font-bold shadow-lg bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 border-none backdrop-blur-md"
                      >
                        إتمام الشراء
                      </Button>
                    </motion.div>
                  )}

                  {!isSpecsButtonManuallyHidden && !isSpecsVisible && (
                    <motion.div
                      key="specs-btn"
                      layout
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex-1 pointer-events-auto shadow-2xl rounded-2xl relative group"
                    >
                      {/* Close button for Specs button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSpecsButtonManuallyHidden(true);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg z-10"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-3 w-3" />
                      </motion.button>

                      <Button
                        variant="secondary"
                        onClick={() => scrollToSection('specs-section')}
                        className="w-full rounded-2xl h-12 text-base font-bold shadow-lg bg-white/90 hover:bg-white text-gray-900 transition-all active:scale-95 border border-gray-200/50 backdrop-blur-md"
                      >
                        المواصفات
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )
      }

      {/* Footer is below */}
      <div className="pb-24">
        <Footer />
      </div>

      <ProductModal
        product={selectedProduct}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <Dialog open={isBatteryModalOpen} onOpenChange={setIsBatteryModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              ضمان الشاحن والبطارية
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-600">
              يغطي الضمان الشاحن والبطارية لمدة أسبوعين من تاريخ الشراء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-green-50 border-green-100 p-3">
                <p className="text-sm font-semibold text-green-800">مدة التشغيل المتوقعة</p>
                <p className="text-sm text-green-700 mt-1">من ساعتين إلى ٥ ساعات حسب الاستخدام.</p>
              </div>
              <div className="rounded-lg border bg-red-50 border-red-100 p-3">
                <p className="text-sm font-semibold text-red-800">علامة الخلل</p>
                <p className="text-sm text-red-700 mt-1">
                  إذا انخفضت البطارية من 100٪ إلى نفاد كامل في أقل من ساعتين فهذا مؤشر على مشكلة.
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900 mb-2">شروط الاستبدال</p>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700">
                <li>يمكن استبدال الجهاز أو البطارية ببطارية أخرى خلال أسبوعين من الضمان عند ثبوت المشكلة.</li>
                <li>بعد مرور أسبوعين لا يمكن الاستبدال.</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">نصائح للحفاظ على عمر البطارية</p>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700">
                <li>استخدم الشاحن الأصلي وتجنب الشواحن غير الموثوقة.</li>
                <li>تجنب استخدام الجهاز أثناء الشحن وتقليل تعرضه للحرارة.</li>
                <li>حافظ على الشحن بين 20٪ و80٪ قدر الإمكان.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end">
            <Button variant="outline" onClick={() => setIsBatteryModalOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Shipping Policy Modal */}
      <Dialog open={showShippingPolicy} onOpenChange={setShowShippingPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700">
              <Truck className="h-5 w-5" /> سياسة الشحن والتوصيل
            </DialogTitle>
            <DialogDescription>
              يرجى مراجعة تفاصيل الشحن أدناه
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100 shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/60 p-3 rounded border border-yellow-100/50">
                <p className="font-medium flex items-center gap-2 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                  داخل القاهرة
                </p>
                <div className="text-right">
                  <p className="font-bold text-yellow-800">100</p>
                  <p className="text-xs text-yellow-600">(24 ساعة)</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-white/60 p-3 rounded border border-yellow-100/50">
                <p className="font-medium flex items-center gap-2 text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                  جميع المحافظات
                </p>
                <div className="text-right">
                  <p className="font-bold text-yellow-800">200</p>
                  <p className="text-xs text-yellow-600">(48 ساعة)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-yellow-800 bg-yellow-100/50 p-2 rounded">
              * سيتم تأكيد تكلفة الشحن النهائية عبر واتساب.
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowShippingPolicy(false)} className="w-full">
              حسناً، فهمت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Success Modal */}
      <Dialog open={orderSuccess.isOpen} onOpenChange={(open) => {
        if (!open) {
          setOrderSuccess(prev => ({ ...prev, isOpen: false }));
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
                طرق الدفع المتاحه:
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
                  <p className="text-[11px] text-gray-500 font-bold mb-0.5">  علي هذا الرقم</p>
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
              تأكيد الطلب واتساب
            </a>

            {/* Close button */}
            <button
              onClick={() => {
                setOrderSuccess(prev => ({ ...prev, isOpen: false }));
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
    </div >
  );
};

export default ProductDetails; 