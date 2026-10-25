import { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Palette, Image as ImageIcon, Type, Phone, Save, RefreshCw,
  Paintbrush, LayoutDashboard, Check, Globe, LayoutTemplate,
  Trash2, Plus, MonitorSmartphone, CreditCard, Layout, MapPin, ExternalLink,
  Search, Link as LinkIcon, FileText, Share2, Sparkles, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  SiteSettings, DEFAULT_SETTINGS, PRESET_THEMES, FONT_OPTIONS, RADIUS_OPTIONS, SHADOW_OPTIONS,
  CARD_THEMES, PRODUCT_PAGE_THEMES, HOME_SEARCH_THEMES,
  getSiteSettings, saveSiteSettings, applyThemeToDocument, clearSettingsCache,
  Branch,
} from '@/lib/siteSettings';
import { HeroImageUploader } from '@/components/HeroImageUploader';
import { storage } from '@/lib/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { useStore } from '@/store/useStore';
import { getCategoryLabel } from '@/utils/categorySlug';

// ─── Sidebar tabs ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'theme', label: 'الألوان والثيم', icon: Palette },
  { id: 'typography', label: 'الخطوط والمظهر', icon: Type },
  { id: 'cardtheme', label: 'ثيم كرت المنتج', icon: CreditCard },
  { id: 'pagetheme', label: 'ثيم صفحة المنتجات', icon: Layout },
  { id: 'branding', label: 'الشعار والهوية', icon: ImageIcon },
  { id: 'home', label: 'الصفحة الرئيسية', icon: LayoutTemplate },
  { id: 'pages', label: 'الصفحات الداخلية', icon: LayoutDashboard },
  { id: 'contact', label: 'التواصل والفوتر', icon: Phone },
  { id: 'seo', label: 'تحسين محركات البحث', icon: Search },
  { id: 'splash', label: 'شاشة التحميل', icon: Sparkles },
];

const FILTER_OPTIONS = [
  { id: 'special-offer', label: 'العروض الخاصة' },
  { id: 'price', label: 'السعر' },
  { id: 'sort', label: 'الترتيب' },
  { id: 'category', label: 'القسم' },
  { id: 'subcategory', label: 'القسم الفرعي' },
  { id: 'brand', label: 'الماركة' },
  { id: 'features', label: 'مميزات خاصة' },
  { id: 'screen-size', label: 'حجم الشاشة' },
  { id: 'processor-brand', label: 'نوع المعالج' },
  { id: 'processor-series', label: 'فئة المعالج' },
  { id: 'processor-gen', label: 'جيل المعالج' },
  { id: 'gpu', label: 'كرت الشاشة' },
  { id: 'integrated-gpu', label: 'كرت الشاشة المدمج' },
  { id: 'processor-name', label: 'المعالج' },
];

// ─── Color field ──────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange, isHex = false }: {
  label: string; value: string;
  onChange: (v: string) => void;
  isHex?: boolean;
}) {
  const hslToHex = (hsl: string) => {
    try {
      if (hsl.startsWith('#')) return hsl;
      const [h, s, l] = hsl.trim().split(/\s+/).map(parseFloat);
      const sN = s / 100, lN = l / 100;
      const a = sN * Math.min(lN, 1 - lN);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = lN - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * c).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    } catch { return '#3b82f6'; }
  };

  const hexToHsl = (hex: string) => {
    if (isHex) return hex;
    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch { return value; }
  };

  const displayValue = isHex ? value : hslToHex(value);

  return (
    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-md overflow-hidden border border-gray-200 shrink-0 relative">
        <input
          type="color"
          value={displayValue}
          onChange={e => onChange(hexToHsl(e.target.value))}
          className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer p-0 m-0"
        />
      </div>
      <div className="flex-1">
        <Label className="text-sm font-semibold text-gray-700">{label}</Label>
        <p className="text-xs text-gray-400 font-mono mt-0.5" dir="ltr">{value}</p>
      </div>
    </div>
  );
}

// ─── ImageField ───────────────────────────────────────────────────────────────
function ImageField({ label, value, onChange, description }: {
  label: string; value: string; onChange: (v: string) => void; description?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-gray-800">{label}</Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="/image.png أو رابط مباشر https://..."
            dir="ltr"
            className="text-sm bg-gray-50/50"
          />
        </div>
        {value && (
          <div className="w-16 h-10 rounded-md border border-gray-200 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center p-1">
            <img
              src={value}
              alt=""
              className="max-w-full max-h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SiteCustomizer() {
  const [activeTab, setActiveTab] = useState('theme');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Derive unique categories from products and allCategories
  const products = useStore(state => state.products);
  const allCategories = useStore(state => state.allCategories);
  const loadProducts = useStore(state => state.loadProducts);
  const loadAllCategories = useStore(state => state.loadAllCategories);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    (allCategories || []).forEach(c => { if (c) cats.add(c); });
    (products || []).forEach(p => { if (p.category && !p.isArchived) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products, allCategories]);
  // ── System tab state ──────────────────────────────────────────────────────

  const load = useCallback(async () => {

    setLoading(true);
    try {
      const s = await getSiteSettings(false); // force fetch
      // Normalize defaultProductCategory: old Firebase data may be a string
      const rawCat = s.defaultProductCategory as any;
      const normalizedCat: string[] = Array.isArray(rawCat)
        ? rawCat.filter(Boolean)
        : typeof rawCat === 'string' && rawCat.trim()
          ? [rawCat.trim()]
          : [];
      setSettings({ ...s, defaultProductCategory: normalizedCat });
      applyThemeToDocument(s); // Apply initial theme
    } catch { toast.error('فشل تحميل الإعدادات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    if (loadProducts) loadProducts();
    if (loadAllCategories) loadAllCategories();
  }, [load, loadProducts, loadAllCategories]);

  // Live preview effect (debounced slightly for performance)
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      applyThemeToDocument(settings);
    }, 100);
    return () => clearTimeout(timer);
  }, [settings, loading]);

  const update = (patch: Partial<SiteSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const updateColors = (patch: Partial<SiteSettings['customColors']>) => {
    setSettings(prev => ({
      ...prev,
      activeThemeId: 'custom',
      customColors: { ...prev.customColors, ...patch },
    }));
    setHasChanges(true);
  };

  const moveHeroSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.heroCarousel.length) return;
    const newSlides = [...settings.heroCarousel];
    const [movedSlide] = newSlides.splice(index, 1);
    newSlides.splice(targetIndex, 0, movedSlide);
    update({ heroCarousel: newSlides });
  };

  const reorderHeroSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= settings.heroCarousel.length || fromIndex === toIndex) return;
    const newSlides = [...settings.heroCarousel];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);
    update({ heroCarousel: newSlides });
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveSiteSettings(settings);
    setSaving(false);
    if (result.success) {
      toast.success('تم حفظ الإعدادات بنجاح! 🎉');
      setHasChanges(false);
    } else {
      toast.error(result.error || 'فشل الحفظ');
    }
  };

  const resetToDefault = () => {
    if (confirm('هل أنت متأكد من استعادة الإعدادات الافتراضية؟ سيتم مسح جميع تعديلاتك.')) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
      toast.info('تمت استعادة الإعدادات الافتراضية. لا تنسَ الحفظ.');
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex flex-col font-cairo">
      <Helmet>
        <title>تخصيص الموقع - لوحة التحكم</title>
      </Helmet>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Paintbrush className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">تخصيص الموقع</h1>
              <p className="text-xs text-gray-500">تحكم كامل في مظهر ومحتوى متجرك</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                يوجد تعديلات غير محفوظة
              </span>
            )}

            <div className="hidden md:flex bg-gray-100 p-1 rounded-lg border border-gray-200 mr-2">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-900'}`}
                title="معاينة سطح المكتب"
              >
                <MonitorSmartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-900'}`}
                title="معاينة الهاتف"
              >
                <MonitorSmartphone className="w-4 h-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 bg-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">إلغاء</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ...</>
              ) : (
                <><Save className="w-4 h-4" /> حفظ التغييرات</>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-64 shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-4 space-y-1 flex-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">إعدادات المظهر</h3>

            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-right group ${active
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                    <tab.icon className="w-4 h-4 shrink-0" />
                  </div>
                  {tab.label}
                  {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-violet-600" />}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Links */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:text-violet-700 transition-colors rounded-lg hover:bg-white border border-transparent hover:border-gray-200 shadow-sm"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              زيارة الموقع
            </a>
            <a
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:text-violet-700 transition-colors rounded-lg hover:bg-white border border-transparent hover:border-gray-200 shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-gray-400" />
              لوحة التحكم
            </a>

            <div className="pt-4 mt-2 border-t border-gray-200">
              <button
                onClick={resetToDefault}
                className="w-full text-right text-xs text-red-500 hover:text-red-700 px-3 py-2"
              >
                استعادة الافتراضيات
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Panel (Editor Area) ── */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className={`mx-auto transition-all duration-300 ${previewMode === 'mobile' ? 'max-w-md' : 'max-w-3xl'}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="h-10 w-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
                <p className="text-gray-500 text-sm animate-pulse">جاري تحميل الإعدادات...</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* ── THEME TAB ── */}
                {activeTab === 'theme' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">الألوان والثيم</h2>
                      <p className="text-sm text-gray-500 mb-6">اختر ثيماً جاهزاً أو قم بتخصيص الألوان بدقة لتناسب هويتك التجارية.</p>
                    </div>

                    <Card className="border-violet-100 shadow-sm overflow-hidden">
                      <div className="bg-violet-50/50 px-6 py-4 border-b border-violet-100">
                        <CardTitle className="text-base text-violet-900">الثيمات الجاهزة</CardTitle>
                      </div>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {PRESET_THEMES.map(theme => {
                            const active = settings.activeThemeId === theme.id;
                            return (
                              <button
                                key={theme.id}
                                onClick={() => update({ activeThemeId: theme.id })}
                                className={`relative p-4 rounded-xl border-2 transition-all text-right group flex flex-col gap-3 ${active
                                    ? 'border-violet-500 bg-violet-50/30 ring-4 ring-violet-500/10'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white'
                                  }`}
                              >
                                {active && (
                                  <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shadow-md">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <div className="w-8 h-8 rounded-full border border-black/10 shadow-sm" style={{ background: `hsl(${theme.primary})` }} />
                                  <div className="w-8 h-8 rounded-full border border-black/10 shadow-sm -mr-3" style={{ background: `hsl(${theme.secondary})` }} />
                                  <div className="w-8 h-8 rounded-full border border-black/10 shadow-sm -mr-3" style={{ background: `hsl(${theme.accent})` }} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{theme.name}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>ألوان مخصصة</span>
                          {settings.activeThemeId !== 'custom' && (
                            <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                              تغيير أي لون سيُلغي الثيم الجاهز
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorField
                            label="اللون الأساسي (Primary)"
                            value={settings.customColors.primary}
                            onChange={v => updateColors({ primary: v })}
                          />
                          <ColorField
                            label="اللون الثانوي (Secondary)"
                            value={settings.customColors.secondary}
                            onChange={v => updateColors({ secondary: v })}
                          />
                          <ColorField
                            label="لون التمييز (Accent)"
                            value={settings.customColors.accent}
                            onChange={v => updateColors({ accent: v })}
                          />
                          <ColorField
                            label="لون خلفية الموقع"
                            value={settings.customColors.background}
                            onChange={v => updateColors({ background: v })}
                          />

                          <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                            <h4 className="text-sm font-bold text-gray-700 mb-4">ألوان الشريط العلوي والفوتر</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ColorField
                                label="خلفية الشريط العلوي (Topbar)"
                                value={settings.customColors.topbarBg}
                                isHex={true}
                                onChange={v => updateColors({ topbarBg: v })}
                              />
                              <ColorField
                                label="خلفية الفوتر (Footer)"
                                value={settings.customColors.footerBg}
                                isHex={true}
                                onChange={v => updateColors({ footerBg: v })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Live preview chips */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">معاينة التباين</p>
                          <div className="flex flex-wrap gap-3">
                            <div className="px-4 py-2 rounded-lg text-sm shadow-sm" style={{ background: `hsl(${settings.customColors.primary})`, color: 'white' }}>
                              زر أساسي
                            </div>
                            <div className="px-4 py-2 rounded-lg text-sm shadow-sm" style={{ background: `hsl(${settings.customColors.secondary})`, color: 'white' }}>
                              زر ثانوي
                            </div>
                            <div className="px-4 py-2 rounded-full text-xs font-bold shadow-sm" style={{ background: `hsl(${settings.customColors.accent})` }}>
                              شريطة مميزة
                            </div>
                            <div className="px-4 py-2 rounded-lg text-sm shadow-sm text-white flex items-center gap-2" style={{ backgroundColor: settings.customColors.topbarBg }}>
                              <Phone className="w-3 h-3" /> الشريط العلوي
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── TYPOGRAPHY TAB ── */}
                {activeTab === 'typography' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">الخطوط والمظهر</h2>
                      <p className="text-sm text-gray-500 mb-6">تحكم في نوع الخط وشكل زوايا العناصر في الموقع.</p>
                    </div>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">الخطوط</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>نوع الخط الأساسي (يجب أن يدعم اللغة العربية)</Label>
                          <Select
                            value={settings.fontFamily}
                            onValueChange={v => update({ fontFamily: v })}
                          >
                            <SelectTrigger className="w-full md:w-1/2">
                              <SelectValue placeholder="اختر الخط" />
                            </SelectTrigger>
                            <SelectContent>
                              {FONT_OPTIONS.map(font => (
                                <SelectItem key={font.value} value={font.value}>
                                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 mt-4">
                          <p className="text-2xl font-bold mb-2" style={{ fontFamily: settings.fontFamily }}>
                            تصفح أحدث المنتجات الإلكترونية
                          </p>
                          <p className="text-gray-600 leading-relaxed" style={{ fontFamily: settings.fontFamily }}>
                            هذا النص هو معاينة لشكل الخط الذي قمت باختياره. يطبق هذا الخط على العناوين والنصوص والأزرار في جميع أنحاء المتجر.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">تكوير الزوايا (Border Radius)</CardTitle></CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {RADIUS_OPTIONS.map(radius => {
                            const active = settings.borderRadius === radius.value;
                            return (
                              <button
                                key={radius.value}
                                onClick={() => update({ borderRadius: radius.value })}
                                className={`flex flex-col items-center gap-3 p-3 border-2 transition-all ${active ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
                                  }`}
                                style={{ borderRadius: radius.value }}
                              >
                                <div
                                  className="w-12 h-12 bg-violet-100 border border-violet-200 flex items-center justify-center"
                                  style={{ borderRadius: radius.value }}
                                >
                                  {active && <Check className="w-5 h-5 text-violet-600" />}
                                </div>
                                <span className="text-xs font-semibold">{radius.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">حجم الظل (Global Shadow)</CardTitle></CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {SHADOW_OPTIONS.map(shadow => {
                            const active = settings.globalShadow === shadow.value;
                            // Preview class logic
                            let previewShadowClass = 'shadow-md';
                            if (shadow.value === 'none') previewShadowClass = 'shadow-none border border-gray-200';
                            if (shadow.value === 'light') previewShadowClass = 'shadow-sm border border-gray-100';
                            if (shadow.value === 'strong') previewShadowClass = 'shadow-xl';

                            return (
                              <button
                                key={shadow.value}
                                onClick={() => update({ globalShadow: shadow.value as any })}
                                className={`flex flex-col items-center gap-3 p-4 border-2 rounded-xl transition-all ${active ? 'border-violet-500 bg-violet-50' : 'border-transparent hover:bg-gray-50'
                                  }`}
                              >
                                <div
                                  className={`w-16 h-16 bg-white flex items-center justify-center rounded-lg ${previewShadowClass}`}
                                >
                                  {active && <Check className="w-5 h-5 text-violet-600" />}
                                </div>
                                <span className="text-xs font-bold text-gray-700">{shadow.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── CARD THEME TAB ── */}
                {activeTab === 'cardtheme' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">ثيم كرت المنتج</h2>
                      <p className="text-sm text-gray-500 mb-6">اختر شكل بطاقات المنتجات التي تظهر في صفحة التصفح. التغيير يُطبق فوراً على جميع الصفحات.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      {CARD_THEMES.map(theme => {
                        const active = settings.cardTheme === theme.id;
                        const isBold = theme.id === 'bold';
                        return (
                          <button
                            key={theme.id}
                            onClick={() => update({ cardTheme: theme.id })}
                            className={`relative text-right rounded-2xl border-2 overflow-hidden transition-all duration-200 ${active ? 'border-violet-500 ring-4 ring-violet-500/10' : 'border-gray-200 hover:border-violet-300'}`}
                          >
                            {active && (
                              <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shadow-md">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            {/* Live mini preview */}
                            <div className={`p-4 ${isBold ? 'bg-gray-950' : 'bg-gray-100'}`}>
                              <div className={`w-full max-w-[200px] mx-auto rounded-xl overflow-hidden ${theme.preview.border} ${theme.preview.shadow} ${theme.preview.cardBg} transition-all`}>
                                {/* Image area */}
                                <div className={`h-24 flex items-center justify-center ${theme.preview.imageBg} ${theme.preview.roundedImage}`}>
                                  <div className="text-3xl">💻</div>
                                </div>
                                {/* Content */}
                                <div className={`p-3 space-y-2 ${isBold ? 'bg-gray-900' : ''}`}>
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${isBold ? 'text-primary/70' : 'text-primary/60'}`}>HP · Laptop</p>
                                  <p className={`text-xs font-bold leading-tight ${isBold ? 'text-white' : 'text-gray-800'}`}>HP EliteBook 840 G8</p>
                                  <div className={`text-sm font-black ${theme.preview.priceColor}`}>12,500 ج</div>
                                  <div className={`w-full text-center text-[11px] font-bold py-1.5 rounded-lg transition-all ${theme.preview.btnStyle}`}>
                                    عرض التفاصيل
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Label */}
                            <div className={`px-5 py-3 flex items-center justify-between ${active ? 'bg-violet-50' : 'bg-white'}`}>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{theme.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{theme.description}</p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                {active ? 'مُفعَّل' : 'اختيار'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── PRODUCT PAGE THEME TAB ── */}
                {activeTab === 'pagetheme' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">ثيم صفحة المنتج</h2>
                      <p className="text-sm text-gray-500 mb-6">اختر الشكل العام لصفحة تفاصيل كل منتج — خلفية الصفحة، أسلوب الصورة، وتصميم العنوان.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {PRODUCT_PAGE_THEMES.map(theme => {
                        const active = settings.productPageTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => update({ productPageTheme: theme.id })}
                            className={`relative text-right rounded-2xl border-2 overflow-hidden transition-all duration-200 w-full ${active ? 'border-violet-500 ring-4 ring-violet-500/10' : 'border-gray-200 hover:border-violet-300'}`}
                          >
                            {active && (
                              <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shadow-md">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}

                            {/* Layout-based preview panel */}
                            <div className="w-full h-36 overflow-hidden relative flex bg-gray-50/50 p-2 gap-2 border-b border-gray-100">
                              {/* Content wrapper depending on layout */}
                              {theme.layoutHint === 'side-by-side' && (
                                <div className="flex w-full h-full gap-3 bg-white rounded-lg shadow-sm border border-gray-100 p-2">
                                  <div className="w-1/2 h-full bg-gray-100 rounded-md flex items-center justify-center border border-gray-200">
                                    <span className="text-2xl opacity-40">🖼</span>
                                  </div>
                                  <div className="w-1/2 h-full flex flex-col justify-center gap-1.5 py-1">
                                    <div className="w-3/4 h-2 bg-gray-800 rounded"></div>
                                    <div className="w-1/2 h-2 bg-gray-300 rounded"></div>
                                    <div className="mt-auto w-full h-6 bg-primary/20 border border-primary/30 rounded flex items-center justify-center">
                                      <div className="w-1/3 h-1.5 bg-primary/50 rounded"></div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {theme.layoutHint === 'reversed' && (
                                <div className="flex w-full h-full gap-4 bg-white p-3">
                                  <div className="w-[55%] h-full flex flex-col justify-center gap-2">
                                    <div className="w-[90%] h-4 bg-gray-900 rounded-sm"></div>
                                    <div className="w-[90%] h-[3px] bg-primary"></div>
                                    <div className="w-3/4 h-1.5 bg-gray-300 rounded mt-2"></div>
                                    <div className="w-1/2 h-1.5 bg-gray-300 rounded"></div>
                                    <div className="mt-auto w-full h-5 bg-gray-900 rounded flex items-center justify-center"></div>
                                  </div>
                                  <div className="w-[45%] h-full bg-gray-100 rounded flex items-center justify-center">
                                    <span className="text-2xl opacity-40">🖼</span>
                                  </div>
                                </div>
                              )}

                              {theme.layoutHint === 'stacked' && (
                                <div className="flex flex-col w-full h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                  <div className="w-full h-16 bg-gray-100 flex items-center justify-center">
                                    <span className="text-xl opacity-40">🖼</span>
                                  </div>
                                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                                    <div className="w-2/3 h-2.5 bg-gray-900 rounded-full"></div>
                                    <div className="w-1/3 h-1.5 bg-gray-400 rounded-full"></div>
                                    <div className="w-1/2 h-4 mt-1 bg-primary rounded-full"></div>
                                  </div>
                                </div>
                              )}

                              {theme.layoutHint === 'narrow-image' && (
                                <div className="flex w-full h-full gap-3 bg-gray-50">
                                  <div className="w-[35%] h-full bg-transparent flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                    <span className="text-xl opacity-40">🖼</span>
                                  </div>
                                  <div className="w-[65%] h-full bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-center gap-2">
                                    <div className="w-4/5 h-2.5 bg-gray-800 rounded"></div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded"></div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded"></div>
                                    <div className="w-3/4 h-1.5 bg-gray-200 rounded"></div>
                                    <div className="mt-auto w-1/2 h-5 bg-primary/10 border border-primary text-primary rounded flex items-center justify-center"></div>
                                  </div>
                                </div>
                              )}

                              {theme.layoutHint === 'wide-image' && (
                                <div className="flex w-full h-full gap-3 bg-white p-2 border border-gray-100 rounded-lg">
                                  <div className="w-[60%] h-full bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')]"></div>
                                    <span className="text-2xl text-white opacity-50 relative z-10">📸</span>
                                  </div>
                                  <div className="w-[40%] h-full flex flex-col justify-center gap-1.5 py-2">
                                    <div className="w-full h-2 bg-gray-800 rounded"></div>
                                    <div className="w-2/3 h-1.5 bg-gray-400 rounded"></div>
                                    <div className="mt-auto w-full h-6 bg-gray-900 rounded flex items-center justify-center"></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Label */}
                            <div className={`px-5 py-3 flex items-center justify-between ${active ? 'bg-violet-50' : 'bg-white'}`}>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{theme.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{theme.description}</p>
                              </div>
                              <div className={`shrink-0 mr-3 px-3 py-1 rounded-full text-xs font-semibold ${active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                {active ? 'مُفعَّل' : 'اختيار'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <Card className="border-amber-100 bg-amber-50/50 shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs text-amber-700 leading-relaxed">
                          <span className="font-bold">ملاحظة:</span> تغيير الثيم هنا سيؤثر على كيفية عرض صورة المنتج والمعلومات في صفحة المنتج الفردية. اختر التصميم الذي يناسب هوية متجرك أكثر.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm mt-6 border-t-4 border-t-violet-500">
                      <CardHeader>
                        <CardTitle className="text-base">تصفيات المنتجات المفتوحة افتراضياً (Filters)</CardTitle>
                        <CardDescription>اختر الفلاتر التي ترغب في أن تكون مفتوحة تلقائياً عند دخول المستخدم لصفحة المنتجات.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {FILTER_OPTIONS.map(opt => (
                            <Label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                              <Checkbox
                                checked={settings.defaultOpenFilters?.includes(opt.id) || false}
                                onCheckedChange={(checked) => {
                                  const current = settings.defaultOpenFilters || [];
                                  if (checked) {
                                    update({ defaultOpenFilters: [...current, opt.id] });
                                  } else {
                                    update({ defaultOpenFilters: current.filter(id => id !== opt.id) });
                                  }
                                }}
                              />
                              <span className="text-sm font-semibold text-gray-700">{opt.label}</span>
                            </Label>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm mt-6 border-t-4 border-t-blue-500">
                      <CardHeader>
                        <CardTitle className="text-base">الفئة الافتراضية في صفحة المنتجات</CardTitle>
                        <CardDescription>
                          عند فتح صفحة المنتجات بدون تحديد فئة، سيتم تصفية المنتجات تلقائياً حسب الفئات المحددة هنا.
                          إذا لم يتم تحديد أي فئة، سيتم عرض جميع المنتجات بدون أي تصفية.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {availableCategories.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">لا توجد فئات متاحة — أضف منتجات أولاً</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {availableCategories.map(cat => {
                              const selected = (settings.defaultProductCategory || []).includes(cat);
                              const label = getCategoryLabel(cat);
                              return (
                                <Label
                                  key={cat}
                                  className={`flex items-center gap-3 cursor-pointer p-3 border-2 rounded-xl transition-all ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) => {
                                      const current = settings.defaultProductCategory || [];
                                      update({
                                        defaultProductCategory: checked
                                          ? [...current, cat]
                                          : current.filter(c => c !== cat)
                                      });
                                    }}
                                  />
                                  <span className="text-sm font-semibold text-gray-700">
                                    {label !== cat ? `${label} (${cat})` : label}
                                  </span>
                                  {selected && <span className="mr-auto text-blue-500 text-xs">✓</span>}
                                </Label>
                              );
                            })}
                          </div>
                        )}
                        {(settings.defaultProductCategory || []).length > 0 ? (
                          <div className="flex items-center justify-between gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold">✓ الفئات الافتراضية المختارة:</span>
                              {(settings.defaultProductCategory || []).map(cat => (
                                <span key={cat} className="px-2 py-0.5 bg-blue-100 rounded-full text-xs font-semibold">
                                  {getCategoryLabel(cat)}
                                </span>
                              ))}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                              onClick={() => update({ defaultProductCategory: [] })}
                            >
                              إلغاء التحديد (عرض جميع المنتجات)
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600">
                            <span>ℹ️</span>
                            <span>الوضع الحالي: <strong>عرض جميع المنتجات بدون تصفية</strong></span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}



                {/* ── BRANDING TAB ── */}
                {activeTab === 'branding' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">الشعار والهوية</h2>
                      <p className="text-sm text-gray-500 mb-6">قم برفع شعارات المتجر والتحكم في اسم الموقع.</p>
                    </div>

                    <Card className="shadow-sm">
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                          <Label>اسم المتجر (يظهر في عنوان المتصفح والرسائل)</Label>
                          <Input
                            value={settings.storeName}
                            onChange={e => update({ storeName: e.target.value })}
                            placeholder="مثال: كمبيو سيف"
                            className="max-w-md"
                          />
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <ImageField
                            label="الشعار الأساسي (Logo)"
                            description="يُستخدم في الفوتر وصفحات تسجيل الدخول. يُفضل أن يكون بخلفية شفافة (PNG)."
                            value={settings.logoUrl}
                            onChange={v => update({ logoUrl: v })}
                          />
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <ImageField
                            label="شعار شريط التنقل (Navbar Logo)"
                            description="يظهر في الشريط العلوي للموقع. يجب أن يكون مناسباً لحجم الشريط."
                            value={settings.logoNavbarUrl}
                            onChange={v => update({ logoNavbarUrl: v })}
                          />
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <ImageField
                            label="أيقونة المتصفح (Favicon)"
                            description="الأيقونة الصغيرة التي تظهر في علامة تبويب المتصفح (يُفضل نسبة 1:1 مربعة)."
                            value={settings.faviconUrl}
                            onChange={v => update({ faviconUrl: v })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">روابط شريط التنقل (Navbar Links)</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>الرئيسية</Label>
                            <Input
                              value={settings.navLinks?.home || ''}
                              onChange={e => update({ navLinks: { ...settings.navLinks, home: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>المنتجات</Label>
                            <Input
                              value={settings.navLinks?.products || ''}
                              onChange={e => update({ navLinks: { ...settings.navLinks, products: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الجملة والتوريدات</Label>
                            <Input
                              value={settings.navLinks?.wholesale || ''}
                              onChange={e => update({ navLinks: { ...settings.navLinks, wholesale: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>من نحن</Label>
                            <Input
                              value={settings.navLinks?.about || ''}
                              onChange={e => update({ navLinks: { ...settings.navLinks, about: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>فروعنا</Label>
                            <Input
                              value={settings.navLinks?.locations || ''}
                              onChange={e => update({ navLinks: { ...settings.navLinks, locations: e.target.value } })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── HOME PAGE TAB ── */}
                {activeTab === 'home' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">الصفحة الرئيسية</h2>
                      <p className="text-sm text-gray-500 mb-6">تعديل البانرات المتحركة (الـ Slider) وأقسام العروض في الصفحة الأولى.</p>
                    </div>

                    <Card className="shadow-sm border-blue-100 bg-blue-50/20">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-bold text-gray-900">إظهار شريط البحث السريع</Label>
                            <p className="text-sm text-gray-500 mt-1">تفعيل هذا الخيار سيعرض شريط بحث في أعلى الصفحة الرئيسية لسهولة وصول الزوار للمنتجات.</p>
                          </div>
                          <Switch
                            checked={settings.showHomeSearch !== false}
                            onCheckedChange={checked => update({ showHomeSearch: checked })}
                          />
                        </div>

                        {settings.showHomeSearch !== false && (
                          <div className="pt-4 border-t border-blue-200/50">
                            <Label className="text-sm font-bold text-gray-800 mb-3 block">شكل شريط البحث</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {HOME_SEARCH_THEMES.map(theme => {
                                const radius = settings.borderRadius || '9999px';

                                let previewContent = null;

                                if (theme.id === 'minimal') {
                                  previewContent = (
                                    <div className="w-full p-4 bg-white border-b border-gray-100 flex flex-col items-center">
                                      <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-3"></div>
                                      <div className="w-full flex items-center border-b border-gray-300 pb-1 relative">
                                        <div className="w-full text-center text-[10px] text-gray-400 opacity-60">بحث...</div>
                                        <Search className="w-3 h-3 text-gray-400 absolute left-0" />
                                      </div>
                                    </div>
                                  );
                                } else if (theme.id === 'glass') {
                                  previewContent = (
                                    <div className="w-full p-4 bg-blue-50 relative overflow-hidden flex items-center justify-center">
                                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 opacity-50"></div>
                                      <div className="w-full p-1 bg-white/40 backdrop-blur-sm border border-white/60 shadow-md flex gap-1 z-10" style={{ borderRadius: radius }}>
                                        <div className="flex-1 bg-white/70 h-6 flex items-center pr-2" style={{ borderRadius: radius === '9999px' ? '9999px' : `calc(${radius} * 0.8)` }}>
                                          <Search className="w-2.5 h-2.5 text-gray-600" />
                                        </div>
                                        <div className="w-8 h-6 bg-gray-900 text-white flex items-center justify-center text-[8px] font-bold" style={{ borderRadius: radius === '9999px' ? '9999px' : `calc(${radius} * 0.8)` }}>
                                          بحث
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else if (theme.id === 'bold') {
                                  previewContent = (
                                    <div className="w-full p-4 bg-slate-900 flex flex-col gap-2 relative overflow-hidden">
                                      <div className="w-1/2 h-1.5 bg-slate-700 rounded-full"></div>
                                      <div className="flex gap-1 w-full">
                                        <div className="flex-1 h-6 bg-slate-800 border border-slate-700" style={{ borderRadius: radius }}></div>
                                        <div className="w-10 h-6 bg-blue-600 text-[8px] text-white flex items-center justify-center font-bold" style={{ borderRadius: radius }}>بحث</div>
                                      </div>
                                    </div>
                                  );
                                } else if (theme.id === 'bordered') {
                                  previewContent = (
                                    <div className="w-full p-4 bg-white border-b border-gray-100">
                                      <div className="w-full p-1 border-2 border-blue-200 bg-gray-50 flex items-center gap-1" style={{ borderRadius: radius }}>
                                        <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                          <Search className="w-2 h-2 text-blue-600" />
                                        </div>
                                        <div className="w-full h-1 bg-gray-200 rounded-full mx-1"></div>
                                        <div className="text-[8px] text-blue-600 font-bold px-1" style={{ borderRadius: radius === '9999px' ? '9999px' : `calc(${radius} * 0.8)` }}>اذهب</div>
                                      </div>
                                    </div>
                                  );
                                } else { // elegant
                                  previewContent = (
                                    <div className="w-full p-4 bg-gradient-to-b from-white to-gray-50 border-b border-gray-100 flex flex-col items-center">
                                      <div className="w-1/2 h-1.5 bg-gray-200 rounded-full mb-3"></div>
                                      <div className="relative flex items-center w-full">
                                        <div className="w-full h-8 border border-blue-100 bg-white" style={{ borderRadius: radius }}></div>
                                        <div className="absolute right-2"><Search className="w-3 h-3 text-gray-300" /></div>
                                        <div className="absolute left-1 top-1 bottom-1 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-[8px] font-bold text-white shadow-sm" style={{ borderRadius: radius === '9999px' ? '9999px' : `calc(${radius} * 0.8)` }}>بحث</div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={theme.id}
                                    onClick={() => update({ homeSearchTheme: theme.id as any })}
                                    className={`flex flex-col overflow-hidden border-2 rounded-xl text-right transition-all group ${settings.homeSearchTheme === theme.id
                                        ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
                                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                      }`}
                                  >
                                    {previewContent}
                                    <div className="p-3 bg-white w-full border-t border-gray-100">
                                      <span className={`block font-bold text-sm ${settings.homeSearchTheme === theme.id ? 'text-blue-700' : 'text-gray-800'}`}>
                                        {theme.name}
                                      </span>
                                      <span className="text-xs text-gray-500 mt-1 block">{theme.desc}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base">شرائح العرض الرئيسية (Hero Carousel)</CardTitle>
                          <CardDescription>الصور الكبيرة التي تظهر في أعلى الصفحة الرئيسية.</CardDescription>
                        </div>
                        {settings.heroCarouselSource !== 'static' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              const newSlide = {
                                id: `slide${Date.now()}`,
                                image: '',
                                storagePath: undefined,
                                buttonLink: '/products',
                              };
                              update({ heroCarousel: [...settings.heroCarousel, newSlide] });
                            }}
                          >
                            <Plus className="w-4 h-4" /> إضافة شريحة
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-5">

                        {/* ── Source Toggle ── */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                          <div>
                            <Label className="text-sm font-bold text-gray-800">تفعيل شرائح Firebase المخصصة</Label>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {settings.heroCarouselSource === 'static'
                                ? '🔒 مغلق: يتم عرض الصور الثابتة من الكود الأساسي الحالي (bg1.jpeg, bg2.jpeg)'
                                : '☁️ مفعّل: يتم عرض الصور المرفوعة على Firebase Storage مع الكاش الذكي'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              settings.heroCarouselSource === 'static'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {settings.heroCarouselSource === 'static' ? 'الكود الأساسي' : 'Firebase'}
                            </span>
                            <Switch
                              checked={settings.heroCarouselSource !== 'static'}
                              onCheckedChange={(checked) =>
                                update({ heroCarouselSource: checked ? 'firebase' : 'static' })
                              }
                            />
                          </div>
                        </div>

                        {/* ── Static Mode Info ── */}
                        {settings.heroCarouselSource === 'static' && (
                          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                            <span className="text-xl leading-none">⚠️</span>
                            <div>
                              <p className="font-bold">وضع الصور الثابتة مفعّل</p>
                              <p className="text-xs mt-1 text-amber-700">
                                الصفحة الرئيسية تستخدم الصور الافتراضية من الكود (<code className="bg-amber-100 px-1 rounded">bg1.jpeg</code> و <code className="bg-amber-100 px-1 rounded">bg2.jpeg</code>).
                                فعّل وضع Firebase لرفع صورك الخاصة.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* ── Firebase Slides ── */}
                        {settings.heroCarouselSource !== 'static' && (
                          <>
                            {settings.heroCarousel.length === 0 ? (
                              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">لا توجد شرائح حالياً. اضغط «إضافة شريحة» للبدء.</p>
                              </div>
                            ) : (
                              settings.heroCarousel.map((slide, i) => (
                                <div key={slide.id} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                                  {/* ── Slide Header with Order Controls ── */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-primary/10 text-primary font-extrabold w-7 h-7 rounded-lg flex items-center justify-center text-xs">
                                        {i + 1}
                                      </span>
                                      <div>
                                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                          شريحة العرض
                                          {i === 0 && (
                                            <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                              الأولى (الافتتاحية)
                                            </span>
                                          )}
                                        </h4>
                                      </div>
                                    </div>

                                    {/* Order & Action Controls */}
                                    <div className="flex items-center gap-1.5">
                                      {/* Direct Order Dropdown */}
                                      {settings.heroCarousel.length > 1 && (
                                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                                          <span className="text-xs text-gray-500 font-medium">الترتيب:</span>
                                          <select
                                            value={i}
                                            onChange={(e) => reorderHeroSlide(i, parseInt(e.target.value, 10))}
                                            className="h-8 border border-gray-300 rounded-lg px-2 text-xs bg-white font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                            title="تغيير ترتيب الشريحة مباشرة"
                                          >
                                            {settings.heroCarousel.map((_, idx) => (
                                              <option key={idx} value={idx}>
                                                #{idx + 1} {idx === 0 ? '(الأولى)' : ''}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      {/* Move Up */}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-600 hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed"
                                        disabled={i === 0}
                                        onClick={() => moveHeroSlide(i, 'up')}
                                        title="تقديم الشريحة لأعلى (تظهر قبل)"
                                      >
                                        <ArrowUp className="w-4 h-4" />
                                      </Button>

                                      {/* Move Down */}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-600 hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed"
                                        disabled={i === settings.heroCarousel.length - 1}
                                        onClick={() => moveHeroSlide(i, 'down')}
                                        title="تأخير الشريحة لأسفل (تظهر بعد)"
                                      >
                                        <ArrowDown className="w-4 h-4" />
                                      </Button>

                                      {/* Delete */}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          if (slide.storagePath) {
                                            try {
                                              await deleteObject(storageRef(storage, slide.storagePath));
                                            } catch (err) {
                                              console.warn('[SiteCustomizer] Could not delete slide image from storage:', err);
                                            }
                                          }
                                          update({ heroCarousel: settings.heroCarousel.filter((_, idx) => idx !== i) });
                                        }}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                                        title="حذف الشريحة"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    {/* Image Uploader */}
                                    <div className="space-y-1.5">
                                      <p className="text-sm font-semibold text-gray-800">صورة الشريحة</p>
                                      <HeroImageUploader
                                        value={slide.image}
                                        storagePath={slide.storagePath}
                                        onChange={(url, path) => {
                                          const updated = settings.heroCarousel.map((s, idx) =>
                                            idx === i ? { ...s, image: url, storagePath: path } : s
                                          );
                                          update({ heroCarousel: updated });
                                        }}
                                      />
                                    </div>

                                    {/* Button Link */}
                                    <div className="space-y-2">
                                      <p className="text-sm font-semibold text-gray-800">رابط الزر (أين يذهب المستخدم عند الضغط؟)</p>
                                      <Input
                                        value={slide.buttonLink}
                                        onChange={e => {
                                          const updated = settings.heroCarousel.map((s, idx) =>
                                            idx === i ? { ...s, buttonLink: e.target.value } : s
                                          );
                                          update({ heroCarousel: updated });
                                        }}
                                        dir="ltr"
                                        placeholder="/products أو /category/laptop"
                                        className="bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">قسم التوريدات والجملة</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ImageField
                          label="صورة خلفية القسم"
                          value={settings.wholesaleBannerImage}
                          onChange={v => update({ wholesaleBannerImage: v })}
                        />
                        <div className="space-y-2">
                          <Label>عنوان القسم</Label>
                          <Input
                            value={settings.wholesaleTitle}
                            onChange={e => update({ wholesaleTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف الترويجي</Label>
                          <Input
                            value={settings.wholesaleDescription}
                            onChange={e => update({ wholesaleDescription: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">عناوين قسم الفئات</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>العنوان الرئيسي (مثال: تصفح حسب القسم)</Label>
                          <Input
                            value={settings.categoryTitle}
                            onChange={e => update({ categoryTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>النص الفرعي</Label>
                          <Input
                            value={settings.categorySubtitle}
                            onChange={e => update({ categorySubtitle: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Testimonial Facebook Video */}
                    <Card className="shadow-sm border-blue-100">
                      <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base text-blue-900">فيديو آراء العملاء (فيسبوك)</CardTitle>
                            <CardDescription>اعرض فيديو فيسبوك لعميل يشارك تجربته مع المتجر</CardDescription>
                          </div>
                          <Switch
                            checked={settings.homeReview?.enabled !== false}
                            onCheckedChange={checked => update({ homeReview: { ...settings.homeReview, enabled: checked } })}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                          <Label>رابط فيديو فيسبوك</Label>
                          <Input
                            value={settings.homeReview?.videoUrl || ''}
                            onChange={e => update({ homeReview: { ...settings.homeReview, videoUrl: e.target.value } })}
                            placeholder="https://www.facebook.com/username/videos/xxxxxxxxxxxx/"
                            dir="ltr"
                          />
                          <p className="text-xs text-gray-400">انسخ رابط الفيديو بالكامل من فيسبوك.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>عنوان التقييم</Label>
                            <Input
                              value={settings.homeReview?.title || ''}
                              onChange={e => update({ homeReview: { ...settings.homeReview, title: e.target.value } })}
                              placeholder="مثال: تجربة شراء ممتازة!"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>التقييم (من 1 إلى 5)</Label>
                            <Select
                              value={String(settings.homeReview?.rating || 5)}
                              onValueChange={val => update({ homeReview: { ...settings.homeReview, rating: Number(val) } })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر التقييم" />
                              </SelectTrigger>
                              <SelectContent>
                                {[5, 4, 3, 2, 1].map(num => (
                                  <SelectItem key={num} value={String(num)}>
                                    {num} {num === 5 ? '★ ★ ★ ★ ★' : num === 4 ? '★ ★ ★ ★ ☆' : num === 3 ? '★ ★ ★ ☆ ☆' : num === 2 ? '★ ★ ☆ ☆ ☆' : '★ ☆ ☆ ☆ ☆'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>نص الرأي / تجربة الشراء</Label>
                          <textarea
                            value={settings.homeReview?.text || ''}
                            onChange={e => update({ homeReview: { ...settings.homeReview, text: e.target.value } })}
                            placeholder="اكتب تفاصيل تجربة العميل ورأيه هنا..."
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>اسم العميل</Label>
                            <Input
                              value={settings.homeReview?.authorName || ''}
                              onChange={e => update({ homeReview: { ...settings.homeReview, authorName: e.target.value } })}
                              placeholder="مثال: أحمد محمد"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>وظيفة أو لقب العميل (اختياري)</Label>
                            <Input
                              value={settings.homeReview?.authorTitle || ''}
                              onChange={e => update({ homeReview: { ...settings.homeReview, authorTitle: e.target.value } })}
                              placeholder="مثال: مهندس برمجيات"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── INNER PAGES TAB ── */}
                {activeTab === 'pages' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">الصفحات الداخلية</h2>
                      <p className="text-sm text-gray-500 mb-6">تحكم في محتويات وعناوين الصفحات الأخرى في الموقع (من نحن، فروعنا، الجملة).</p>
                    </div>

                    {/* Importer Feature Toggle */}
                    <Card className="shadow-sm border-blue-100 bg-blue-50/20">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-gray-900">هل أنت مستورد؟ (قسم التوريدات والجملة)</Label>
                          <p className="text-sm text-gray-500 mt-1">تفعيل هذا الخيار سيظهر صفحة "الجملة"، قسم الجملة في الصفحة الرئيسية، ومعلومات الاستيراد في صفحة "من نحن".</p>
                        </div>
                        <Switch
                          checked={settings.isImporter !== false}
                          onCheckedChange={checked => update({ isImporter: checked })}
                        />
                      </CardContent>
                    </Card>

                    {/* About Page */}
                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">صفحة "من نحن"</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>العنوان الرئيسي (Hero Title)</Label>
                          <Input
                            value={settings.aboutPage?.heroTitle || ''}
                            onChange={e => update({ aboutPage: { ...settings.aboutPage, heroTitle: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>العنوان الفرعي</Label>
                          <Input
                            value={settings.aboutPage?.heroSubtitle || ''}
                            onChange={e => update({ aboutPage: { ...settings.aboutPage, heroSubtitle: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف</Label>
                          <Input
                            value={settings.aboutPage?.heroDescription || ''}
                            onChange={e => update({ aboutPage: { ...settings.aboutPage, heroDescription: e.target.value } })}
                          />
                        </div>
                        <ImageField
                          label="الصورة الإعلانية (البانر)"
                          value={settings.aboutPage?.bannerImage || ''}
                          onChange={v => update({ aboutPage: { ...settings.aboutPage, bannerImage: v } })}
                        />

                        <div className="pt-4 mt-4 border-t border-gray-100 space-y-4">
                          <Label className="font-bold text-base text-gray-800">أرقام وإحصائيات المتجر (تظهر في صفحة من نحن)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-500">سنوات الخبرة</Label>
                              <Input
                                value={settings.aboutPage?.stats?.experience || ''}
                                onChange={e => update({ aboutPage: { ...settings.aboutPage, stats: { ...(settings.aboutPage?.stats || { sold: '', satisfaction: '', experience: '' }), experience: e.target.value } } })}
                                placeholder="+5"
                                dir="ltr"
                                className="text-right font-bold text-blue-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-500">لابتوب مباع</Label>
                              <Input
                                value={settings.aboutPage?.stats?.sold || ''}
                                onChange={e => update({ aboutPage: { ...settings.aboutPage, stats: { ...(settings.aboutPage?.stats || { sold: '', satisfaction: '', experience: '' }), sold: e.target.value } } })}
                                placeholder="+1000"
                                dir="ltr"
                                className="text-right font-bold text-blue-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-500">رضا العملاء</Label>
                              <Input
                                value={settings.aboutPage?.stats?.satisfaction || ''}
                                onChange={e => update({ aboutPage: { ...settings.aboutPage, stats: { ...(settings.aboutPage?.stats || { sold: '', satisfaction: '', experience: '' }), satisfaction: e.target.value } } })}
                                placeholder="100%"
                                dir="ltr"
                                className="text-right font-bold text-blue-600"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Wholesale Page */}
                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">صفحة التوريدات والجملة</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>العنوان الرئيسي (بجانب كلمة "توريدات وجملة أجهزة لابتوب")</Label>
                          <Input
                            value={settings.wholesalePage?.heroTitle || ''}
                            onChange={e => update({ wholesalePage: { ...settings.wholesalePage, heroTitle: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف تحت العنوان</Label>
                          <Input
                            value={settings.wholesalePage?.heroSubtitle || ''}
                            onChange={e => update({ wholesalePage: { ...settings.wholesalePage, heroSubtitle: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>عنوان نموذج الطلب</Label>
                          <Input
                            value={settings.wholesalePage?.formTitle || ''}
                            onChange={e => update({ wholesalePage: { ...settings.wholesalePage, formTitle: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>وصف نموذج الطلب</Label>
                          <Input
                            value={settings.wholesalePage?.formSubtitle || ''}
                            onChange={e => update({ wholesalePage: { ...settings.wholesalePage, formSubtitle: e.target.value } })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Locations Page */}
                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">صفحة "فروعنا"</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>العنوان الرئيسي</Label>
                          <Input
                            value={settings.locationsPage?.heroTitle || ''}
                            onChange={e => update({ locationsPage: { ...settings.locationsPage, heroTitle: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف أو الشعار</Label>
                          <Input
                            value={settings.locationsPage?.heroSubtitle || ''}
                            onChange={e => update({ locationsPage: { ...settings.locationsPage, heroSubtitle: e.target.value } })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Branches Manager */}
                    <Card className="shadow-sm border-emerald-100">
                      <CardHeader className="bg-emerald-50/60 border-b border-emerald-100 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base text-emerald-900 flex items-center gap-2">
                              <MapPin className="w-4 h-4" /> إدارة الفروع
                            </CardTitle>
                            <CardDescription className="text-emerald-700 mt-0.5">
                              أضف فروع متعددة مع خرائط Google
                            </CardDescription>
                          </div>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            onClick={() => {
                              const newBranch: Branch = {
                                id: `branch_${Date.now()}`,
                                name: 'فرع جديد',
                                address: '',
                                phone: '',
                                workingHours: '١٠ صباحاً - ١٠ مساءً',
                                googleMapsUrl: '',
                              };
                              update({ branches: [...(settings.branches || []), newBranch] });
                            }}
                          >
                            <Plus className="w-4 h-4" /> إضافة فرع
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {(settings.branches || []).length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">لا توجد فروع بعد. اضغط "إضافة فرع" للبدء.</p>
                          </div>
                        )}
                        {(settings.branches || []).map((branch, idx) => {
                          const updateBranch = (changes: Partial<Branch>) => {
                            const updated = [...(settings.branches || [])];
                            updated[idx] = { ...updated[idx], ...changes };
                            update({ branches: updated });
                          };
                          const removeBranch = () => {
                            const updated = (settings.branches || []).filter((_, i) => i !== idx);
                            update({ branches: updated });
                          };
                          // Extract embed URL from Google Maps share link
                          const getEmbedUrl = (url: string) => {
                            if (!url) return '';
                            const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                            if (match) {
                              return `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=ar&z=16&output=embed`;
                            }
                            return '';
                          };
                          const embedUrl = getEmbedUrl(branch.googleMapsUrl);
                          const isValidUrl = !!embedUrl;

                          return (
                            <div key={branch.id} className="border border-gray-200 rounded-xl overflow-hidden">
                              {/* Branch Header */}
                              <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">{idx + 1}</div>
                                  <span className="font-semibold text-gray-800 text-sm">{branch.name || 'فرع بدون اسم'}</span>
                                </div>
                                <button
                                  onClick={removeBranch}
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                  title="حذف الفرع"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Branch Fields */}
                              <div className="p-4 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">اسم الفرع *</Label>
                                    <Input
                                      value={branch.name}
                                      placeholder="مثال: الفرع الرئيسي - مدينة نصر"
                                      onChange={e => updateBranch({ name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">رقم الهاتف</Label>
                                    <Input
                                      value={branch.phone || ''}
                                      placeholder="01xxxxxxxxx"
                                      onChange={e => updateBranch({ phone: e.target.value })}
                                      dir="ltr"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">العنوان التفصيلي</Label>
                                  <Input
                                    value={branch.address}
                                    placeholder="مثال: ١٢ شارع مكرم عبيد، مدينة نصر، القاهرة"
                                    onChange={e => updateBranch({ address: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">مواعيد العمل</Label>
                                  <Input
                                    value={branch.workingHours || ''}
                                    placeholder="مثال: ١٠ صباحاً - ١٠ مساءً"
                                    onChange={e => updateBranch({ workingHours: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">رابط Google Maps *</Label>
                                  <div className="relative">
                                    <Input
                                      value={branch.googleMapsUrl}
                                      placeholder="https://www.google.com/maps/place/..."
                                      onChange={e => updateBranch({ googleMapsUrl: e.target.value })}
                                      dir="ltr"
                                      className={`pl-9 text-xs ${isValidUrl ? 'border-emerald-300 bg-emerald-50/30' : branch.googleMapsUrl ? 'border-red-300 bg-red-50/30' : ''}`}
                                    />
                                    <MapPin className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isValidUrl ? 'text-emerald-500' : 'text-gray-400'}`} />
                                  </div>
                                  {branch.googleMapsUrl && !isValidUrl && (
                                    <p className="text-xs text-red-500">الرابط لا يحتوي على إحداثيات صالحة. تأكد أن الرابط من Google Maps.</p>
                                  )}
                                  {isValidUrl && (
                                    <a
                                      href={branch.googleMapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mt-1"
                                    >
                                      <ExternalLink className="w-3 h-3" /> معاينة الموقع على الخريطة
                                    </a>
                                  )}
                                </div>

                                {/* Map Preview */}
                                {isValidUrl && (
                                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                    <iframe
                                      title={`map-${branch.id}`}
                                      src={embedUrl}
                                      width="100%"
                                      height="180"
                                      style={{ border: 0 }}
                                      allowFullScreen
                                      loading="lazy"
                                      referrerPolicy="no-referrer-when-downgrade"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── CONTACT & FOOTER TAB ── */}
                {activeTab === 'contact' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">التواصل والفوتر</h2>
                      <p className="text-sm text-gray-500 mb-6">إدارة بيانات الاتصال وروابط الشبكات الاجتماعية وإعدادات الشريط العلوي والفوتر.</p>
                    </div>

                    <Card className="shadow-sm border-blue-100">
                      <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base text-blue-900">الشريط العلوي (Topbar)</CardTitle>
                            <CardDescription>الشريط الصغير أعلى الموقع</CardDescription>
                          </div>
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                            <Label htmlFor="show-topbar" className="cursor-pointer text-sm">إظهار الشريط</Label>
                            <Switch
                              id="show-topbar"
                              checked={settings.showTopbar}
                              onCheckedChange={v => update({ showTopbar: v })}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <Label>رسالة إعلانية في الشريط العلوي (اختياري)</Label>
                          <Input
                            value={settings.topbarText || ''}
                            onChange={e => update({ topbarText: e.target.value })}
                            placeholder="مثال: شحن مجاني للطلبات فوق 1000 جنيه!"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">معلومات التواصل الأساسية</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <Label>رقم الهاتف للاتصال</Label>
                            <Input
                              value={settings.phone}
                              onChange={e => update({ phone: e.target.value })}
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>رقم الواتساب العام (يظهر في الهيدر والفوتر)</Label>
                            <Input
                              value={settings.whatsapp}
                              onChange={e => update({ whatsapp: e.target.value })}
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                              <span>رقم واتساب استلام الطلبات والحجوزات</span>
                            </Label>
                            <Input
                              value={settings.orderWhatsapp || ''}
                              onChange={e => update({ orderWhatsapp: e.target.value })}
                              placeholder={settings.whatsapp || '01146324540'}
                              dir="ltr"
                              className="border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-500"
                            />
                            <p className="text-xs text-muted-foreground">
                              يتم إرسال تفاصيل الطلب إليه تلقائياً عند تأكيد الشراء أونلاين أو حجز الفرع من السلة وصفحة المنتج. (إذا تُرك فارغاً يُستخدم رقم الواتساب العام).
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>البريد الإلكتروني</Label>
                            <Input
                              value={settings.email}
                              onChange={e => update({ email: e.target.value })}
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>العنوان الرئيسي (يظهر في الفوتر)</Label>
                            <Input
                              value={settings.address}
                              onChange={e => update({ address: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">روابط السوشيال ميديا</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {[
                            { key: 'facebook', label: 'رابط فيسبوك' },
                            { key: 'instagram', label: 'رابط إنستجرام' },
                            { key: 'twitter', label: 'رابط منصة X (تويتر)' },
                            { key: 'tiktok', label: 'رابط تيك توك' },
                          ].map(({ key, label }) => (
                            <div key={key} className="space-y-2">
                              <Label>{label}</Label>
                              <Input
                                value={(settings as any)[key] || ''}
                                onChange={e => update({ [key]: e.target.value } as any)}
                                dir="ltr"
                                placeholder="https://..."
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader><CardTitle className="text-base">نصوص الفوتر (أسفل الموقع)</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>وصف المتجر القصير (تحت الشعار)</Label>
                          <Input
                            value={settings.footerTagline}
                            onChange={e => update({ footerTagline: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>نص حقوق الملكية</Label>
                          <Input
                            value={settings.footerCopyright}
                            onChange={e => update({ footerCopyright: e.target.value })}
                            placeholder="مثال: كمبيو سيف. جميع الحقوق محفوظة."
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── SEO TAB ── */}
                {activeTab === 'seo' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">تحسين محركات البحث (SEO)</h2>
                      <p className="text-sm text-gray-500 mb-6">تحكم في بيانات الموقع التي تظهر في نتائج جوجل وعند مشاركة الروابط على وسائل التواصل.</p>
                    </div>

                    {/* Site Identity */}
                    <Card className="shadow-sm border-blue-100">
                      <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                        <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                          <Globe className="w-4 h-4" /> هوية الموقع
                        </CardTitle>
                        <CardDescription>البيانات الأساسية للمتجر</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5 text-gray-400" /> رابط الموقع الرسمي (Base URL)</Label>
                          <Input
                            value={settings.seoBaseUrl || ''}
                            onChange={e => update({ seoBaseUrl: e.target.value })}
                            placeholder="https://www.example.com"
                            dir="ltr"
                          />
                          <p className="text-xs text-gray-400">يستخدم لتكوين روابط الصفحات وOpen Graph تلقائياً.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Title & Meta */}
                    <Card className="shadow-sm border-violet-100">
                      <CardHeader className="bg-violet-50/50 border-b border-violet-100 pb-4">
                        <CardTitle className="text-base text-violet-900 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> العنوان والوصف الافتراضي
                        </CardTitle>
                        <CardDescription>تظهر في تبويب المتصفح ونتائج جوجل</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>عنوان الموقع (Title Tag)</Label>
                          <Input
                            value={settings.seoTitle || ''}
                            onChange={e => update({ seoTitle: e.target.value })}
                            placeholder="مثال: كمبيو سيف | لابتوب وكمبيوتر أصلي"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">يظهر في تبويب المتصفح ونتائج جوجل. المثالي بين 50-60 حرفاً.</p>
                            <span className={`text-xs font-mono ${(settings.seoTitle || '').length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                              {(settings.seoTitle || '').length}/60
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>الوصف الافتراضي (Meta Description)</Label>
                          <textarea
                            value={settings.seoDescription || ''}
                            onChange={e => update({ seoDescription: e.target.value })}
                            placeholder="وصف مختصر ومغري لمتجرك..."
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">المثالي بين 120-160 حرفاً. تظهر أسفل العنوان في نتائج جوجل.</p>
                            <span className={`text-xs font-mono ${(settings.seoDescription || '').length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                              {(settings.seoDescription || '').length}/160
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>الكلمات المفتاحية (Keywords)</Label>
                          <Input
                            value={settings.seoKeywords || ''}
                            onChange={e => update({ seoKeywords: e.target.value })}
                            placeholder="مثال: كمبيو سيف, لابتوب أصلي, كمبيوتر مستعمل"
                          />
                          <p className="text-xs text-gray-400">افصل بين الكلمات بفواصل. لا تتجاوز 20 كلمة.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Social Sharing */}
                    <Card className="shadow-sm border-emerald-100">
                      <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
                        <CardTitle className="text-base text-emerald-900 flex items-center gap-2">
                          <Share2 className="w-4 h-4" /> صورة المشاركة على وسائل التواصل (OG Image)
                        </CardTitle>
                        <CardDescription>تظهر عند مشاركة رابط الموقع على Facebook وWhatsApp وTwitter</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>رابط صورة المشاركة</Label>
                          <Input
                            value={settings.seoImage || ''}
                            onChange={e => update({ seoImage: e.target.value })}
                            placeholder="/og-image.jpg أو https://..."
                            dir="ltr"
                          />
                          <p className="text-xs text-gray-400">المقاس المثالي: 1200×630 بكسل. إذا تركته فارغاً سيستخدم شعار المتجر.</p>
                        </div>
                        {(settings.seoImage || settings.logoUrl) && (
                          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <img
                              src={settings.seoImage || settings.logoUrl}
                              alt="OG Preview"
                              className="w-full h-32 object-contain p-4"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* SEO Live Preview */}
                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Search className="w-4 h-4 text-blue-500" /> معاينة نتيجة جوجل
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border border-gray-200 rounded-xl p-4 bg-white font-sans">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                            <span className="text-xs text-gray-500 dir-ltr">{settings.seoBaseUrl || 'https://www.compusaif.com'}</span>
                          </div>
                          <p className="text-blue-700 text-lg font-medium leading-snug mb-1 line-clamp-1">
                            {settings.seoTitle || settings.storeName || 'عنوان الموقع'}
                          </p>
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                            {settings.seoDescription || 'سيظهر الوصف الافتراضي هنا...'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-amber-100 bg-amber-50/50 shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs text-amber-700 leading-relaxed">
                          <span className="font-bold">تلميح:</span> تغيير هذه البيانات يؤثر على كيفية ظهور موقعك في نتائج البحث. بعد الحفظ قد يستغرق جوجل بعض الوقت لتحديث النتائج (2-4 أسابيع).
                        </p>
                      </CardContent>
                    </Card>
                    {/* ── Meta Pixel Card ─────────────────────────────── */}
                    <Card className="shadow-sm border-indigo-100">
                      <CardHeader className="bg-indigo-50/60 border-b border-indigo-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                          </div>
                          <div>
                            <CardTitle className="text-base text-indigo-900">Meta Pixel (Facebook Pixel)</CardTitle>
                            <CardDescription className="text-indigo-600 mt-0.5">تتبع زوار موقعك وقياس نتائج إعلاناتك</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 pt-5">
                        {/* Explanation */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
                          <p className="text-sm font-semibold text-indigo-900">ما هو Meta Pixel؟</p>
                          <p className="text-xs text-indigo-700 leading-relaxed">
                            هو كود صغير يتواصل مع Facebook/Instagram. يُمكّنك من:
                          </p>
                          <ul className="text-xs text-indigo-700 space-y-1 mr-4 list-disc">
                            <li>قياس عدد الأشخاص الذين زاروا موقعك من إعلاناتك</li>
                            <li>استهداف الزوار مجدداً بإعلانات مخصصة (Retargeting)</li>
                            <li>تحليل سلوك الزوار على الموقع</li>
                          </ul>
                        </div>
                        {/* Pixel ID Input */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 font-semibold">
                            Pixel ID
                            {settings.metaPixelId?.trim() && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                <Check className="w-3 h-3" /> مفعّل
                              </span>
                            )}
                          </Label>
                          <Input
                            value={settings.metaPixelId || ''}
                            onChange={e => update({ metaPixelId: e.target.value })}
                            placeholder="مثال: 1234567890123456"
                            dir="ltr"
                            className={`font-mono text-sm ${settings.metaPixelId?.trim() ? 'border-green-300 bg-green-50/30' : ''}`}
                          />
                          <p className="text-xs text-gray-400 leading-relaxed">
                            أدخل الـ Pixel ID فقط (أرقام). ستجده في{' '}
                            <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                              Events Manager <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        </div>
                        {/* CAPI Token Input */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 font-semibold">
                            Conversions API Token (CAPI)
                            {settings.metaCapiAccessToken?.trim() && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                <Check className="w-3 h-3" /> مفعّل
                              </span>
                            )}
                          </Label>
                          <Input
                            type="password"
                            value={settings.metaCapiAccessToken || ''}
                            onChange={e => update({ metaCapiAccessToken: e.target.value })}
                            placeholder="EAAB..."
                            dir="ltr"
                            className={`font-mono text-sm ${settings.metaCapiAccessToken?.trim() ? 'border-green-300 bg-green-50/30' : ''}`}
                          />
                          <p className="text-xs text-gray-400 leading-relaxed">
                            رمز الوصول الخاص بواجهة Conversions API لإرسال الأحداث مباشرة من السيرفر وإطابقها مع المتصفح للـ Deduplication.
                          </p>
                        </div>
                        {/* Step-by-step guide */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                            <p className="text-xs font-semibold text-gray-700">كيف أجد الـ Pixel ID؟</p>
                          </div>
                          <div className="p-4 space-y-2.5">
                            {[
                              'اذهب إلى Facebook Business Manager',
                              'افتح "Events Manager" من القائمة',
                              'اختر الـ Pixel الخاص بك',
                              'انسخ الرقم الظاهر أسفل الاسم (15-16 رقماً)',
                              'الصقه في حقل Pixel ID أعلاه واحفظ',
                            ].map((text, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Status */}
                        {settings.metaPixelId?.trim() ? (
                          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <div>
                              <p className="text-sm font-semibold text-green-800">Pixel مفعّل</p>
                              <p className="text-xs text-green-600 font-mono">{settings.metaPixelId}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <p className="text-sm text-gray-500">لم يتم تفعيل الـ Pixel بعد</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── SPLASH SCREEN TAB ── */}
                {activeTab === 'splash' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">شاشة التحميل</h2>
                      <p className="text-sm text-gray-500">خصّص شاشة البداية التي تظهر عند فتح الموقع أول مرة.</p>
                    </div>

                    <Card className="shadow-sm">
                      <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">تفعيل شاشة التحميل</p>
                            <p className="text-xs text-gray-500 mt-0.5">شاشة جميلة تظهر عند كل فتح للموقع</p>
                          </div>
                          <Switch checked={settings.splashEnabled ?? true} onCheckedChange={(v) => update({ splashEnabled: v })} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">ثيم الحركة</CardTitle>
                        <CardDescription>اختر أسلوب ظهور شاشة التحميل</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'elegant', label: 'أنيق', desc: 'ظهور سلس مع ارتداد' },
                            { id: 'neon', label: 'نيون', desc: 'توهج وحلقة مضيئة' },
                            { id: 'minimal', label: 'بسيط', desc: 'تلاشي هادئ وأنيق' },
                            { id: 'wave', label: 'موج', desc: 'موجات متحركة' },
                            { id: 'particles', label: 'جزيئات', desc: 'جزيئات طائرة' },
                            { id: 'eid', label: 'عيد الأضحى 🐑', desc: 'فوانيس ونجوم احتفالية' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                const isEid = t.id === 'eid';
                                const wasEid = settings.splashTheme === 'eid';
                                update({
                                  splashTheme: t.id as 'elegant' | 'neon' | 'minimal' | 'wave' | 'particles' | 'eid',
                                  ...(isEid ? {
                                    // Auto-apply Eid festive colors & texts
                                    splashBgColor: '#06101e',
                                    splashTextColor: '#f59e0b',
                                    splashText: 'كل عام وأنتم بخير',
                                    splashSubtext: 'بمناسبة عيد الأضحى المبارك 🐑✨',
                                  } : wasEid ? {
                                    // Reset to defaults when leaving Eid theme
                                    splashBgColor: '#ffffff',
                                    splashTextColor: '#1e3a8a',
                                  } : {}),
                                });
                              }}
                              className={`relative flex flex-col overflow-hidden rounded-xl border-2 text-right transition-all group ${(settings.splashTheme ?? 'elegant') === t.id
                                  ? t.id === 'eid'
                                    ? 'border-amber-500 shadow-md ring-2 ring-amber-500/30'
                                    : 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                              <div className={`w-full h-24 relative flex items-center justify-center overflow-hidden ${t.id === 'eid' ? 'bg-[#06101e]' : 'bg-slate-900'
                                }`}>
                                {t.id === 'elegant' && (
                                  <div className="flex flex-col items-center gap-2 scale-[0.4] origin-center">
                                    <div className="w-16 h-16 bg-white rounded-full shadow-lg"></div>
                                    <div className="w-40 h-4 bg-white/80 rounded-full mt-2"></div>
                                  </div>
                                )}
                                {t.id === 'neon' && (
                                  <div className="flex flex-col items-center gap-2 scale-[0.4] origin-center relative">
                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-50 rounded-full"></div>
                                    <div className="w-20 h-20 border-[6px] border-cyan-400 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.7)] flex items-center justify-center">
                                      <div className="w-10 h-10 bg-white rounded-full"></div>
                                    </div>
                                    <div className="w-32 h-4 bg-cyan-400 rounded-full mt-3 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                                  </div>
                                )}
                                {t.id === 'minimal' && (
                                  <div className="flex flex-col items-center justify-center scale-[0.4] origin-center opacity-70">
                                    <div className="w-16 h-16 bg-white/20 rounded-full"></div>
                                    <div className="w-24 h-2 bg-white/30 rounded-full mt-4"></div>
                                  </div>
                                )}
                                {t.id === 'wave' && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-blue-500/40 to-transparent"></div>
                                    <div className="w-10 h-10 bg-white rounded-full z-10 scale-[0.5] shadow-lg"></div>
                                    <div className="w-24 h-2 bg-white/80 rounded-full mt-3 z-10 scale-[0.5]"></div>
                                  </div>
                                )}
                                {t.id === 'particles' && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                    <div className="absolute top-8 right-6 w-2 h-2 bg-blue-400 rounded-full blur-[1px]"></div>
                                    <div className="absolute bottom-4 left-8 w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                                    <div className="absolute bottom-8 right-12 w-1 h-1 bg-white/50 rounded-full"></div>
                                    <div className="w-10 h-10 bg-white rounded-full z-10 scale-[0.5] shadow-[0_0_15px_rgba(255,255,255,0.3)]"></div>
                                    <div className="w-24 h-2 bg-white/80 rounded-full mt-3 z-10 scale-[0.5]"></div>
                                  </div>
                                )}
                                {t.id === 'eid' && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    {/* Ambient glow */}
                                    <div className="absolute inset-0 bg-gradient-radial from-amber-500/10 to-transparent"></div>
                                    {/* Stars */}
                                    <div className="absolute top-2 left-3 text-[8px] text-amber-400/70">⭐</div>
                                    <div className="absolute top-4 right-4 text-[6px] text-yellow-300/80">✨</div>
                                    <div className="absolute bottom-3 left-8 text-[7px] text-amber-300/60">🌙</div>
                                    <div className="absolute bottom-2 right-3 text-[6px] text-amber-400/70">⭐</div>
                                    {/* Mini lantern left */}
                                    <div className="absolute top-0 left-2">
                                      <svg width="12" height="36" viewBox="0 0 12 36" fill="none">
                                        <line x1="6" y1="0" x2="6" y2="18" stroke="#d97706" strokeWidth="0.8" />
                                        <path d="M3 18 H9 L6 15 Z" fill="#d97706" />
                                        <rect x="2" y="18" width="8" height="10" rx="1" fill="#f59e0b" fillOpacity="0.35" stroke="#d97706" strokeWidth="0.8" />
                                        <circle cx="6" cy="23" r="2" fill="#f59e0b" />
                                      </svg>
                                    </div>
                                    {/* Mini lantern right */}
                                    <div className="absolute top-0 right-2">
                                      <svg width="12" height="36" viewBox="0 0 12 36" fill="none">
                                        <line x1="6" y1="0" x2="6" y2="18" stroke="#d97706" strokeWidth="0.8" />
                                        <path d="M3 18 H9 L6 15 Z" fill="#d97706" />
                                        <rect x="2" y="18" width="8" height="10" rx="1" fill="#f59e0b" fillOpacity="0.35" stroke="#d97706" strokeWidth="0.8" />
                                        <circle cx="6" cy="23" r="2" fill="#f59e0b" />
                                      </svg>
                                    </div>
                                    {/* Sheep + text */}
                                    <div className="flex flex-col items-center gap-1 z-10">
                                      <span className="text-2xl">🐑</span>
                                      <div className="w-16 h-2 bg-amber-400/60 rounded-full"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className={`p-3 w-full border-t ${t.id === 'eid'
                                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                                  : 'bg-white border-gray-100'
                                }`}>
                                <p className={`font-bold text-sm ${(settings.splashTheme ?? 'elegant') === t.id
                                    ? t.id === 'eid' ? 'text-amber-700' : 'text-indigo-700'
                                    : 'text-gray-800'
                                  }`}>{t.label}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{t.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Eid Theme Active Banner */}
                        {(settings.splashTheme ?? 'elegant') === 'eid' && (
                          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/30">
                            <span className="text-xl">🐑</span>
                            <div>
                              <p className="text-sm font-bold text-amber-800">ثيم عيد الأضحى المبارك مفعّل</p>
                              <p className="text-xs text-amber-600 mt-0.5">تم ضبط الألوان والنصوص والمؤثرات الاحتفالية تلقائياً. يمكنك تخصيصها من الأقسام أدناه.</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-3"><CardTitle className="text-sm">اللوجو</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>إظهار اللوجو</Label>
                          <Switch checked={settings.splashShowLogo ?? true} onCheckedChange={(v) => update({ splashShowLogo: v })} />
                        </div>
                        {(settings.splashShowLogo ?? true) && (
                          <div className="space-y-2">
                            <Label>رابط لوجو مخصص (اختياري)</Label>
                            <Input value={settings.splashLogoUrl || ''} onChange={(e) => update({ splashLogoUrl: e.target.value })} placeholder="اتركه فارغاً لاستخدام اللوجو الرئيسي" dir="ltr" />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-3"><CardTitle className="text-sm">النصوص</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>النص الرئيسي</Label>
                          <Input value={settings.splashText || ''} onChange={(e) => update({ splashText: e.target.value })} placeholder="مع كمبيو سيف انت دايماً في الأمان" />
                          <p className="text-xs text-gray-400">كل كلمة تظهر بتأثير متتالي</p>
                        </div>
                        <div className="space-y-2">
                          <Label>النص الفرعي (اختياري)</Label>
                          <Input value={settings.splashSubtext || ''} onChange={(e) => update({ splashSubtext: e.target.value })} placeholder="شعار ثانوي أو وصف..." />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-3"><CardTitle className="text-sm">الألوان</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>لون الخلفية</Label>
                          <div className="flex items-center gap-3">
                            <input type="color" value={settings.splashBgColor || '#ffffff'} onChange={(e) => update({ splashBgColor: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
                            <Input value={settings.splashBgColor || '#ffffff'} onChange={(e) => update({ splashBgColor: e.target.value })} dir="ltr" className="font-mono text-sm flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>لون النص والتأثيرات</Label>
                          <div className="flex items-center gap-3">
                            <input type="color" value={settings.splashTextColor || '#1e3a8a'} onChange={(e) => update({ splashTextColor: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200" />
                            <Input value={settings.splashTextColor || '#1e3a8a'} onChange={(e) => update({ splashTextColor: e.target.value })} dir="ltr" className="font-mono text-sm flex-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-3"><CardTitle className="text-sm">مدة العرض</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>الحد الأدنى للعرض</Label>
                          <span className="text-sm font-bold text-indigo-600">{settings.splashDuration ?? 2} ثانية</span>
                        </div>
                        <input type="range" min={1} max={6} step={0.5} value={settings.splashDuration ?? 2} onChange={(e) => update({ splashDuration: Number(e.target.value) })} className="w-full accent-indigo-600" />
                        <div className="flex justify-between text-xs text-gray-400"><span>1 ث</span><span>6 ث</span></div>
                      </CardContent>
                    </Card>

                    <Card className={`shadow-sm ${(settings.splashTheme ?? 'elegant') === 'eid'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-indigo-100 bg-indigo-50/30'
                      }`}>
                      <CardHeader className="pb-3">
                        <CardTitle className={`text-sm ${(settings.splashTheme ?? 'elegant') === 'eid' ? 'text-amber-800' : 'text-indigo-800'
                          }`}>معاينة</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 py-10"
                          style={{ background: settings.splashBgColor || '#ffffff', minHeight: 200 }}
                        >
                          {/* Eid festive overlay */}
                          {(settings.splashTheme ?? 'elegant') === 'eid' && (
                            <>
                              {/* Stars */}
                              <div className="absolute top-2 left-3 text-base opacity-50">⭐</div>
                              <div className="absolute top-4 right-5 text-sm opacity-40">✨</div>
                              <div className="absolute bottom-3 left-7 text-sm opacity-40">🌙</div>
                              <div className="absolute bottom-2 right-3 text-base opacity-50">⭐</div>
                              {/* Mini lanterns */}
                              <div className="absolute top-0 left-4 opacity-80">
                                <svg width="18" height="56" viewBox="0 0 18 56" fill="none">
                                  <line x1="9" y1="0" x2="9" y2="28" stroke="#d97706" strokeWidth="1" strokeDasharray="1.5 1.5" />
                                  <path d="M5 28 H13 L9 23 Z" fill="#d97706" />
                                  <rect x="3" y="28" width="12" height="16" rx="2" fill="#f59e0b" fillOpacity="0.3" stroke="#d97706" strokeWidth="1" />
                                  <circle cx="9" cy="36" r="3.5" fill="#f59e0b" />
                                  <line x1="9" y1="44" x2="9" y2="54" stroke="#d97706" strokeWidth="0.8" />
                                  <circle cx="9" cy="55" r="1.5" fill="#d97706" />
                                </svg>
                              </div>
                              <div className="absolute top-0 right-4 opacity-80">
                                <svg width="18" height="56" viewBox="0 0 18 56" fill="none">
                                  <line x1="9" y1="0" x2="9" y2="28" stroke="#d97706" strokeWidth="1" strokeDasharray="1.5 1.5" />
                                  <path d="M5 28 H13 L9 23 Z" fill="#d97706" />
                                  <rect x="3" y="28" width="12" height="16" rx="2" fill="#f59e0b" fillOpacity="0.3" stroke="#d97706" strokeWidth="1" />
                                  <circle cx="9" cy="36" r="3.5" fill="#f59e0b" />
                                  <line x1="9" y1="44" x2="9" y2="54" stroke="#d97706" strokeWidth="0.8" />
                                  <circle cx="9" cy="55" r="1.5" fill="#d97706" />
                                </svg>
                              </div>
                            </>
                          )}

                          {(settings.splashShowLogo ?? true) && (
                            <img
                              src={settings.splashLogoUrl?.trim() || settings.logoUrl || '/logo.png'}
                              alt="Preview"
                              className="w-16 h-16 object-contain"
                            />
                          )}
                          <p className="font-extrabold text-center text-lg relative z-10" style={{ color: settings.splashTextColor || '#1e3a8a' }}>
                            {settings.splashText || 'مع كمبيو سيف انت دايماً في الأمان'}
                          </p>
                          {settings.splashSubtext?.trim() && (
                            (settings.splashTheme ?? 'elegant') === 'eid' ? (
                              <div className="mt-1 px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 flex items-center gap-2 relative z-10">
                                <span className="text-base">🐑</span>
                                <span className="text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-600">
                                  {settings.splashSubtext}
                                </span>
                                <span className="text-base">✨</span>
                              </div>
                            ) : (
                              <p className="text-sm opacity-70 text-center relative z-10" style={{ color: settings.splashTextColor || '#1e3a8a' }}>
                                {settings.splashSubtext}
                              </p>
                            )
                          )}
                          <div className="flex gap-1.5 relative z-10">
                            {[0, 1, 2].map(i => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full opacity-60"
                                style={{ background: settings.splashTextColor || '#1e3a8a' }}
                              />
                            ))}
                          </div>
                          <div className="absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/70 text-gray-500">
                            {settings.splashTheme || 'elegant'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              </div>

            )}
          </div>
        </main>
      </div>
    </div>
  );
}
