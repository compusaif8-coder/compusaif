import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Coupon,
  getAllCoupons,
  addCouponToFirebase,
  deleteCouponFromFirebase,
  updateCouponInFirebase,
} from '@/lib/coupons';
import { useStore } from '@/store/useStore';
import {
  Tag,
  Trash2,
  Plus,
  Percent,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
  Ticket,
  Search,
  Edit2,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<'fixed' | 'percentage'>('percentage');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Product filters for the applicable-products picker
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const products = useStore((state) => state.products);

  const loadCoupons = async () => {
    setLoadingList(true);
    const list = await getAllCoupons();
    setCoupons(list);
    setLoadingList(false);
  };

  useEffect(() => {
    if (isOpen) loadCoupons();
  }, [isOpen]);

  const handleSave = async () => {
    if (!code.trim()) { toast.error('أدخل رمز الكوبون'); return; }
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) { toast.error('أدخل قيمة صحيحة'); return; }
    if (type === 'percentage' && numVal > 100) { toast.error('نسبة الخصم لا يمكن أن تتجاوز 100%'); return; }

    setAdding(true);
    try {
      const couponData = {
        code: code.trim().toUpperCase(),
        type,
        value: numVal,
        description: description.trim(),
        isActive: true,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        applicableProductIds: applicableProductIds.length > 0 ? applicableProductIds : [],
      };

      if (editingCouponId) {
        await updateCouponInFirebase(editingCouponId, couponData);
        setCoupons(prev => prev.map(c => c.id === editingCouponId ? { ...c, ...couponData } as Coupon : c));
        toast.success(`تم تعديل الكوبون "${couponData.code}" بنجاح`);
        setEditingCouponId(null);
      } else {
        const newCoupon = await addCouponToFirebase({
          ...couponData,
          createdAt: new Date().toISOString(),
        } as Omit<Coupon, 'id'>);
        setCoupons(prev => [...prev, newCoupon]);
        toast.success(`تم إضافة الكوبون "${newCoupon.code}" بنجاح`);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving coupon:', err);
      toast.error('فشل في حفظ الكوبون');
    } finally {
      setAdding(false);
    }
  };

  const resetForm = () => {
    setCode(''); setValue(''); setDescription('');
    setUsageLimit(''); setValidFrom(''); setValidUntil('');
    setApplicableProductIds([]); setSearchQuery('');
    setFilterCategory(''); setFilterBrand(''); setFilterMinPrice(''); setFilterMaxPrice('');
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCouponId(coupon.id!);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value.toString());
    setDescription(coupon.description || '');
    setUsageLimit(coupon.usageLimit?.toString() || '');
    
    // Convert UTC dates to local datetime-local format if they exist
    const formatForInput = (isoString?: string | null) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    
    setValidFrom(formatForInput(coupon.validFrom));
    setValidUntil(formatForInput(coupon.validUntil));
    setApplicableProductIds(coupon.applicableProductIds || []);
    
    // Scroll to form (optional)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!coupon.id) return;
    try {
      await deleteCouponFromFirebase(coupon.id);
      setCoupons(prev => prev.filter(c => c.id !== coupon.id));
      toast.success(`تم حذف الكوبون "${coupon.code}"`);
    } catch {
      toast.error('فشل في حذف الكوبون');
    }
  };

  return (
    <div className="border border-purple-200 rounded-2xl overflow-hidden shadow-sm bg-white">
      {/* Header Toggle */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-purple-100">
            <Ticket className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-900 text-base">إدارة كوبونات الخصم</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {coupons.length > 0 && !loadingList ? `${coupons.length} كوبون نشط` : 'أضف وأدر كوبونات الخصم'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {coupons.length > 0 && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold text-xs">
              {coupons.length}
            </Badge>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-6 space-y-6">
          {/* Add New Coupon Form */}
          <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/60 rounded-xl p-5 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                {editingCouponId ? <Edit2 className="w-4 h-4 text-purple-600" /> : <Plus className="w-4 h-4 text-purple-600" />}
                {editingCouponId ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}
              </h4>
              {editingCouponId && (
                <Button variant="ghost" size="sm" onClick={() => { setEditingCouponId(null); resetForm(); }} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8">
                  إلغاء التعديل
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Code */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">رمز الكوبون <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="مثال: SAVE20"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="bg-white uppercase font-bold tracking-widest text-center h-10"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">وصف (اختياري)</Label>
                <Input
                  placeholder="مثال: عرض الصيف"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="bg-white h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">نوع الخصم <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setType('percentage')}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg border-2 text-sm font-bold transition-all ${
                      type === 'percentage'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Percent className="w-4 h-4" /> نسبة مئوية
                  </button>
                  <button
                    onClick={() => setType('fixed')}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg border-2 text-sm font-bold transition-all ${
                      type === 'fixed'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" /> مبلغ ثابت
                  </button>
                </div>
              </div>

              {/* Value */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  القيمة <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal mr-1">
                    {type === 'percentage' ? '(%)' : '(جنيه)'}
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={type === 'percentage' ? 'مثال: 15' : 'مثال: 100'}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="bg-white h-10 pr-10"
                    min="1"
                    max={type === 'percentage' ? '100' : undefined}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">
                    {type === 'percentage' ? '%' : '£'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Max Uses */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">الحد الأقصى للاستخدام <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                <Input
                  type="number"
                  placeholder="عدد المرات (مثال: 5)"
                  value={usageLimit}
                  onChange={e => setUsageLimit(e.target.value)}
                  className="bg-white h-10"
                  min="1"
                />
              </div>

              {/* Valid From */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">صالح من <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                <Input
                  type="datetime-local"
                  value={validFrom}
                  onChange={e => setValidFrom(e.target.value)}
                  className="bg-white h-10"
                />
              </div>

              {/* Valid Until */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">صالح حتى <span className="text-gray-400 font-normal">(اختياري)</span></Label>
                <Input
                  type="datetime-local"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="bg-white h-10"
                />
              </div>
            </div>

            {/* Applicable Products */}
            <div className="mb-4 space-y-2">
              <Label className="text-xs font-semibold text-gray-700 block">
                المنتجات المشمولة{' '}
                <span className="text-gray-400 font-normal">(اختياري — فارغة = على جميع المنتجات)</span>
              </Label>

              {/* ── Filters Bar ── */}
              {(() => {
                const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort() as string[];
                const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort() as string[];
                const hasActiveFilter = searchQuery || filterCategory || filterBrand || filterMinPrice || filterMaxPrice;

                const filteredProducts = products.filter(p => {
                  if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  if (filterCategory && p.category !== filterCategory) return false;
                  if (filterBrand && p.brand !== filterBrand) return false;
                  if (filterMinPrice && p.price < Number(filterMinPrice)) return false;
                  if (filterMaxPrice && p.price > Number(filterMaxPrice)) return false;
                  return true;
                });

                return (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="ابحث عن منتج باسمه..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white h-9 pr-9 text-sm"
                      />
                    </div>

                    {/* Filter Row */}
                    <div className="bg-purple-50/60 border border-purple-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          فلترة المنتجات
                        </span>
                        {hasActiveFilter && (
                          <button
                            onClick={() => {
                              setSearchQuery(''); setFilterCategory('');
                              setFilterBrand(''); setFilterMinPrice(''); setFilterMaxPrice('');
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                          >
                            <X className="w-3 h-3" /> مسح الفلاتر
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Category */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-gray-600">الفئة</span>
                          <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="w-full h-8 text-xs border border-gray-200 rounded-md bg-white px-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          >
                            <option value="">جميع الفئات</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Brand */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-gray-600">الماركة</span>
                          <select
                            value={filterBrand}
                            onChange={e => setFilterBrand(e.target.value)}
                            className="w-full h-8 text-xs border border-gray-200 rounded-md bg-white px-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          >
                            <option value="">جميع الماركات</option>
                            {brands.map(brand => (
                              <option key={brand} value={brand}>{brand}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Price Range */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-gray-600">السعر (جنيه)</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="من"
                            value={filterMinPrice}
                            onChange={e => setFilterMinPrice(e.target.value)}
                            min="0"
                            className="bg-white h-8 text-xs text-center"
                          />
                          <span className="text-gray-400 text-xs shrink-0">—</span>
                          <Input
                            type="number"
                            placeholder="إلى"
                            value={filterMaxPrice}
                            onChange={e => setFilterMaxPrice(e.target.value)}
                            min="0"
                            className="bg-white h-8 text-xs text-center"
                          />
                        </div>
                      </div>

                      {hasActiveFilter && (
                        <p className="text-[11px] text-purple-600 font-medium">
                          يُعرض {filteredProducts.length} من أصل {products.length} منتج
                        </p>
                      )}
                    </div>

                    {/* Product Checkboxes */}
                    <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white space-y-0.5">
                      {filteredProducts.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-4">لا توجد منتجات مطابقة</p>
                      ) : (
                        filteredProducts.map(p => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-purple-50 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={applicableProductIds.includes(p.id!)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setApplicableProductIds(prev => [...prev, p.id!]);
                                } else {
                                  setApplicableProductIds(prev => prev.filter(id => id !== p.id));
                                }
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer shrink-0"
                            />
                            <span className="text-sm text-gray-700 flex-1 line-clamp-1 min-w-0">{p.name}</span>
                            <span className="text-xs font-semibold text-purple-700 shrink-0 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                              {p.price.toLocaleString('ar-EG')} جنيه
                            </span>
                          </label>
                        ))
                      )}
                    </div>

                    {/* Selected count badge */}
                    {applicableProductIds.length > 0 && (
                      <p className="text-xs text-indigo-600 font-semibold">
                        ✓ تم اختيار {applicableProductIds.length} منتج
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Preview */}
            {code && value && (
              <div className="mb-4 bg-white rounded-lg border border-purple-100 px-4 py-2.5 flex items-center gap-3">
                <Tag className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-sm text-gray-600">
                  الكوبون <strong className="text-purple-700 font-black tracking-wider">{code}</strong> يعطي خصم{' '}
                  <strong className="text-green-700">
                    {type === 'percentage' ? `${value}%` : `${value} جنيه`}
                  </strong>
                </span>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={adding || !code || !value}
              className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
            >
              {adding ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> جاري الحفظ...</>
              ) : (
                <>{editingCouponId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />} {editingCouponId ? 'تحديث الكوبون' : 'إضافة الكوبون'}</>
              )}
            </Button>
          </div>

          {/* Coupons List */}
          <div>
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3 text-sm">
              <Ticket className="w-4 h-4 text-gray-500" />
              الكوبونات الحالية
            </h4>

            {loadingList ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                جاري التحميل...
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد كوبونات. أضف أول كوبون!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {coupons.map(coupon => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-xl px-4 py-3 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${coupon.type === 'percentage' ? 'bg-purple-100' : 'bg-green-100'}`}>
                        {coupon.type === 'percentage'
                          ? <Percent className="w-4 h-4 text-purple-600" />
                          : <DollarSign className="w-4 h-4 text-green-600" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 tracking-wider font-mono text-sm">
                            {coupon.code}
                          </span>
                          <Badge className={`text-xs font-bold ${
                            coupon.type === 'percentage'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {coupon.type === 'percentage' ? `${coupon.value}% خصم` : `${coupon.value} جنيه خصم`}
                          </Badge>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{coupon.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {coupon.createdAt && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                              تاريخ الإنشاء: {new Date(coupon.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                          {coupon.applicableProductIds && coupon.applicableProductIds.length > 0 && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                              منتجات مخصصة ({coupon.applicableProductIds.length})
                            </span>
                          )}
                          {coupon.usageLimit && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                              الاستخدام: {coupon.usedCount || 0} / {coupon.usageLimit}
                            </span>
                          )}
                          {coupon.validFrom && (
                            <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">
                              من: {new Date(coupon.validFrom).toLocaleString('ar-EG')}
                            </span>
                          )}
                          {coupon.validUntil && (
                            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                              إلى: {new Date(coupon.validUntil).toLocaleString('ar-EG')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(coupon)}
                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(coupon)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
