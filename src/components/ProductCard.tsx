import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getProductUrl } from "@/utils/url";
import { formatCurrency } from "@/utils/format";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { trackAddToCart } from "@/lib/analytics";
import { CARD_THEMES } from "@/lib/siteSettings";

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onAddToCart?: () => void;
  showCopySpecsOnly?: boolean;
  viewMode?: 'grid' | 'list';
}

export const ProductCard = ({
  product,
  onView,
  onAddToCart,
  showCopySpecsOnly,
  viewMode = 'grid',
}: ProductCardProps) => {
  // Early return if product is not defined
  if (!product) {
    return null;
  }

  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { settings } = useSiteSettings();
  const cardThemeId = settings.cardTheme || 'classic';
  const cardTheme = CARD_THEMES.find(t => t.id === cardThemeId) || CARD_THEMES[0];
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Calculate available quantity
  const availableQuantity = product.wholesaleInfo?.quantity || 0;
  const isOutOfStock = availableQuantity <= 0;
  const isLowStock = availableQuantity > 0 && availableQuantity <= 5;

  // Check if product has options (colors, sizes, addons or custom options)
  const hasOptions = (product.color && product.color.trim() !== '') ||
    (product.sizes && product.sizes.length > 0) ||
    (product.addons && product.addons.length > 0) ||
    (product.customOptionGroups && product.customOptionGroups.length > 0);

  // Check if product is new (added within last 3 days)
  const isNewProduct = product.createdAt
    ? (new Date().getTime() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 3
    : false;

  // Calculate time remaining for special offers
  useEffect(() => {
    if (!product.specialOffer || !product.offerEndsAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const endTime = new Date(product.offerEndsAt as string);
      const timeDiff = endTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [product.specialOffer, product.offerEndsAt]);

  // Helper: pad number
  const pad = (n: number) => String(n).padStart(2, '0');

  // Check if product is in cart
  const isInCart = cart.some((item) => item.product?.id === product.id);

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error("المنتج غير متوفر حالياً", {
        description: "تم نفاد الكمية المتاحة لهذا المنتج",
      });
      return;
    }

    if (isInCart) {
      toast.error(t("cart.productAlreadyInCart"), {
        description: t("cart.pleaseUpdateQuantity"),
        action: {
          label: t("cart.viewCart"),
          onClick: () => navigate("/cart"),
        },
      });
      return;
    }

    // If product has options, navigate to product details page
    if (hasOptions) {
      toast.info("يحتوي المنتج على خيارات متعددة", {
        description: `سيتم توجيهك إلى صفحة المنتج لاختيار ${getOptionsDescription()}`,
      });
      navigate(getProductUrl(product.id, product.name));
      return;
    }

    try {
      // Use addToCart which handles Firebase update automatically
      await addToCart(product, 1);
      trackAddToCart(product.id, product.name, product.discountPrice || product.price, 1);
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
      onAddToCart?.();
    } catch (error) {
      toast.error("خطأ في إضافة المنتج", {
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    }
  };

  const handleCopySpecs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!product) return;

    // 1. Prepare Data
    const brand = product.brand;
    const category = product.subcategory || product.category; // Preference to subcategory/series
    const processor = `${product.processor?.name || ''} ${product.processor?.processorGeneration ? `– ${product.processor.processorGeneration}` : ''}`.trim();

    // Graphics
    const internalGpu = product.processor?.integratedGpu || 'غير محدد';
    const externalGpu = product.dedicatedGraphics?.hasDedicatedGraphics
      ? `${product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name || ''} – ${product.dedicatedGraphics.vram ? `${product.dedicatedGraphics.vram}GB VRAM` : ''}`
      : 'غير متوفر';

    // Storage 
    let storage = 'SSD M.2 – 256GB'; // Default fallback
    const storageTypeFirst = product.name.match(/(?:SSD|HDD|NVMe)\s*[-:]?\s*(\d+\s*(?:GB|TB)?)/i);
    const storageSizeFirst = product.name.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|HDD|NVMe)/i);

    if (storageTypeFirst) {
      let cap = storageTypeFirst[1];
      if (!/g|t/i.test(cap)) {
        cap += 'GB';
      }
      storage = `SSD M.2 – ${cap}`;
    } else if (storageSizeFirst) {
      storage = `SSD M.2 – ${storageSizeFirst[1]}`;
    }

    // Display
    const display = product.display?.sizeInches ? `${product.display.sizeInches} بوصة` : '';

    // Special Features
    const features = product.description?.includes('360') || product.name.includes('360') || product.name.includes('x360')
      ? 'يدعم اللمس واللف 360 درجة'
      : (product.display?.resolution ? `دقة الشاشة ${product.display.resolution}` : '');

    // 2. Format RAM, Custom Options & Prices
    const sortedSizes = [...(product.sizes || [])].sort((a, b) => a.price - b.price);
    const priceToDisplay = product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price * (1 - product.discountPercentage / 100)
        : product.price);

    const ramSection = sortedSizes.length > 0
      ? `\n💾 الرامات والأسعار:\n${sortedSizes.map(size => `• برام ${size.label} بسعر: ${formatCurrency(size.price, 'جنيه')}`).join('\n')}`
      : ``;

    const customOptionsSection = product.customOptionGroups && product.customOptionGroups.length > 0
      ? `\n🔧 مواصفات إضافية قابلة للتعديل:\n${product.customOptionGroups.map(group => `• ${group.name}`).join('\n')}`
      : ``;

    const finalPriceSection = `\n💰 تبدأ الأسعار من: ${formatCurrency(priceToDisplay, 'جنيه')}`;

    // 3. Construct Final Text
    const textLines = [
      `🔹 الماركة: ${brand}`,
      `🔹 الفئة: ${category}`,
      processor ? `🔹 المعالج: ${processor}` : null,
      `🔹 كرت الشاشة الداخلي: ${internalGpu}`,
      externalGpu !== 'غير متوفر' ? `🔹 كرت الشاشة الخارجي: ${externalGpu}` : null,
      `🔹 التخزين: ${storage}`,
      display ? `🔹 الشاشة: ${display}` : null,
      features ? `🔹 ${features}` : null,
      ramSection,
      customOptionsSection,
      finalPriceSection,
      ' ',
      '📸 يمكنك مشاهدة صور وفيديو اللابتوب والمواصفات كاملة',
      '🛒 مع إمكانية الشراء من خلال اللينك الرسمي على متجر كومبيو سيف',
      `🔗 ${window.location.origin}${getProductUrl(product.id, product.name)}`,
      '',
      'أو يمكن الشراء من هنا 👇',
      'فقط اترك اسمك، عنوانك، ورقم تليفونك',
      '',
      '🚚 مصاريف الشحن:',
      '• داخل القاهرة: 100 جنيه – التوصيل خلال 24 ساعة',
      '• باقي المحافظات: 180 جنيه – التوصيل خلال 48 ساعة'
    ].filter(Boolean);

    const finalString = textLines.join('\n');

    // 4. Copy to Clipboard
    try {
      await navigator.clipboard.writeText(finalString);
      toast.success("تم نسخ المواصفات بنجاح");
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("حدث خطأ أثناء النسخ");
    }
  };

  const handleViewDetails = () => {
    navigate(getProductUrl(product.id, product.name));
  };

  // Use the discount price as recorded in admin, or calculate if not available
  const discountedPrice =
    product.specialOffer && product.discountPrice
      ? product.discountPrice
      : (product.specialOffer && product.discountPercentage
        ? product.price - product.price * (product.discountPercentage / 100)
        : null);

  // Get current image for display
  const currentImage = product.images?.[currentImageIndex] || product.images?.[0] || '/placeholder.svg';

  // Get options count for better UX
  const getOptionsCount = () => {
    let count = 0;
    if (product.color && product.color.trim() !== '') count++;
    if (product.sizes && product.sizes.length > 0) count++;
    if (product.addons && product.addons.length > 0) count++;
    if (product.customOptionGroups && product.customOptionGroups.length > 0) count++;
    return count;
  };

  const optionsCount = getOptionsCount();

  // Get options description for better UX
  const getOptionsDescription = () => {
    const options = [];
    if (product.color && product.color.trim() !== '') options.push('ألوان');
    if (product.sizes && product.sizes.length > 0) options.push('مقاسات');
    if (product.customOptionGroups && product.customOptionGroups.length > 0) options.push('مواصفات');
    if (product.addons && product.addons.length > 0) options.push('إضافات');
    return options.join('، ');
  };

  // Get button text based on options
  const getButtonText = () => {
    if (hasOptions) {
      return `اختيار ${getOptionsDescription()}`;
    }
    return 'إضافة للسلة';
  };


  return (
    <div
      className={`pc-root ${viewMode === 'list' ? 'list-mode' : ''} ${isOutOfStock ? 'opacity-60' : ''}`}
      onMouseEnter={() => {
        if (product.images && product.images.length > 1) {
          setCurrentImageIndex(1);
        }
      }}
      onMouseLeave={() => {
        setCurrentImageIndex(0);
      }}
    >
      {/* IMAGE */}
      <div className={`pc-image-wrap relative overflow-hidden shrink-0 aspect-square ${
        viewMode === 'list'
          ? 'w-[110px] xs:w-[140px] sm:w-[200px]'
          : 'w-full'
      }`}>
        <img
          src={currentImage}
          alt={`${product.name} - ${product.brand} لابتوب استيراد أصلي | كمبيو سيف`}
          className="w-full h-full object-contain p-3 sm:p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* New Product ribbon — top left */}
        {isNewProduct && (
          <div 
            className="absolute top-0 left-3 sm:left-4 z-20 bg-gradient-to-b from-[#ff5a5a] to-[#ff4242] text-white flex flex-col items-center justify-start pt-1.5 pb-2.5 px-1.5 shadow-sm min-w-[32px]"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 82%, 0 100%, 0 0)' }}
          >
            <span className="text-[11px] font-black leading-none mt-1.5 mb-0.5 shadow-sm">جديد</span>
          </div>
        )}

        {/* Stock badge — top left next to ribbon */}
        {(isOutOfStock || isLowStock) && (
          <div className="absolute top-2 left-[52px] z-10">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              isOutOfStock ? 'bg-gray-900 text-white' : 'bg-orange-100 text-orange-700'
            }`}>
              {isOutOfStock ? 'نفذت الكمية' : 'كمية محدودة'}
            </span>
          </div>
        )}

        {/* Promo badges — top right */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {product.specialOffer && (
            <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full shadow-sm">
              {product.discountPercentage ? `‏-${product.discountPercentage}%` : "عرض خاص"}
            </span>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className={`pc-content-wrap flex flex-col flex-1 min-w-0 ${
        viewMode === 'list' ? 'p-3 sm:p-4' : 'p-3 sm:p-4'
      }`}>

        {/* Brand · Category */}
        <p className="pc-brand text-[10px] font-black uppercase tracking-widest mb-2 truncate">
          {product.brand}
          {product.category && (
            <span className="font-normal text-gray-400 normal-case">
              {' '}·{' '}{product.category}
            </span>
          )}
        </p>

        {/* Name */}
        <h3
          className={`pc-name font-bold leading-snug transition-colors cursor-pointer mb-2 line-clamp-2 ${
            viewMode === 'list' ? 'text-sm sm:text-[15px]' : 'text-[13px] sm:text-sm'
          }`}
          onClick={handleViewDetails}
        >
          {product.name}
        </h3>

        {/* Description (list view only, large screens) */}
        {viewMode === 'list' && product.description && (
          <div className="hidden sm:block text-xs text-gray-500 mb-3 overflow-hidden max-h-10 relative">
            <div className="prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        )}

        {/* Specifications */}
        {(() => {
          // Dynamic specifications based on filter tags
          const filterSpecs = product.specifications?.filter(s => s.inFilter && s.value.trim() !== '') || [];
          
          if (filterSpecs.length > 0) {
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
              processedSpecs.splice(1, 0, { ...gpuSpec, value: combinedValue });
            } else if (vramSpec) {
              processedSpecs.push(vramSpec);
            }

            const limit = viewMode === 'list' ? 6 : 4;
            const toShow = processedSpecs.slice(0, limit);
            const remaining = processedSpecs.length - limit;
            
            return (
              <div className={`mb-3 ${viewMode === 'list' ? '' : 'mt-1.5'}`}>
                <div className={`flex flex-col ${viewMode === 'list' ? 'gap-1.5' : 'gap-[3px]'}`}>
                  {toShow.map((spec, idx) => (
                    <div key={spec.id || idx} className={`flex justify-between items-center ${viewMode === 'list' ? 'text-[11px] border-b border-gray-50 pb-1 last:border-0 last:pb-0' : 'text-[10.5px] leading-none'}`}>
                      <span className="text-gray-400 font-medium whitespace-nowrap ml-2">{spec.key}:</span>
                      <span className="font-bold text-gray-800 text-left line-clamp-1" dir="ltr">{spec.value}</span>
                    </div>
                  ))}
                  {remaining > 0 && viewMode === 'list' && (
                    <div className="text-[10px] text-gray-400 font-medium text-center bg-gray-50/50 rounded mt-1 border border-gray-100/50 py-0.5">
                      +{remaining} مواصفات
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Legacy fallback specs
          const specs = [
            product.processor?.processorSeries
              ? `${product.processor.processorSeries}${product.processor.processorGeneration ? ` ${product.processor.processorGeneration.replace(/[^0-9]/g, '')}G` : ''}`
              : '',
            product.dedicatedGraphics?.hasDedicatedGraphics
              ? (product.dedicatedGraphics.dedicatedGpuModel || product.dedicatedGraphics.name || '')
              : (product.processor?.integratedGpu || ''),
            product.display?.sizeInches ? `${product.display.sizeInches}"` : '',
          ].filter(Boolean);
          
          return specs.length ? (
            <p className="text-[11px] text-gray-400 font-medium truncate mb-3" dir="ltr">
              {specs.join(' · ')}
            </p>
          ) : <div className="mb-3" />;
        })()}

        {/* Premium Red Countdown Ribbon */}
        {product.specialOffer && timeLeft && (
          <div className="relative mb-4 mt-2 w-[100%] ml-auto">
            {/* The folded piece behind (top-left) */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#5c0b0b]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
            
            {/* The main banner pointing right */}
            <div 
              className="relative flex items-center justify-between py-1.5 pl-2 pr-6 shadow-md -left-1.5 border-y border-[#ff7373]/40"
              style={{
                background: 'linear-gradient(90deg, #8a0c0c 0%, #d61c1c 30%, #ff5252 60%, #d61c1c 90%, #a61212 100%)',
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
              }}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[#ffcccc] text-[8px] uppercase tracking-wider font-extrabold leading-none drop-shadow-md">
                  عرض خاص محدود
                </span>
                <span className="text-white text-[9px] font-bold drop-shadow-md">
                  ينتهي خلال
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-white font-black text-sm drop-shadow-lg tracking-widest font-mono" dir="ltr">
                  {timeLeft.days > 0 && <span className="text-[#ffcccc] text-xs mr-1">{pad(timeLeft.days)}d</span>}
                  {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
                </span>
              </div>
            </div>
            {/* Bottom-left fold */}
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#5c0b0b]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
          </div>
        )}

        {/* Price + CTA pinned to bottom */}
        <div className="mt-auto space-y-2.5">

          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            {discountedPrice !== null ? (
              <>
                <span className="font-black text-base sm:text-lg text-gray-900 leading-none">
                  {formatCurrency(discountedPrice, 'جنيه')}
                </span>
                <span className="text-[11px] text-gray-400 line-through font-medium">
                  {formatCurrency(product.price, 'جنيه')}
                </span>
              </>
            ) : (
              <span className="pc-price font-black text-base sm:text-lg leading-none">
                {formatCurrency(product.price, 'جنيه')}
              </span>
            )}
          </div>

          {/* CTA — always full width, tall tap target on mobile */}
          {showCopySpecsOnly ? (
            <Button
              className="w-full h-11 text-sm font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors"
              onClick={handleCopySpecs}
            >
              نسخ المواصفات
            </Button>
          ) : (
            <button
              className="pc-btn w-full h-11 text-sm font-bold transition-all cursor-pointer"
              onClick={handleViewDetails}
            >
              عرض التفاصيل
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
