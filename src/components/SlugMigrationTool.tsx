import { useState } from "react";
import { useStore } from "@/store/useStore";
import { productsService } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wand2, CheckCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

/**
 * SlugMigrationTool
 * ------------------
 * Scans all products, builds a map of { specKey → filterSlug } from those
 * that already have a filterSlug defined, then bulk-updates every product whose
 * specs are missing the slug.  Safe to run multiple times (idempotent).
 */
export function SlugMigrationTool() {
  const products = useStore((s) => s.products);
  const loadProducts = useStore((s) => s.loadProducts);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const run = async () => {
    setRunning(true);
    setResult(null);

    try {
      // ── Step 1: Build the global slug map from all products ────────────────
      const slugMap: Record<string, string> = {};
      products.forEach((p) => {
        p.specifications?.forEach((spec) => {
          if (spec.inFilter && spec.filterSlug && spec.key) {
            // Last-write wins – only real slugs (non-empty) are recorded
            if (spec.filterSlug.trim() !== "") {
              slugMap[spec.key] = spec.filterSlug.trim();
            }
          }
        });
      });

      const knownKeys = Object.keys(slugMap);
      if (knownKeys.length === 0) {
        toast.warning("لم يتم العثور على أي Slug محفوظة. قم بإضافة Slug لمواصفة واحدة على الأقل أولاً.");
        setRunning(false);
        return;
      }

      // ── Step 2: Find products that need updating ────────────────────────────
      const toUpdate: typeof products = [];

      products.forEach((p) => {
        if (!p.specifications) return;

        const hasOutdatedSpec = p.specifications.some((spec) => {
          const expectedSlug = slugMap[spec.key];
          if (!expectedSlug) return false; // not in our map, skip
          return spec.filterSlug !== expectedSlug; // missing or wrong slug
        });

        if (hasOutdatedSpec) toUpdate.push(p);
      });

      if (toUpdate.length === 0) {
        toast.success("✅ جميع المنتجات محدثة بالفعل – لا يوجد شيء للترحيل.");
        setResult({ updated: 0, skipped: products.length });
        setRunning(false);
        return;
      }

      // ── Step 3: Batch update in Firebase ───────────────────────────────────
      let updatedCount = 0;
      let failed = 0;

      for (const p of toUpdate) {
        try {
          const updatedSpecs = (p.specifications || []).map((spec) => {
            const expectedSlug = slugMap[spec.key];
            if (expectedSlug && spec.filterSlug !== expectedSlug) {
              return { ...spec, filterSlug: expectedSlug };
            }
            return spec;
          });

          await productsService.updateProduct(p.id, { specifications: updatedSpecs });
          updatedCount++;
        } catch (err) {
          console.error(`❌ Failed to update product ${p.id}:`, err);
          failed++;
        }
      }

      // ── Step 4: Reload store ────────────────────────────────────────────────
      await loadProducts();

      const msg = failed > 0
        ? `تم تحديث ${updatedCount} منتج، فشل ${failed}. تحقق من الكونسول.`
        : `✅ تم ترحيل ${updatedCount} منتج بنجاح! (${Object.keys(slugMap).length} Slug مطبقة)`;

      failed > 0 ? toast.error(msg) : toast.success(msg);
      setResult({ updated: updatedCount, skipped: products.length - toUpdate.length });
    } catch (err) {
      console.error("Migration failed:", err);
      toast.error("فشل الترحيل. تحقق من الكونسول.");
    } finally {
      setRunning(false);
    }
  };

  // Count how many slugs are available in the current products
  const availableSlugs = (() => {
    const m: Record<string, string> = {};
    products.forEach((p) =>
      p.specifications?.forEach((s) => {
        if (s.inFilter && s.filterSlug?.trim()) m[s.key] = s.filterSlug.trim();
      })
    );
    return Object.entries(m);
  })();

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-amber-900">أداة ترحيل Filter Slugs</h3>
          {availableSlugs.length > 0 && !isOpen && (
            <span className="text-xs font-semibold bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full hidden sm:inline-block">
              {availableSlugs.length} Slugs متاحة
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-amber-700" />
        ) : (
          <ChevronDown className="w-5 h-5 text-amber-700" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4 border-t border-amber-200/50 mt-2">
          <p className="text-xs text-amber-700 leading-relaxed max-w-3xl">
            تطبيق الأسماء البرمجية (Slugs) المحفوظة على جميع المنتجات دفعة واحدة.
            آمن للتشغيل أكثر من مرة، وسيقوم بتحديث المنتجات التي تفتقر للـ Slugs أو تحتوي على Slugs غير متطابقة فقط.
          </p>

          {availableSlugs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-white/60 rounded-lg border border-amber-100">
              {availableSlugs.map(([key, slug]) => (
                <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-amber-200 text-[11px] text-amber-800 font-mono">
                  <span className="text-gray-500 font-normal">{key}</span>
                  <span className="text-amber-400">→</span>
                  <span className="font-bold text-blue-600">{slug}</span>
                </span>
              ))}
            </div>
          )}

          {availableSlugs.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 p-3 bg-white/60 rounded-lg border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              لا توجد Slugs محفوظة بعد. قم بإضافة Slug لمواصفة واحدة على الأقل لأحد المنتجات لحفظه وتطبيقه على الباقي.
            </p>
          )}

          {result && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              محدّث: <strong>{result.updated}</strong> منتج &nbsp;|&nbsp; لم يحتج تحديثاً: <strong>{result.skipped}</strong>
            </div>
          )}

          <Button
            size="sm"
            disabled={running || availableSlugs.length === 0}
            onClick={run}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg h-9 gap-2 px-6 shadow-sm"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                جارٍ الترحيل...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                تطبيق Slugs على جميع المنتجات ({products.length} منتج)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
