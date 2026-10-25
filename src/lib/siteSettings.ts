import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SiteTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  topbarBg: string;   // hex color
  footerBg: string;   // hex color
}

/** Card display theme */
export type CardThemeId = 'classic' | 'modern' | 'minimal' | 'bold' | 'glass';
export interface CardTheme {
  id: CardThemeId;
  name: string;
  description: string;
  preview: {
    cardBg: string;
    imageBg: string;
    border: string;
    shadow: string;
    btnStyle: string;
    priceColor: string;
    roundedImage: string;
  };
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'classic',
    name: 'كلاسيكي',
    description: 'تصميم نظيف بحدود خفيفة وظل ناعم',
    preview: {
      cardBg: 'bg-white',
      imageBg: 'bg-gray-50',
      border: 'border border-gray-100',
      shadow: 'shadow-sm hover:shadow-md',
      btnStyle: 'bg-primary text-white hover:bg-primary/90',
      priceColor: 'text-primary',
      roundedImage: 'rounded-none',
    },
  },
  {
    id: 'modern',
    name: 'عصري',
    description: 'بطاقة بخلفية بيضاء وظل ملون عند الهوفر',
    preview: {
      cardBg: 'bg-white',
      imageBg: 'bg-primary/5',
      border: 'border-0',
      shadow: 'shadow-md hover:shadow-primary/20 hover:shadow-xl',
      btnStyle: 'bg-gradient-to-r from-primary to-secondary text-white',
      priceColor: 'text-primary',
      roundedImage: 'rounded-xl',
    },
  },
  {
    id: 'minimal',
    name: 'بسيط',
    description: 'بلا حدود، مع زر شبه شفاف',
    preview: {
      cardBg: 'bg-white',
      imageBg: 'bg-gray-100',
      border: 'border-0',
      shadow: 'shadow-none hover:bg-gray-50',
      btnStyle: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white',
      priceColor: 'text-gray-900',
      roundedImage: 'rounded-md',
    },
  },
  {
    id: 'bold',
    name: 'جريء',
    description: 'خلفية داكنة جزئياً للصورة، ألوان نابضة',
    preview: {
      cardBg: 'bg-gray-900',
      imageBg: 'bg-gray-800',
      border: 'border border-gray-700',
      shadow: 'shadow-lg hover:shadow-primary/30 hover:shadow-xl',
      btnStyle: 'bg-primary text-white hover:brightness-110',
      priceColor: 'text-primary',
      roundedImage: 'rounded-xl',
    },
  },
  {
    id: 'glass',
    name: 'زجاجي',
    description: 'تأثير الزجاج الشفاف مع ضبابية خلفية',
    preview: {
      cardBg: 'bg-white/70 backdrop-blur-md',
      imageBg: 'bg-white/50',
      border: 'border border-white/60',
      shadow: 'shadow-xl hover:shadow-2xl',
      btnStyle: 'bg-primary/90 text-white backdrop-blur-sm hover:bg-primary',
      priceColor: 'text-primary',
      roundedImage: 'rounded-2xl',
    },
  },
];

/** Product page layout theme */
export type ProductPageThemeId = 'classic' | 'magazine' | 'hero' | 'compact' | 'fullimage';
export interface ProductPageTheme {
  id: ProductPageThemeId;
  name: string;
  description: string;
  layoutHint: 'side-by-side' | 'reversed' | 'stacked' | 'narrow-image' | 'wide-image';
}

export type HomeSearchThemeId = 'elegant' | 'minimal' | 'glass' | 'bold' | 'bordered';
export const HOME_SEARCH_THEMES = [
  { id: 'elegant', name: 'أنيق', desc: 'خلفية متدرجة مع ظل ناعم' },
  { id: 'minimal', name: 'بسيط', desc: 'خلفية رمادية فاتحة بدون حدود' },
  { id: 'glass', name: 'زجاجي', desc: 'تأثير زجاجي شفاف ومبهر' },
  { id: 'bold', name: 'بارز', desc: 'خلفية داكنة مع نصوص فاتحة' },
  { id: 'bordered', name: 'محدد', desc: 'خلفية بيضاء مع إطار ملون' },
];

export const PRODUCT_PAGE_THEMES: ProductPageTheme[] = [
  {
    id: 'classic',
    name: 'كلاسيكي',
    description: 'صورة على اليمين والمعلومات على اليسار (50/50) — التصميم المعتاد لمعظم المتاجر',
    layoutHint: 'side-by-side',
  },
  {
    id: 'magazine',
    name: 'مجلة',
    description: 'معلومات على اليمين والصورة على اليسار — عنوان ضخم بخط سفلي بلون الموقع',
    layoutHint: 'reversed',
  },
  {
    id: 'hero',
    name: 'هيرو',
    description: 'صورة بعرض كامل فوق، والمعلومات مُتمركزة تحتها — مثل متاجر Apple',
    layoutHint: 'stacked',
  },
  {
    id: 'compact',
    name: 'مضغوط',
    description: 'صورة 38% ومعلومات 62% — تركيز على النص والمواصفات',
    layoutHint: 'narrow-image',
  },
  {
    id: 'fullimage',
    name: 'سينمائي',
    description: 'صورة 58% ومعلومات 42% — تركيز على الصورة الاحترافية',
    layoutHint: 'wide-image',
  },
];

export const PRESET_THEMES: SiteTheme[] = [
  {
    id: 'blue',
    name: 'أزرق (الافتراضي)',
    primary: '217 91% 55%',
    secondary: '199 89% 48%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#1e3a8a',
    footerBg: '#0f172a',
  },
  {
    id: 'emerald',
    name: 'أخضر زمردي',
    primary: '160 84% 39%',
    secondary: '142 76% 36%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#065f46',
    footerBg: '#064e3b',
  },
  {
    id: 'purple',
    name: 'بنفسجي',
    primary: '262 83% 58%',
    secondary: '290 72% 55%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#4c1d95',
    footerBg: '#3b0764',
  },
  {
    id: 'rose',
    name: 'وردي',
    primary: '343 87% 55%',
    secondary: '326 78% 60%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#9f1239',
    footerBg: '#881337',
  },
  {
    id: 'orange',
    name: 'برتقالي',
    primary: '24 95% 53%',
    secondary: '38 92% 50%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#92400e',
    footerBg: '#78350f',
  },
  {
    id: 'dark',
    name: 'داكن',
    primary: '217 91% 60%',
    secondary: '199 89% 55%',
    accent: '43 96% 60%',
    background: '222 47% 8%',
    foreground: '0 0% 95%',
    topbarBg: '#020617',
    footerBg: '#020617',
  },
];

export interface HeroSlide {
  id: string;
  image: string;         // Firebase Storage URL or local path
  storagePath?: string;  // Firebase Storage path for deletion (e.g. hero-carousel/xxx.jpg)
  buttonLink: string;
}

export interface TrustBadge {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  workingHours?: string;
  googleMapsUrl: string;
}

export interface HomeReviewSettings {
  enabled: boolean;
  videoUrl: string;
  title: string;
  text: string;
  authorName: string;
  authorTitle: string;
  rating: number;
}

export interface SiteSettings {
  // Theme
  activeThemeId: string;
  customColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    topbarBg: string;
    footerBg: string;
  };

  // Typography & UI
  fontFamily: string;
  borderRadius: string; // e.g. '0.875rem'
  globalShadow: 'none' | 'light' | 'medium' | 'strong';

  // Card & Page Themes
  cardTheme: CardThemeId;
  productPageTheme: ProductPageThemeId;
  defaultOpenFilters: string[];

  // Features
  isImporter: boolean;

  // Branding
  storeName: string;
  logoUrl: string;
  logoNavbarUrl: string;
  faviconUrl: string;

  // Navbar Links
  navLinks: {
    home: string;
    products: string;
    wholesale: string;
    about: string;
    locations: string;
  };

  // Hero
  heroCarousel: HeroSlide[];
  /** 'firebase' = use heroCarousel from Firestore/Storage | 'static' = use hardcoded STORE_HERO_CAROUSEL */
  heroCarouselSource: 'firebase' | 'static';

  // Wholesale
  wholesaleBannerImage: string;

  // Content
  trustBadges: TrustBadge[];
  categoryTitle: string;
  categorySubtitle: string;
  wholesaleTitle: string;
  wholesaleDescription: string;
  footerTagline: string;
  footerCopyright: string;

  // Contact
  phone: string;
  whatsapp: string;
  orderWhatsapp?: string;
  email: string;
  address: string;

  // Pages Content
  wholesalePage: {
    heroTitle: string;
    heroSubtitle: string;
    formTitle: string;
    formSubtitle: string;
  };
  aboutPage: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    bannerImage: string;
    stats: {
      experience: string;
      sold: string;
      satisfaction: string;
    };
  };
  locationsPage: {
    heroTitle: string;
    heroSubtitle: string;
  };

  // Branches
  branches: Branch[];

  // Social
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;

  // Advanced
  showTopbar: boolean;
  topbarText: string;
  showHomeSearch: boolean;
  homeSearchTheme: HomeSearchThemeId;

  // Default Products Category
  defaultProductCategory: string[]; // categories shown by default on /products with no filters

  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoBaseUrl: string;
  seoImage: string;
  metaPixelId: string;
  metaCapiAccessToken: string;

  // Splash Screen
  splashEnabled: boolean;
  splashTheme: 'elegant' | 'neon' | 'minimal' | 'wave' | 'particles' | 'eid';
  splashText: string;
  splashSubtext: string;
  splashShowLogo: boolean;
  splashLogoUrl: string; // override logo for splash (empty = use main logoUrl)
  splashBgColor: string; // hex e.g. '#0a0a1a'
  splashTextColor: string;
  splashDuration: number; // min display seconds

  homeReview: HomeReviewSettings;

  updatedAt: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  activeThemeId: 'blue',
  customColors: {
    primary: '217 91% 55%',
    secondary: '199 89% 48%',
    accent: '43 96% 56%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    topbarBg: '#1e3a8a',
    footerBg: '#0f172a',
  },

  fontFamily: 'Cairo',
  borderRadius: '0.875rem',
  globalShadow: 'medium',

  cardTheme: 'classic',
  productPageTheme: 'classic',
  defaultOpenFilters: ['price', 'sort', 'subcategory', 'brand', 'features'],

  isImporter: true,

  storeName: 'كمبيو سيف',
  logoUrl: '/logo.png',
  logoNavbarUrl: '/logo2.webp',
  faviconUrl: '/favicon.png',

  navLinks: {
    home: 'الرئيسية',
    products: 'المنتجات',
    wholesale: 'جملة وتوريدات',
    about: 'من نحن',
    locations: 'فروعنا',
  },

  heroCarousel: [
    { id: 'slide1', image: '/bg1.jpeg', buttonLink: '/products' },
    { id: 'slide2', image: '/bg2.jpeg', buttonLink: '/products' },
  ],
  heroCarouselSource: 'firebase',
  wholesaleBannerImage: '/bg2.jpeg',

  trustBadges: [
    { id: 'b1', label: 'ضمان 6 أشهر', icon: 'Shield', color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'b2', label: 'شحن جميع المحافظات', icon: 'Truck', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'b3', label: 'أجهزة أوريجينال', icon: 'Star', color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'b4', label: 'أفضل الأسعار', icon: 'Zap', color: 'text-purple-600', bg: 'bg-purple-50' },
  ],
  categoryTitle: 'تصفح حسب القسم',
  categorySubtitle: 'اختر القسم الذي تبحث عنه للوصول السريع',
  wholesaleTitle: 'قسم التوريدات والجملة',
  wholesaleDescription: 'أسعار خاصة للشركات والموزعين — أجهزة أصلية بكميات كبيرة مع ضمان معتمد.',
  footerTagline: ' جميع الاجهزة استيراد امريكي بمكونات اصليه بالكامل',
  footerCopyright: 'كمبيو سيف. جميع الحقوق محفوظة.',

  phone: '01146324540',
  whatsapp: '01146324540',
  orderWhatsapp: '01146324540',
  email: 'ibrahim.moamen100@gmail.com',
  address: 'مكرم عبيد - مدينة نصر - القاهرة',

  wholesalePage: {
    heroTitle: 'أصلية بأسعار تنافسية',
    heroSubtitle: 'في كومبيوسيف نوفر خدمات توريد أجهزة اللابتوب والكمبيوتر للشركات، المتاجر، والموزعين في جميع أنحاء مصر، من خلال استيراد مباشر من الولايات المتحدة الأمريكية بدون وسطاء، مما يمنح عملاءنا أفضل جودة بأفضل سعر.',
    formTitle: 'اطلب عرض سعر الآن',
    formSubtitle: 'املأ النموذج التالي وسيقوم فريق المبيعات بالتواصل معك في أقرب وقت لتقديم أفضل عرض يناسب احتياجاتك.',
  },
  aboutPage: {
    heroTitle: 'Compu Saif',
    heroSubtitle: 'مع كومبيو سيف انت ديماً في الامان',
    heroDescription: 'متخصصون في بيع (اللابتوبات - الشاشات - أجهزة الديسك توب) الأصلية.',
    bannerImage: '/sg.webp',
    stats: {
      experience: '+5',
      sold: '+1000',
      satisfaction: '100%',
    },
  },
  locationsPage: {
    heroTitle: 'فروعنا',
    heroSubtitle: 'تعرف على أماكن وجودنا وزورونا في أي وقت',
  },

  branches: [
    {
      id: 'branch1',
      name: 'الفرع الرئيسي',
      address: 'مكرم عبيد - مدينة نصر - القاهرة',
      phone: '01146324540',
      workingHours: '١٠ صباحاً - ١٠ مساءً',
      googleMapsUrl: '',
    },
  ],

  facebook: 'https://www.facebook.com/compusaaiff',
  instagram: 'https://instagram.com/compusaaiff',
  twitter: 'https://twitter.com',
  tiktok: 'https://www.tiktok.com/@compu.saif_',

  showTopbar: true,
  topbarText: '',
  showHomeSearch: true,
  homeSearchTheme: 'elegant',

  defaultProductCategory: [],

  seoTitle: 'كمبيوسيف | لابتوب استيراد امريكي اوريجنال و PC Dell, HP, Lenovo | Compu Saif',
  seoDescription: 'متجر كمبيو سيف: لابتوبات وأجهزة PC وشاشات و All in One استيراد بمكونات أصلية بالكامل (Dell, HP, Lenovo) للبرمجة، الذكاء الاصطناعي، المونتاج، والأعمال الهندسية. مع كمبيو سيف أنت دايماً في الأمان.',
  seoKeywords: 'كمبيو سيف, Compu Saif, لابتوبات استيراد, لابتوب استيراد, كمبيوتر استيراد, كيسات pc استيراد, شاشات استيراد, اجهزة all in one, لابتوبات للبرمجة, لابتوبات للذكاء الاصطناعي, لابتوبات للمونتاج, لابتوبات برامج هندسية, لابتوبات للتصفح واوفيس, لابتوب Dell, لابتوب HP, لابتوب Lenovo, اجهزة اصلية بالكامل, اسعار لابتوبات استيراد, ضمان لابتوبات استيراد, مع كمبيو سيف انت دايما في الامان',
  seoBaseUrl: 'https://www.compusaif.com',
  seoImage: '/logo.png',
  metaPixelId: '',
  metaCapiAccessToken: '',

  // Splash Screen
  splashEnabled: true,
  splashTheme: 'elegant',
  splashText: 'مع كمبيو سيف انت دايماً في الأمان',
  splashSubtext: 'وكل عام وأنتم بخير بحلول عيد الأضحى المبارك 🐑✨',
  splashShowLogo: true,
  splashLogoUrl: '',
  splashBgColor: '#ffffff',
  splashTextColor: '#1e3a8a',
  splashDuration: 2.5,

  homeReview: {
    enabled: true,
    videoUrl: 'https://www.facebook.com/compusaaiff/videos/1085025752945763/',
    title: 'تجربة شراء ممتازة وجهاز فوق الممتاز!',
    text: 'اشتريت لابتوب Dell Latitude من كمبيو سيف، الجهاز بحالة الزيرو والبطارية ممتازة جداً. الدعم الفني كان متعاون جداً في اختيار المواصفات المناسبة لشغلي، والضمان حقيقي 6 شهور. أنصح بالتعامل معهم بشدة.',
    authorName: 'أحمد محمد',
    authorTitle: 'مهندس برمجيات',
    rating: 5,
  },

  updatedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart Cache (localStorage + Firestore Version Check)
// Works like the Catalog Version system:
//   - _meta/settings document holds a UUID that changes on every save
//   - Each device checks this UUID on load (1 cheap Firestore read)
//   - If versions match → serve from localStorage (fast, no extra reads)
//   - If versions differ → clear cache & fetch fresh (deleted slides disappear)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'site_settings_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (fallback when no version doc)
const SETTINGS_VERSION_LOCAL_KEY = 'settings_version_local';

export function readCache(ignoreTTL = false): SiteSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!ignoreTTL && (Date.now() - ts > CACHE_TTL)) return null;
    return data as SiteSettings;
  } catch { return null; }
}

function writeCache(data: SiteSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded – ignore */ }
}

export function clearSettingsCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(SETTINGS_VERSION_LOCAL_KEY);
}

/** Read the remote settings version from Firestore — costs exactly 1 document read. */
async function getRemoteSettingsVersion(): Promise<string | null> {
  try {
    const { getDoc: _getDoc, doc: _doc } = await import('firebase/firestore');
    const { db: _db } = await import('./firebase');
    const snap = await _getDoc(_doc(_db, '_meta', 'settings'));
    return snap.exists() ? ((snap.data().version as string) || null) : null;
  } catch { return null; }
}

function getLocalSettingsVersion(): string | null {
  try { return localStorage.getItem(SETTINGS_VERSION_LOCAL_KEY); } catch { return null; }
}

function setLocalSettingsVersion(version: string): void {
  try { localStorage.setItem(SETTINGS_VERSION_LOCAL_KEY, version); } catch { }
}

/**
 * Write a new random version UUID to `_meta/settings` in Firestore.
 * Called inside saveSiteSettings() so every save invalidates all device caches.
 */
async function updateSettingsVersion(): Promise<void> {
  try {
    const newVersion =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
    const { setDoc: _setDoc, doc: _doc, Timestamp: _Timestamp } = await import('firebase/firestore');
    const { db: _db } = await import('./firebase');
    await _setDoc(_doc(_db, '_meta', 'settings'), { version: newVersion, updatedAt: _Timestamp.now() });
    setLocalSettingsVersion(newVersion);
    console.log(`[SettingsVersion] ✅ Updated → ${newVersion}`);
  } catch (err) {
    console.warn('[SettingsVersion] Failed to update version:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore CRUD
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_DOC = doc(db, 'site_config', 'settings');

/** Read settings. Uses smart version-based cache to detect remote changes across all devices. */
export async function getSiteSettings(useCache = true): Promise<SiteSettings> {
  const mergeSettings = (data: Partial<SiteSettings>): SiteSettings => {
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      customColors: { ...DEFAULT_SETTINGS.customColors, ...(data.customColors || {}) },
      navLinks: { ...DEFAULT_SETTINGS.navLinks, ...(data.navLinks || {}) },
      wholesalePage: { ...DEFAULT_SETTINGS.wholesalePage, ...(data.wholesalePage || {}) },
      aboutPage: {
        ...DEFAULT_SETTINGS.aboutPage,
        ...(data.aboutPage || {}),
        stats: { ...DEFAULT_SETTINGS.aboutPage.stats, ...(data.aboutPage?.stats || {}) }
      },
      locationsPage: { ...DEFAULT_SETTINGS.locationsPage, ...(data.locationsPage || {}) },
      branches: data.branches ?? DEFAULT_SETTINGS.branches,
      defaultOpenFilters: data.defaultOpenFilters ?? DEFAULT_SETTINGS.defaultOpenFilters,
      defaultProductCategory: data.defaultProductCategory ?? DEFAULT_SETTINGS.defaultProductCategory,
      orderWhatsapp: data.orderWhatsapp ?? DEFAULT_SETTINGS.orderWhatsapp,
      isImporter: data.isImporter ?? DEFAULT_SETTINGS.isImporter,
      showHomeSearch: data.showHomeSearch ?? DEFAULT_SETTINGS.showHomeSearch,
      homeSearchTheme: data.homeSearchTheme ?? DEFAULT_SETTINGS.homeSearchTheme,
      heroCarouselSource: data.heroCarouselSource ?? DEFAULT_SETTINGS.heroCarouselSource,
      homeReview: {
        ...DEFAULT_SETTINGS.homeReview,
        ...(data.homeReview || {})
      },
    };
  };

  let remoteVersionToSync: string | null = null;

  if (useCache) {
    const cached = readCache();
    if (cached) {
      // ── Smart version check (1 Firestore read) ────────────────────────────
      // Check if remote version differs from local — if so, invalidate cache.
      try {
        const remoteVersion = await getRemoteSettingsVersion();
        const localVersion = getLocalSettingsVersion();

        if (remoteVersion !== null && remoteVersion === localVersion) {
          // Cache is fresh across all devices
          console.log(`📦 [Settings Cache HIT] Version matches (${localVersion})`);
          return mergeSettings(cached);
        }

        remoteVersionToSync = remoteVersion;

        if (remoteVersion === null) {
          // No version doc yet — fall back to TTL-based cache
          console.log(`📦 [Settings Cache] No version doc — using TTL cache`);
          return mergeSettings(cached);
        }

        // Versions differ → clear local cache and fetch fresh
        console.log(`🔄 [Settings Cache MISS] Remote: ${remoteVersion} | Local: ${localVersion ?? 'none'} — fetching fresh settings`);
        clearSettingsCache();
      } catch {
        // Version check failed — serve from cache to avoid degraded UX
        return mergeSettings(cached);
      }
    }
  }

  try {
    const snap = await getDoc(SETTINGS_DOC);
    const settings = snap.exists()
      ? mergeSettings(snap.data() as Partial<SiteSettings>)
      : DEFAULT_SETTINGS;
    writeCache(settings);

    // Keep local version in sync so subsequent calls hit the cache!
    if (!remoteVersionToSync) {
      remoteVersionToSync = await getRemoteSettingsVersion();
    }
    if (remoteVersionToSync) {
      setLocalSettingsVersion(remoteVersionToSync);
    }

    return settings;
  } catch (err) {
    console.warn('⚠️ Failed to load site settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSiteSettings(
  settings: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(SETTINGS_DOC, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
    clearSettingsCache();
    // Update version so ALL other devices know to invalidate their caches
    await updateSettingsVersion();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply theme to DOM
// ─────────────────────────────────────────────────────────────────────────────

export function applyThemeToDocument(settings: SiteSettings) {
  const root = document.documentElement;

  // Resolve colors (preset OR custom)
  const preset = PRESET_THEMES.find(t => t.id === settings.activeThemeId);
  const c = preset ? {
    primary: preset.primary,
    secondary: preset.secondary,
    accent: preset.accent,
    background: preset.background,
    foreground: preset.foreground,
    topbarBg: preset.topbarBg,
    footerBg: preset.footerBg,
  } : settings.customColors;

  // CSS HSL variables (used by shadcn/ui components)
  root.style.setProperty('--primary', c.primary);
  root.style.setProperty('--primary-foreground', isLight(c.primary) ? '222 47% 11%' : '0 0% 100%');
  root.style.setProperty('--secondary', c.secondary);
  root.style.setProperty('--secondary-foreground', '0 0% 100%');
  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--accent-foreground', '222 47% 11%');
  root.style.setProperty('--background', c.background);
  root.style.setProperty('--foreground', c.foreground);
  root.style.setProperty('--card', c.background);
  root.style.setProperty('--card-foreground', c.foreground);
  root.style.setProperty('--ring', c.primary);

  // Hex variables (used directly in Topbar/Footer)
  root.style.setProperty('--topbar-bg', c.topbarBg);
  root.style.setProperty('--footer-bg', c.footerBg);

  // Border radius
  if (settings.borderRadius) {
    root.style.setProperty('--radius', settings.borderRadius);
  }

  // Global shadow intensity
  root.setAttribute('data-shadow', settings.globalShadow || 'medium');

  // Card theme CSS class on body
  const cardTheme = settings.cardTheme || 'classic';
  root.setAttribute('data-card-theme', cardTheme);

  // Product page theme
  const productPageTheme = settings.productPageTheme || 'default';
  root.setAttribute('data-product-theme', productPageTheme);

  // Font family
  if (settings.fontFamily && settings.fontFamily !== 'Cairo') {
    root.style.setProperty('--font-family', `'${settings.fontFamily}', 'Cairo', sans-serif`);
    document.body.style.fontFamily = `'${settings.fontFamily}', 'Cairo', sans-serif`;
  } else {
    document.body.style.fontFamily = '';
  }
}

function isLight(hsl: string): boolean {
  const parts = hsl.trim().split(/\s+/);
  return parseFloat(parts[2]) > 70;
}

// ─────────────────────────────────────────────────────────────────────────────
// Font options
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { value: 'Cairo', label: 'Cairo (الافتراضي)' },
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'Changa', label: 'Changa' },
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
];

export const RADIUS_OPTIONS = [
  { value: '0rem', label: 'حاد (0)' },
  { value: '0.375rem', label: 'خفيف' },
  { value: '0.875rem', label: 'متوسط (افتراضي)' },
  { value: '1.25rem', label: 'مدوّر' },
  { value: '9999px', label: 'دائري كامل' },
];

export const SHADOW_OPTIONS = [
  { value: 'none', label: 'بدون ظل' },
  { value: 'light', label: 'خفيف' },
  { value: 'medium', label: 'متوسط (افتراضي)' },
  { value: 'strong', label: 'قوي' },
];
