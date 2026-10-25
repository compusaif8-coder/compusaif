import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductModal } from "@/components/ProductModal";
import { Product } from "@/types/product";
import Footer from "@/components/Footer";
import { Filter, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ProductSearch } from "@/components/ProductSearch";
import { ActiveFilters } from "@/components/ActiveFilters";
import { SEOHelmet } from "@/components/SEOHelmet";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { trackMetaViewCategory } from "@/lib/metaPixel";
import { getSiteSettings } from "@/lib/siteSettings";
import { categoryToSlug, slugToCategory } from "@/utils/categorySlug";

// ─── Tracking / marketing URL params to IGNORE (never treat as filters) ────
const TRACKING_PARAMS = new Set([
  // Meta / Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
  // Google
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  // UTM (Google Analytics / all platforms)
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  // Microsoft / Bing
  'msclkid',
  // TikTok
  'ttclid',
  // Snapchat
  'ScCid',
  // Twitter / X
  'twclid',
  // LinkedIn
  'li_fat_id',
  // Pinterest
  'epik',
  // HubSpot
  '_hsenc', '_hsmi', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad',
  'hsa_src', 'hsa_tgt', 'hsa_kw', 'hsa_mt', 'hsa_net', 'hsa_ver',
  // Mailchimp
  'mc_cid', 'mc_eid',
  // Generic
  'ref', 'referrer', 'source', 'affiliate', 'campaign', 'adid', 'adset',
]);

// ─── Helper: convert Filter → URLSearchParams (ordered per spec) ───────────
function filtersToSearchParams(filters: import("@/types/product").Filter, slugMap: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();

  // 1. نطاق السعر
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  // 2. الفئة
  filters.category?.forEach((v) => params.append("category", categoryToSlug(v)));
  // 3. الماركة
  filters.brand?.forEach((v) => params.append("brand", v));
  // 4. الفئة الفرعية
  filters.subcategory?.forEach((v) => params.append("subcategory", v));
  // 5. مميزات خاصة
  filters.features?.forEach((v) => params.append("features", v));
  // 6. العروض الخاصة
  if (filters.specialOffer) params.set("specialOffer", "true");
  // 7. البحث
  if (filters.search) params.set("search", filters.search);
  // 8. الترتيب
  if (filters.sortBy) params.set("sortBy", filters.sortBy);

  // Dynamic Specs
  if (filters.dynamicSpecs) {
    Object.entries(filters.dynamicSpecs).forEach(([k, vals]) => {
      const urlKey = slugMap[k] ? slugMap[k] : k;
      vals.forEach(v => params.append(urlKey, v.replace(/\s+/g, "-")));
    });
  }

  return params;
}

// ─── Helper: parse URLSearchParams → Filter ─────────────────────────────────
function searchParamsToFilters(params: URLSearchParams, reverseSlugMap: Record<string, string>): Partial<import("@/types/product").Filter> {
  const getArr = (key: string) => {
    const vals = params.getAll(key);
    return vals.length > 0 ? vals : undefined;
  };

  const dynamicSpecs: Record<string, string[]> = {};
  const knownStaticKeys = new Set(["minPrice", "maxPrice", "category", "brand", "subcategory", "features", "specialOffer", "search", "sortBy"]);
  for (const [key, value] of Array.from(params.entries())) {
    // Skip tracking/marketing params — they must NEVER be treated as filters
    if (TRACKING_PARAMS.has(key)) continue;
    if (!knownStaticKeys.has(key)) {
      const specKey = reverseSlugMap[key] || key;
      if (!dynamicSpecs[specKey]) dynamicSpecs[specKey] = [];
      dynamicSpecs[specKey].push(value.replace(/-/g, " "));
    }
  }

  const minPriceStr = params.get("minPrice");
  const maxPriceStr = params.get("maxPrice");
  const rawCats = getArr("category");

  return {
    minPrice: minPriceStr ? Number(minPriceStr) : undefined,
    maxPrice: maxPriceStr ? Number(maxPriceStr) : undefined,
    category: rawCats ? rawCats.map(c => slugToCategory(c)) : undefined,
    brand: getArr("brand"),
    subcategory: getArr("subcategory"),
    features: getArr("features"),
    specialOffer: params.get("specialOffer") === "true" ? true : undefined,
    search: params.get("search") || undefined,
    sortBy: params.get("sortBy") as any || undefined,
    dynamicSpecs: Object.keys(dynamicSpecs).length > 0 ? dynamicSpecs : undefined,
  };
}

export default function Products() {
  const { t } = useTranslation();
  const { category: categoryParam } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const products = useStore((state) => state.products);
  const filters = useStore((state) => state.filters);
  const setFilters = useStore((state) => state.setFilters);
  const loadProducts = useStore((state) => state.loadProducts);
  const loadProductsByCategory = useStore((state) => state.loadProductsByCategory);
  const loadAllCategories = useStore((state) => state.loadAllCategories);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const PAGE_SIZE = 12;

  // ─── Scroll / position restoration ───────────────────────────────────────
  const SCROLL_KEY = `products-scroll-${categoryParam ?? 'all'}`;
  const COUNT_KEY = `products-count-${categoryParam ?? 'all'}`;

  // Read the saved count ONCE on mount (before any state)
  const restoredCount = parseInt(sessionStorage.getItem(COUNT_KEY) || '0', 10);
  const hasRestoredSession = restoredCount > PAGE_SIZE;

  // Initialize visibleCount from sessionStorage (so all previously-loaded cards render)
  const [visibleCount, setVisibleCount] = useState(
    hasRestoredSession ? restoredCount : PAGE_SIZE
  );

  // Whether scroll position has been restored this mount
  const scrollRestored = useRef(false);

  // While blockReset is true, ALL visibleCount resets from filter changes are ignored.
  // This prevents URL-sync filter updates (during initialization) from wiping the
  // restored count.  We clear it 1.5s after products first render — enough for every
  // init-triggered setFilters() call to complete.
  const blockReset = useRef(hasRestoredSession);

  // ─── URL ↔ Filters sync ──────────────────────────────────────────────────
  // urlInitialized ref (not state) avoids re-render on set
  const urlInitialized = useRef(false);

  // Keep a stable ref of current filters to read inside effects without deps
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; });

  // Load all categories list on mount
  useEffect(() => {
    if (loadAllCategories) loadAllCategories();
  }, [loadAllCategories]);

  // Active category filter
  const activeCategory = filters.category?.[0];
  const initialCategoryLoaded = useRef(false);

  // Initial mount: load active or default category
  useEffect(() => {
    const initCategoryAndProducts = async () => {
      if (initialCategoryLoaded.current) return;
      initialCategoryLoaded.current = true;

      // 1. Check URL query searchParams (?category=...)
      const paramCat = searchParams.get("category");
      if (paramCat) {
        const decoded = decodeURIComponent(paramCat);
        setFilters({ ...filtersRef.current, category: [decoded] });
        await loadProductsByCategory(decoded);
        return;
      }

      // 2. Check path categoryParam (/products/category/:category)
      if (categoryParam) {
        const decoded = decodeURIComponent(categoryParam);
        setFilters({ ...filtersRef.current, category: [decoded] });
        await loadProductsByCategory(decoded);
        return;
      }

      // 3. If category filter is already set in store
      if (filtersRef.current.category && filtersRef.current.category.length > 0) {
        await loadProductsByCategory(filtersRef.current.category[0]);
        return;
      }

      // 4. Fallback: read default category from site settings
      try {
        const settings = await getSiteSettings();
        const rawCat = settings.defaultProductCategory as unknown;
        const defaultCats: string[] = Array.isArray(rawCat)
          ? (rawCat as string[]).filter(Boolean)
          : (typeof rawCat === 'string' && rawCat.trim() ? [rawCat.trim()] : []);

        if (defaultCats.length > 0) {
          setFilters({ ...filtersRef.current, category: defaultCats });
          if (defaultCats.length === 1) {
            await loadProductsByCategory(defaultCats[0]);
          } else {
            await loadProducts();
          }
          return;
        }
      } catch (e) {
        console.warn("Failed to load default category:", e);
      }

      // 5. No default category set: ensure no category filter is applied and load all products
      setFilters({ ...filtersRef.current, category: undefined });
      if (products.length === 0 && !loading) {
        await loadProducts();
      }
    };

    initCategoryAndProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When activeCategory changes during user session
  const prevCategoryRef = useRef<string | undefined>(activeCategory);
  useEffect(() => {
    if (prevCategoryRef.current === activeCategory) return;
    prevCategoryRef.current = activeCategory;

    if (activeCategory) {
      loadProductsByCategory(activeCategory);
    } else {
      loadProducts();
    }
  }, [activeCategory, loadProductsByCategory, loadProducts]);

  const { slugMap, reverseSlugMap } = useMemo(() => {
    const sMap: Record<string, string> = {};
    const rsMap: Record<string, string> = {};
    products.forEach(p => {
      p.specifications?.forEach(spec => {
        if (spec.inFilter && spec.filterSlug) {
          sMap[spec.key] = spec.filterSlug;
          rsMap[spec.filterSlug] = spec.key;
        }
      });
    });
    return { slugMap: sMap, reverseSlugMap: rsMap };
  }, [products]);

  // Keep a stable slugMap ref so Effect #2 doesn't fire when slugMap changes
  const slugMapRef = useRef(slugMap);
  useEffect(() => { slugMapRef.current = slugMap; }, [slugMap]);

  // ① Once products are ready, parse URL params ONCE and apply to store
  const reverseSlugMapRef = useRef(reverseSlugMap);
  useEffect(() => { reverseSlugMapRef.current = reverseSlugMap; }, [reverseSlugMap]);

  // urlReadyRef: set to true AFTER Effect #1 has applied URL → store.
  // Effect #2 checks this before it writes store → URL to avoid a race.
  const urlReadyRef = useRef(false);

  useEffect(() => {
    if (urlInitialized.current) return;
    if (loading && products.length === 0) return; // wait for data

    // Make sure slug maps are current before reading URL
    reverseSlugMapRef.current = reverseSlugMap;
    slugMapRef.current = slugMap;

    urlInitialized.current = true;

    if (location.search && location.search.length > 1) {
      const fromUrl = searchParamsToFilters(searchParams, reverseSlugMapRef.current);
      const merged: any = { ...filtersRef.current, ...fromUrl };
      if (categoryParam && !merged.category) {
        merged.category = [decodeURIComponent(categoryParam)];
      }
      setFilters(merged);
    }

    // Signal that URL has been read; Effect #2 may now write back safely
    urlReadyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products.length]);

  // ② Whenever filters change → write them back to the URL
  //    Uses slugMapRef (not slugMap) so this effect only fires on filter changes,
  //    NOT on slugMap / product-load changes (which would overwrite the URL).
  useEffect(() => {
    if (!urlReadyRef.current) return;  // Don't fire before URL has been read
    if (categoryParam) return;         // /products/:category — URL sync not needed

    const newParams = filtersToSearchParams(filters, slugMapRef.current);
    const newStr = newParams.toString();

    // Strip tracking params from current URL before comparing,
    // so fbclid / utm_* etc. don't trigger an unnecessary URL replace.
    const currentForCompare = new URLSearchParams(location.search);
    TRACKING_PARAMS.forEach(tp => currentForCompare.delete(tp));
    const currentStr = currentForCompare.toString();

    if (newStr !== currentStr) {
      // Preserve any existing tracking params in the new URL
      const existingTracking = new URLSearchParams(location.search);
      const finalParams = new URLSearchParams(newParams.toString());
      existingTracking.forEach((value, key) => {
        if (TRACKING_PARAMS.has(key)) finalParams.set(key, value);
      });
      setSearchParams(finalParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ③ When navigating to a category path (/products/category/laptop), sync category filter ONCE
  const appliedCategoryParam = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (categoryParam === appliedCategoryParam.current) return;
    appliedCategoryParam.current = categoryParam;

    if (categoryParam) {
      const decodedCategory = decodeURIComponent(categoryParam);
      setFilters({
        ...filtersRef.current,
        category: [decodedCategory],
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    } else if (!location.search) {
      setFilters({
        ...filtersRef.current,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  // Apply filters to products
  const filteredProducts = useMemo(() => {
    return (products || []).filter((product) => {
      let matchesDynamicSpecs = true;

      // Exclude archived products
      if (!product || product.isArchived) return false;

      if (filters.search) {
        const searchLc = filters.search.toLowerCase();
        if (!product.name?.toLowerCase().includes(searchLc) && !product.description?.toLowerCase().includes(searchLc)) {
          return false;
        }
      }

      if (filters.category && filters.category.length > 0) {
        const selectedSlugs = filters.category.map(c => categoryToSlug(c));
        const prodSlug = categoryToSlug(product.category || "");
        if (!selectedSlugs.includes(prodSlug)) return false;
      }

      if (filters.subcategory && filters.subcategory.length > 0) {
        if (!filters.subcategory.includes(product.subcategory || "")) return false;
      }

      if (filters.brand && filters.brand.length > 0) {
        if (!filters.brand.includes(product.brand)) return false;
      }

      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;

      if (filters.color && filters.color.length > 0) {
        const productColors = product.color?.split(",").map(c => c.trim()) || [];
        if (!filters.color.some(c => productColors.includes(c))) return false;
      }

      if (filters.size && filters.size.length > 0) {
        const productSizes = product.size?.split(",").map(s => s.trim()) || [];
        if (!filters.size.some(s => productSizes.includes(s))) return false;
      }

      // Features filter (based on checking explicit `features` array + name/description keywords)
      if (filters.features && filters.features.length > 0) {
        const productFeatures: string[] = product.features ? [...product.features] : [];
        const nameLc = product.name?.toLowerCase() || "";
        const descLc = product.description?.toLowerCase() || "";
        if (!productFeatures.includes('touch') && (nameLc.includes('touch') || descLc.includes('touch'))) productFeatures.push('touch');
        if (!productFeatures.includes('x360') && (nameLc.includes('x360') || descLc.includes('x360'))) productFeatures.push('x360');
        if (!productFeatures.includes('detachable') && (nameLc.includes('detachable') || descLc.includes('detachable'))) productFeatures.push('detachable');
        if (!filters.features.some(f => productFeatures.includes(f))) return false;
      }

      // Special Offers filter
      if (filters.specialOffer !== undefined) {
        if (filters.specialOffer && !product.specialOffer) return false;
      }

      // Dynamic Specifications filter
      if (filters.dynamicSpecs && Object.keys(filters.dynamicSpecs).length > 0) {
        for (const [specKey, selectedValues] of Object.entries(filters.dynamicSpecs)) {
          if (selectedValues && selectedValues.length > 0) {
            const hasMatch = product.specifications?.some(
              spec => spec.key === specKey && selectedValues.includes(spec.value)
            );
            if (!hasMatch) { matchesDynamicSpecs = false; break; }
          }
        }
      }

      return matchesDynamicSpecs;
    });
  }, [products, filters]);

  // Apply sorting if needed
  const sortedProducts = useMemo(() => {
    return [...(filteredProducts || [])].sort((a, b) => {
      if (filters.sortBy === "price-asc") {
        return a.price - b.price;
      } else if (filters.sortBy === "price-desc") {
        return b.price - a.price;
      } else if (filters.sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      } else if (filters.sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }

      const aPriority = (a.displayPriority && a.displayPriority > 0) ? a.displayPriority : Number.MAX_SAFE_INTEGER;
      const bPriority = (b.displayPriority && b.displayPriority > 0) ? b.displayPriority : Number.MAX_SAFE_INTEGER;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [filteredProducts, filters.sortBy]);

  // ── Infinite scroll: slice only visible products ──
  const displayTotalCount = sortedProducts.length;
  const currentProducts = sortedProducts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedProducts.length;

  // ── Track Meta Pixel Category View ──
  const trackedCategoryRef = useRef<string | null>(null);
  useEffect(() => {
    if (sortedProducts.length > 0) {
      const categoryName = filters.category?.[0] || (categoryParam ? decodeURIComponent(categoryParam) : 'المنتجات');
      const trackKey = `${categoryName}-${sortedProducts.length}`;
      if (trackedCategoryRef.current !== trackKey) {
        trackedCategoryRef.current = trackKey;
        trackMetaViewCategory(categoryName, sortedProducts);
      }
    }
  }, [filters.category, categoryParam, sortedProducts]);

  // ─── Restore scroll position after products are rendered ─────────────────
  useLayoutEffect(() => {
    if (scrollRestored.current) return;
    if (loading || sortedProducts.length === 0) return;

    scrollRestored.current = true;

    const savedY = parseInt(sessionStorage.getItem(SCROLL_KEY) || '0', 10);

    // Clear sessionStorage immediately so a fresh visit starts at top
    sessionStorage.removeItem(SCROLL_KEY);
    sessionStorage.removeItem(COUNT_KEY);

    if (savedY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior });
      });
    }

    // Unblock filter-resets 1.5s after first render — by then every
    // init-triggered setFilters() call (URL sync, category param) is done.
    setTimeout(() => {
      blockReset.current = false;
    }, 1500);
  }, [loading, sortedProducts.length]);

  // ─── Save scroll position + visibleCount when leaving the page ────────────
  useEffect(() => {
    const handleBeforeLeave = () => {
      sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
      sessionStorage.setItem(COUNT_KEY, String(visibleCount));
    };
    // Capture on any click so we save before navigation occurs
    window.addEventListener('click', handleBeforeLeave, { capture: true });
    return () => {
      window.removeEventListener('click', handleBeforeLeave, { capture: true });
    };
  }, [visibleCount]);

  // ─── Reset visible count when user changes filters ──────
  const prevFiltersJsonRef = useRef<string>(JSON.stringify(filters));
  useEffect(() => {
    const currentJson = JSON.stringify(filters);
    if (prevFiltersJsonRef.current === currentJson) return;
    prevFiltersJsonRef.current = currentJson;

    if (blockReset.current) return;
    setVisibleCount(PAGE_SIZE);
    scrollRestored.current = false;
  }, [filters]);

  // Load next batch when clicking Load More button
  const loadMore = useCallback(() => {
    if (visibleCount < sortedProducts.length) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  }, [visibleCount, sortedProducts.length]);



  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4ff" }}>
      <SEOHelmet
        title="لابتوبات وأجهزة كمبيوتر وشاشات استيراد أصلية Dell, HP, Lenovo"
        description="تصفح أكبر تشكيلة لابتوبات استيراد، أجهزة PC، شاشات، و All in One بمكونات أصلية 100% تناسب البرمجة والمونتاج والذكاء الاصطناعي والهندسة بأسعار المستورد."
        keywords="لابتوبات استيراد, كمبيوتر استيراد, شاشات استيراد, اجهزة all in one, لابتوب للبرمجة, لابتوب ذكاء اصطناعي, لابتوب للمونتاج, لابتوب برامج هندسية, Dell, HP, Lenovo, كمبيو سيف"
        url="/products"
      />
      <div className="container py-6 flex-1">
        <ActiveFilters />

        {/* Search */}
        <div className="w-full mb-5">
          <ProductSearch
            value={filters.search || ""}
            onChange={(value) => setFilters({ ...filters, search: value })}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile Filter Button */}
          <div className="md:hidden mb-2">
            <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full font-bold rounded-xl shadow-sm gap-2"
                  style={{
                    borderColor: "rgba(30,77,183,0.4)",
                    color: "#1e4db7",
                    background: "#fff",
                  }}
                >
                  <Filter className="h-4 w-4" />
                  التصفية والفلترة
                  {Object.keys(filters).filter(k => filters[k as keyof typeof filters] !== undefined
                    && filters[k as keyof typeof filters] !== ''
                    && k !== 'search' && k !== 'sortBy').length > 0 && (
                      <span className="mr-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "#1e4db7" }}>
                        !
                      </span>
                    )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="rounded-t-3xl">
                <div className="mx-auto w-full max-w-sm">
                  <DrawerHeader>
                    <DrawerTitle className="text-center font-bold">{t("filters.title")}</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 overflow-y-auto max-h-[75vh]">
                    <ProductFilters />
                  </div>
                  <DrawerFooter className="border-t pt-4">
                    <Button
                      onClick={() => setOpenDrawer(false)}
                      className="w-full rounded-xl font-bold text-white"
                      style={{
                        background: "linear-gradient(90deg, #0a2463, #3B82F6)",
                        border: "none",
                      }}
                    >
                      {t("filters.apply")}
                    </Button>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:block lg:w-72 w-60 shrink-0">
            <div
              className="rounded-2xl border shadow-sm p-5 sticky top-20"
              style={{
                background: "#fff",
                borderColor: "rgba(30,77,183,0.15)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="rounded-full"
                  style={{ width: 4, height: 20, background: "linear-gradient(180deg,#0a2463,#3B82F6)" }}
                />
                <h2 className="text-base font-black" style={{ color: "#0a2463" }}>{t("filters.title")}</h2>
              </div>
              <ProductFilters />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* View Toggle Toolbar */}
            <div className="flex justify-end gap-2 mb-4">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'text-white font-bold' : 'font-bold'}
                style={viewMode === 'grid'
                  ? { background: "linear-gradient(135deg,#0a2463,#3B82F6)", border: "none" }
                  : { borderColor: "rgba(30,77,183,0.3)", color: "#1e4db7" }
                }
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                شبكة
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'text-white font-bold' : 'font-bold'}
                style={viewMode === 'list'
                  ? { background: "linear-gradient(135deg,#0a2463,#3B82F6)", border: "none" }
                  : { borderColor: "rgba(30,77,183,0.3)", color: "#1e4db7" }
                }
              >
                <List className="w-4 h-4 mr-2" />
                قائمة
              </Button>
            </div>

            {loading && currentProducts.length === 0 ? (
              /* ── Skeleton loading (initial load) ── */
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'grid-cols-1 gap-4'}`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`rounded-2xl overflow-hidden border border-gray-100 bg-white ${viewMode === 'list' ? 'flex h-40' : ''}`}>
                    <div className={`${viewMode === 'list' ? 'w-40' : 'aspect-[4/5]'} shimmer`} />
                    <div className="p-4 space-y-2 flex-1">
                      <div className="h-4 shimmer rounded-lg w-3/4" />
                      <div className="h-3 shimmer rounded-lg w-1/2" />
                      <div className="h-5 shimmer rounded-lg w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : currentProducts.length > 0 ? (
              <>
                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                  {currentProducts.map((product, i) => (
                    <div
                      key={product.id}
                      style={{
                        animationDelay: `${Math.min(i % 12, 11) * 0.04}s`,
                      }}
                      className="animate-fade-slide-in"
                    >
                      <ProductCard
                        product={product}
                        onView={() => handleViewProduct(product)}
                        viewMode={viewMode}
                      />
                    </div>
                  ))}
                </div>

                {/* ── Load More & Progress ── */}
                <div className="mt-10 flex flex-col items-center gap-6 pb-8">
                  {/* Progress Indicator */}
                  {displayTotalCount > 0 && (
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                      <p className="text-sm font-medium" style={{ color: "#64748b" }}>
                        تم عرض <span className="font-black" style={{ color: "#0a2463" }}>{currentProducts.length}</span> من أصل <span className="font-black" style={{ color: "#0a2463" }}>{displayTotalCount}</span> منتج
                      </p>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,77,183,0.12)" }} dir="rtl">
                        <div
                          className="h-full transition-all duration-500 ease-out rounded-full"
                          style={{
                            width: `${Math.min(100, (currentProducts.length / displayTotalCount) * 100)}%`,
                            background: "linear-gradient(90deg, #0a2463, #3B82F6)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Load More Button */}
                  {hasMore && (
                    <Button
                      onClick={loadMore}
                      variant="outline"
                      className="min-w-[200px] h-12 rounded-xl font-black transition-all shadow-sm"
                      style={{
                        borderColor: "rgba(30,77,183,0.3)",
                        color: "#1e4db7",
                        background: "#fff",
                      }}
                    >
                      إظهار المزيد من المنتجات
                    </Button>
                  )}

                  {!hasMore && !loading && sortedProducts.length > 0 && (
                    <div className="text-sm text-emerald-600 font-medium py-2 px-6 bg-emerald-50 rounded-full ring-1 ring-emerald-100 flex items-center gap-2 mt-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      لقد شاهدت جميع المنتجات
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(30,77,183,0.08)" }}
                >
                  <Search className="h-10 w-10" style={{ color: "rgba(30,77,183,0.35)" }} />
                </div>
                <h3 className="text-xl font-black mb-2" style={{ color: "#0a2463" }}>لا توجد نتائج</h3>
                <p className="text-sm max-w-xs" style={{ color: "#94a3b8" }}>{t("products.noProductsFound")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal product={selectedProduct} open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}

      <Footer />
    </div>
  );
}

