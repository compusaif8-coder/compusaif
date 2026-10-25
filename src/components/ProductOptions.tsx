import React, { useState, useEffect, useCallback } from 'react';
import { Product, ProductSize, ProductAddon } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/format';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Ruler,
  Plus,
  Check,
  ShoppingBag,
  Tag,
  Sparkles,
  Minus,
  ShoppingCart,
  Truck,
  CalendarClock,
  ChevronDown,
  Loader2,
  Ticket,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { checkCoupon, incrementCouponUsage, Coupon } from '@/lib/coupons';
import { STORE_GOVERNORATES } from '@/constants/store';
import { trackMetaInitiateCheckout } from '@/lib/metaPixel';

export interface CheckoutFormData {
  fullName: string;
  phoneNumber: string;
  governorate: string;
  address: string;
  orderType: 'online_purchase' | 'reservation';
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  couponCode?: string;
  couponDiscountAmount?: number;
}

interface ProductOptionsProps {
  product: Product;
  currentPrice: number;
  undiscountedPrice?: number;
  maxQuantity?: number;
  quantity: number;
  onSelectionChange: (
    selectedSize: ProductSize | null,
    selectedCustomOptions: Array<{
      groupId: string;
      groupName: string;
      optionId: string;
      optionLabel: string;
      extraPrice: number;
    }>,
    selectedAddons: ProductAddon[],
    finalPrice: number
  ) => void;
  onQuantityChange: (quantity: number) => void;
  onBuy: (quantity: number, formData: CheckoutFormData) => void;
  onAddToCart?: () => void;
}

export function ProductOptions({
  product,
  currentPrice,
  undiscountedPrice,
  maxQuantity = 999,
  quantity,
  onSelectionChange,
  onQuantityChange,
  onBuy,
  onAddToCart
}: ProductOptionsProps) {
  const { t } = useTranslation();
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedCustomOptionIds, setSelectedCustomOptionIds] = useState<Record<string, string>>({});
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    phoneNumber: '',
    governorate: '',
    address: '',
    orderType: 'online_purchase',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutFormData, boolean>>>({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCouponFieldOpen, setIsCouponFieldOpen] = useState(false);
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  // Quantity state removed - controlled by parent

  // Calculate final price based on selections (without applying special offer discount)
  // The special offer discount is already applied in ProductDetails component
  const calculateFinalPrice = useCallback((sizeId: string | null, customOptIds: Record<string, string>, addonIds: string[]) => {
    let basePrice = product.price;

    if (product.sizes && product.sizes.length > 0 && sizeId) {
      const selectedSize = product.sizes.find(size => size.id === sizeId);
      if (selectedSize) {
        basePrice = selectedSize.price;
      }
    }

    if (product.customOptionGroups) {
      product.customOptionGroups.forEach(group => {
        const selectedOptId = customOptIds[group.id];
        if (selectedOptId) {
          const opt = group.options.find(o => o.id === selectedOptId);
          if (opt && opt.extraPrice) {
            basePrice += opt.extraPrice;
          }
        }
      });
    }

    if (product.addons && addonIds.length > 0) {
      const selectedAddons = product.addons.filter(addon => addonIds.includes(addon.id));
      selectedAddons.forEach(addon => {
        basePrice += addon.price_delta;
      });
    }

    return basePrice;
  }, [product.price, product.sizes, product.addons, product.customOptionGroups]);

  // Update parent component when selections change
  useEffect(() => {
    const selectedSize = selectedSizeId && product.sizes
      ? product.sizes.find(size => size.id === selectedSizeId) || null
      : null;

    const selectedCustomOptionsFormatted = (product.customOptionGroups || [])
      .map(group => {
        const optId = selectedCustomOptionIds[group.id];
        const opt = group.options.find(o => o.id === optId);
        if (opt) {
          return {
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionLabel: opt.label,
            extraPrice: opt.extraPrice || 0
          };
        }
        return null;
      })
      .filter(Boolean) as any[];

    const selectedAddons = product.addons
      ? product.addons.filter(addon => selectedAddonIds.includes(addon.id))
      : [];

    const finalPrice = calculateFinalPrice(selectedSizeId, selectedCustomOptionIds, selectedAddonIds);

    onSelectionChange(selectedSize, selectedCustomOptionsFormatted, selectedAddons, finalPrice);
  }, [selectedSizeId, selectedCustomOptionIds, selectedAddonIds, product.sizes, product.addons, product.customOptionGroups, calculateFinalPrice, onSelectionChange]);

  // Initialize with first size if available
  useEffect(() => {
    if (product.sizes && product.sizes.length > 0 && !selectedSizeId) {
      setSelectedSizeId(product.sizes[0].id);
    }
  }, [product.sizes]);

  // Initialize with first custom option per group if available
  useEffect(() => {
    if (product.customOptionGroups && product.customOptionGroups.length > 0) {
      let changed = false;
      const newSelections = { ...selectedCustomOptionIds };
      product.customOptionGroups.forEach(group => {
        if (!newSelections[group.id] && group.options.length > 0) {
          newSelections[group.id] = group.options[0].id;
          changed = true;
        }
      });
      if (changed) {
        setSelectedCustomOptionIds(newSelections);
      }
    }
  }, [product.customOptionGroups]);

  useEffect(() => {
    const handleOpenForm = () => setIsFormVisible(true);
    window.addEventListener('open-checkout-form', handleOpenForm);
    return () => window.removeEventListener('open-checkout-form', handleOpenForm);
  }, []);

  // Track Meta Pixel InitiateCheckout when direct product checkout form opens
  useEffect(() => {
    if (isFormVisible) {
      trackMetaInitiateCheckout([{ id: product.id, price: currentPrice, quantity }], currentPrice * quantity);
    }
  }, [isFormVisible, product.id, currentPrice, quantity]);

  useEffect(() => {
    if (appliedCoupon) {
      let discount = 0;
      const baseTotal = currentPrice * quantity;
      if (appliedCoupon.type === 'fixed') {
        discount = appliedCoupon.value;
      } else {
        discount = (baseTotal * appliedCoupon.value) / 100;
      }
      setFormData(prev => ({ ...prev, couponDiscountAmount: discount, couponCode: appliedCoupon.code }));
    } else {
      setFormData(prev => ({ ...prev, couponDiscountAmount: 0, couponCode: undefined }));
    }
  }, [appliedCoupon, currentPrice, quantity]);

  const handleSizeChange = (sizeId: string) => {
    setSelectedSizeId(sizeId);
  };

  const handleAddonToggle = (addonId: string, checked: boolean) => {
    if (checked) {
      setSelectedAddonIds(prev => [...prev, addonId]);
    } else {
      setSelectedAddonIds(prev => prev.filter(id => id !== addonId));
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxQuantity) {
      toast.warning(`أقصى كمية متاحة هي ${maxQuantity}`);
      return;
    }
    onQuantityChange(newQuantity);
  };

  const handleBuyClick = () => {
    // Validate quantity against stock
    if (quantity > maxQuantity) {
      toast.error("الكمية المطلوبة غير متوفرة");
      return;
    }

    // Validate Form
    const errors: Partial<Record<keyof CheckoutFormData, boolean>> = {};
    if (!formData.fullName.trim()) errors.fullName = true;
    if (!formData.phoneNumber.trim() || !/^01[0-9]{9,}$/.test(formData.phoneNumber)) errors.phoneNumber = true;

    // Conditional Validation
    if (formData.orderType === 'online_purchase') {
      if (!formData.governorate) errors.governorate = true;
      if (!formData.address.trim()) errors.address = true;
    } else {
      // Reservation validation
      if (!formData.appointmentDate) errors.appointmentDate = true;
      if (!formData.appointmentTime) errors.appointmentTime = true;
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
      return;
    }

    if (appliedCoupon?.id) {
      incrementCouponUsage(appliedCoupon.id);
    }

    onBuy(quantity, formData);
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    setIsCouponLoading(true);
    try {
      const result = await checkCoupon(couponInput);
      if (result.coupon) {
        if (result.coupon.applicableProductIds && result.coupon.applicableProductIds.length > 0) {
          if (!result.coupon.applicableProductIds.includes(product.id!)) {
            setCouponError('هذا الكوبون غير صالح لهذا المنتج');
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

  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasCustomOptionGroups = product.customOptionGroups && product.customOptionGroups.length > 0;
  const hasAddons = product.addons && product.addons.length > 0;

  // Use passed undiscountedPrice or calculate it locally if not provided
  const originalPrice = undiscountedPrice ?? calculateFinalPrice(selectedSizeId, selectedCustomOptionIds, selectedAddonIds);

  // Coupon discount calculation
  const subtotal = currentPrice * quantity;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === 'fixed'
      ? Math.min(appliedCoupon.value, subtotal)
      : (subtotal * appliedCoupon.value) / 100
    : 0;
  const finalPriceAfterCoupon = Math.max(0, subtotal - couponDiscount);

  return (
    <div className="space-y-8">
      {/* Sizes Section */}
      {hasSizes && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm tracking-widest uppercase font-bold text-gray-400">الأحجام</h3>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {product.sizes!.map((size) => (
              <button
                key={size.id}
                onClick={() => handleSizeChange(size.id)}
                className={`relative group p-4 rounded-xl border transition-all duration-200 ${selectedSizeId === size.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selectedSizeId === size.id
                    ? 'border-primary bg-primary'
                    : 'border-gray-300 bg-white'
                    }`}>
                    {selectedSizeId === size.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="text-right flex-1">
                    <div className="font-bold text-gray-900 text-sm leading-relaxed">{size.label}</div>
                    <div className={`font-black text-base mt-1 inline-block px-3 py-1 rounded-lg ${size.price === 0 || size.price === product.price ? 'text-primary/80 bg-primary/5 border border-primary/20 text-sm' : 'text-primary bg-primary/10'}`}>
                      {size.price === 0 || size.price === product.price ? 'الأساسي' : formatCurrency(size.price, 'جنيه')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Option Groups Section */}
      {hasCustomOptionGroups && (
        <div className="space-y-6">
          {product.customOptionGroups!.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm tracking-widest uppercase font-bold text-gray-400">{group.name}</h3>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {group.options.map((option) => {
                  const isSelected = selectedCustomOptionIds[group.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedCustomOptionIds(prev => ({ ...prev, [group.id]: option.id }))}
                      className={`relative group p-4 rounded-xl border transition-all duration-200 ${isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 bg-white'
                            }`}>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 leading-relaxed">{option.label}</div>
                          </div>
                        </div>
                        {option.extraPrice > 0 ? (
                          <div className="font-black text-primary bg-primary/10 inline-block px-3 py-1 rounded-lg text-sm">
                            +{formatCurrency(option.extraPrice, 'جنيه')}
                          </div>
                        ) : (
                          <div className="font-bold text-primary/80 bg-primary/5 border border-primary/20 inline-block px-3 py-1 rounded-lg text-xs">
                            الأساسي
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Addons Section */}
      {hasAddons && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm tracking-widest uppercase font-bold text-gray-400">الإضافات الاختيارية</h3>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {product.addons!.map((addon) => (
              <button
                key={addon.id}
                onClick={() => handleAddonToggle(addon.id, !selectedAddonIds.includes(addon.id))}
                className={`relative group p-4 rounded-xl border transition-all duration-200 ${selectedAddonIds.includes(addon.id)
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${selectedAddonIds.includes(addon.id)
                      ? 'border-primary bg-primary'
                      : 'border-gray-300 bg-white'
                      }`}>
                      {selectedAddonIds.includes(addon.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="text-left flex flex-col items-start gap-1">
                      <div className="font-bold text-gray-900 leading-none">{addon.label}</div>
                      <div className="text-xs text-gray-500 font-medium">إضافة مميزة</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary bg-primary/5 px-3 py-1 rounded-full text-sm">
                      +{formatCurrency(addon.price_delta, 'جنيه')}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Final Price and Purchase Container */}
      <div id="checkout-form-section" className="pt-8 border-t border-gray-100">
        <div className="flex flex-col gap-6">
          {/* Price Header - updates when coupon applied */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-sm tracking-widest uppercase font-bold text-primary/60 mb-1">
                {appliedCoupon ? 'سعر بعد خصم الكوبون' : currentPrice < originalPrice ? 'عرض خاص حصري!' : 'السعر النهائي'}
              </h3>
              <div className="flex items-baseline gap-3">
                {/* Main price: shows discounted price when coupon applied */}
                <span className={`text-4xl md:text-5xl font-black tracking-tight ${appliedCoupon ? 'text-green-700' : currentPrice < originalPrice ? 'text-red-600' : 'text-primary'
                  }`}>
                  {formatCurrency(appliedCoupon ? finalPriceAfterCoupon : subtotal, 'جنيه')}
                </span>

                {/* Strike-through: base price before coupon */}
                {appliedCoupon && (
                  <span className="text-xl line-through text-gray-400 font-medium">
                    {formatCurrency(subtotal, 'جنيه')}
                  </span>
                )}

                {/* Strike-through: original price before special offer */}
                {!appliedCoupon && currentPrice < originalPrice && (
                  <span className="text-xl line-through text-gray-400 font-medium">
                    {formatCurrency(originalPrice * quantity, 'جنيه')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {currentPrice < originalPrice && (
                <div className="inline-block bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-sm font-bold border border-red-100">
                  {product.discountPrice
                    ? `خصم ${formatCurrency(originalPrice - currentPrice, 'جنيه')}`
                    : `خصم العرض ${Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%`
                  }
                </div>
              )}
              {appliedCoupon && (
                <div className="inline-block bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold border border-green-200">
                  كوبون {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `${formatCurrency(appliedCoupon.value, 'جنيه')}`} خصم
                </div>
              )}
            </div>
          </div>

          {currentPrice < originalPrice && product.offerEndsAt && new Date(product.offerEndsAt) > new Date() && (
            <div className="bg-red-50/50 rounded-xl p-3 text-center text-red-600 text-sm font-medium">
              ينتهي العرض في {new Date(product.offerEndsAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between border-y border-gray-100 py-4">
            <span className="font-bold text-gray-900">الكمية المطلوبة</span>
            <div className="flex items-center bg-gray-50 rounded-full border border-gray-200">
              <button
                className="w-12 h-10 flex items-center justify-center text-xl text-gray-600 hover:text-black hover:bg-gray-100 rounded-r-full transition-colors"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span className="w-12 text-center text-lg font-bold text-gray-900 border-x border-gray-200">
                {quantity}
              </span>
              <button
                className="w-12 h-10 flex items-center justify-center text-xl text-gray-600 hover:text-black hover:bg-gray-100 rounded-l-full transition-colors"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                +
              </button>
            </div>
          </div>

          {/* Detailed Selection Summary */}
          {(selectedSizeId || Object.keys(selectedCustomOptionIds).length > 0 || selectedAddonIds.length > 0) && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm flex flex-col gap-3">
              {selectedSizeId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">الحجم المحدد</span>
                  <span className="font-bold text-gray-900">
                    {product.sizes?.find(s => s.id === selectedSizeId)?.label}
                  </span>
                </div>
              )}

              {product.customOptionGroups?.map((group) => {
                const optId = selectedCustomOptionIds[group.id];
                const opt = group.options.find(o => o.id === optId);
                if (opt) {
                  return (
                    <div key={group.id} className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">{group.name}</span>
                      <span className="font-bold text-gray-900">
                        {opt.label}
                      </span>
                    </div>
                  );
                }
                return null;
              })}

              {selectedAddonIds.length > 0 && (
                <>
                  {(selectedSizeId || Object.keys(selectedCustomOptionIds).length > 0) && <Separator className="bg-gray-200" />}
                  <div className="flex items-start justify-between">
                    <span className="text-gray-500 font-medium mt-1">الإضافات المحددة</span>
                    <div className="flex flex-col items-end gap-2 text-right">
                      {selectedAddonIds.map(addonId => {
                        const addon = product.addons?.find(a => a.id === addonId);
                        return addon ? (
                          <span key={addonId} className="font-bold text-gray-900 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                            {addon.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Applied coupon: badge + discount breakdown */}
          {!appliedCoupon ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCouponFieldOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-gray-700">لديك كوبون خصم؟</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCouponFieldOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Coupon Input (collapsible) */}
              {isCouponFieldOpen && (
                <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="أدخل رمز الكوبون"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        className={`h-11 bg-white uppercase text-center font-bold tracking-widest ${couponError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                        autoFocus
                      />
                      {couponError && <span className="absolute -bottom-5 right-1 text-[10px] text-red-500 font-medium">{couponError}</span>}
                    </div>
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={isCouponLoading || !couponInput.trim()}
                      className="h-11 w-24 bg-purple-700 text-white font-bold hover:bg-purple-800"
                    >
                      {isCouponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تفعيل'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Applied Coupon - badge + full price breakdown */
            <div className="space-y-3">
              {/* Coupon applied badge */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Tag className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <div className="font-bold text-green-800 text-sm">تم تفعيل كوبون الخصم!</div>
                    <div className="text-xs text-green-600 font-mono font-bold tracking-widest">{appliedCoupon.code}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 px-3 text-xs font-bold"
                >
                  إلغاء
                </Button>
              </div>

              {/* Price breakdown */}
              <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden text-sm">
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-gray-500">سعر المنتج (خ {quantity})</span>
                  <span className="font-bold text-gray-800">{formatCurrency(subtotal, 'جنيه')}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 bg-green-50/50">
                  <span className="text-green-700 font-medium">خصم الكوبون</span>
                  <span className="font-black text-green-700">- {formatCurrency(couponDiscount, 'جنيه')}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-primary">
                  <span className="font-bold text-white">الإجمالي بعد الخصم</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(finalPriceAfterCoupon, 'جنيه')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              className="flex-1 h-14 text-lg font-bold bg-primary text-white hover:bg-primary/90 rounded-2xl transition-all duration-300 shadow-md flex items-center justify-center gap-2"
              onClick={() => setIsFormVisible(!isFormVisible)}
            >
              شراء / حجز
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isFormVisible ? 'rotate-180' : ''}`} />
            </Button>
            {onAddToCart && (
              <Button
                variant="outline"
                className="flex-1 h-14 text-lg font-bold bg-white text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 rounded-2xl transition-all duration-300"
                onClick={onAddToCart}
              >
                إضافة للسلة
              </Button>
            )}
          </div>

          {/* Checkout Form */}
          {isFormVisible && (
            <div id="checkout-input-fields" className="space-y-6 scroll-mt-32 mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-4 fade-in duration-300">
              {/* Order Type Selection - First Field */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">نوع الطلب</Label>
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, orderType: 'online_purchase', appointmentDate: '', appointmentTime: '' }))} // Clear reservation fields on type change
                    className={`flex-1 py-3 text-sm border-2 font-bold rounded-lg transition-all ${formData.orderType === 'online_purchase' ? 'border-primary text-primary shadow-sm bg-white' : 'text-gray-500 hover:text-gray-900 border-transparent'}`}
                  >
                    شراء أونلاين
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, orderType: 'reservation', governorate: '', address: '' }))} // Clear online purchase fields on type change
                    className={`flex-1 py-3 text-sm border-2 font-bold rounded-lg transition-all ${formData.orderType === 'reservation' ? 'border-primary text-primary shadow-sm bg-white' : 'text-gray-500 hover:text-gray-900 border-transparent'}`}
                  >
                    حجز من الفرع
                  </button>
                </div>
                {formData.orderType === 'online_purchase' && (
                  <p className="text-sm font-medium text-primary bg-primary/5 p-3 rounded-lg border border-primary/20 leading-relaxed text-center">
                    سيتم الشحن لحد عندك
                  </p>
                )}
                {formData.orderType === 'reservation' && (
                  <p className="text-sm font-medium text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 leading-relaxed text-center">
                    سيتم تجهيز اللاب وحجزه لحد ما تشرفنا في الفرع وسيتم التواصل لتحديد الفرع
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">الاسم بالكامل <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="أدخل اسمك الكريم"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className={`h-9 bg-white ${formErrors.fullName ? 'border-red-500' : ''}`}
                />
                {formErrors.fullName && <p className="text-[10px] text-red-500">مطلوب</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">رقم الهاتف <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="01xxxxxxxxx"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className={`h-9 bg-white ${formErrors.phoneNumber ? 'border-red-500' : ''}`}
                />
                {formErrors.phoneNumber && <p className="text-[10px] text-red-500">رقم هاتف غير صحيح</p>}
              </div>

              {/* Fields for Online Purchase */}
              {formData.orderType === 'online_purchase' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">المحافظة <span className="text-red-500">*</span></Label>
                    <select
                      value={formData.governorate}
                      onChange={(e) => setFormData(prev => ({ ...prev, governorate: e.target.value }))}
                      className={`flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${formErrors.governorate ? 'border-red-500' : ''}`}
                    >
                      <option value="">اختر المحافظة</option>
                      {STORE_GOVERNORATES.map(gov => (
                        <option key={gov.name} value={gov.name}>
                          {gov.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.governorate && <p className="text-[10px] text-red-500">مطلوب</p>}

                    {formData.governorate ? (
                      <div className="bg-primary/5 rounded-md p-2 border border-primary/10 mt-2 animate-in fade-in slide-in-from-top-1 duration-200 flex justify-between items-center px-3">
                        <span className="text-xs text-primary font-medium">
                          الشحن: <span className="font-bold text-primary text-sm">
                            {STORE_GOVERNORATES.find(g => g.name === formData.governorate)?.shippingCost}
                          </span>
                        </span>
                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {STORE_GOVERNORATES.find(g => g.name === formData.governorate)?.deliveryTime || 'خلال 48 ساعة'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-500 mt-1">
                        سيتم التواصل لتأكيد مصاريف الشحن
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">العنوان بالتفصيل <span className="text-red-500">*</span></Label>
                    <Textarea
                      placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className={`min-h-[60px] bg-white resize-none ${formErrors.address ? 'border-red-500' : ''}`}
                    />
                    {formErrors.address && <p className="text-[10px] text-red-500">مطلوب</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                    <Textarea
                      placeholder="أي تعليمات إضافية..."
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[40px] bg-white resize-none"
                    />
                  </div>
                </>
              )}

              {/* Fields for Reservation */}
              {formData.orderType === 'reservation' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-700">تاريخ الحجز <span className="text-red-500">*</span></Label>
                      <Input
                        type="date"
                        value={formData.appointmentDate}
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0]}
                        onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                        className={`h-9 bg-white ${formErrors.appointmentDate ? 'border-red-500' : ''}`}
                      />
                      {formErrors.appointmentDate && <p className="text-[10px] text-red-500">مطلوب</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-700">الوقت <span className="text-red-500">*</span></Label>
                      <Input
                        type="time"
                        value={formData.appointmentTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                        className={`h-9 bg-white ${formErrors.appointmentTime ? 'border-red-500' : ''}`}
                      />
                      {formErrors.appointmentTime && <p className="text-[10px] text-red-500">مطلوب</p>}
                    </div>
                  </div>
                  {formData.appointmentDate && formData.appointmentTime ? (
                    <p className="text-[10px] text-red-500 mt-1 leading-tight">
                      يرجى زيارة المحل خلال الفترة المحددة، وفي حال عدم الحضور سيتم اعتبار الحجز ملغيًا تلقائيًا.
                    </p>
                  ) : (
                    <p className="text-xs text-primary/80 mt-1">
                      الحجز في المحل في فتره لا تتجاوز اليومين
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                    <Textarea
                      placeholder="أي تفاصيل أخرى..."
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[40px] bg-white resize-none"
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                className="w-full h-14 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl transition-all duration-300 mt-4 shadow-xl hover:scale-[1.01] active:scale-[0.98]"
                onClick={handleBuyClick}
                disabled={maxQuantity <= 0}
              >
                {maxQuantity <= 0 ? 'لقد نفذت الكمية' : (
                  formData.orderType === 'reservation' ? 'تأكيد الحجز الان' : 'إتمام الطلب'
                )}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
