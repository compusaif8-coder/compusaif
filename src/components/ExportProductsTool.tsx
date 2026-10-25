import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileCode,
  FileText,
  Database,
  Globe,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import { productsService } from "@/lib/firebase";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { exportGoogleMerchantFeed } from "@/utils/googleMerchantExport";

export function ExportProductsTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportBackup = async (format: "json" | "csv") => {
    try {
      setIsExporting(true);
      toast.loading("جاري جلب المنتجات...", { id: "export" });
      const products = await productsService.getAllProducts();

      if (!products.length) {
        toast.error("لا توجد منتجات لتصديرها", { id: "export" });
        return;
      }

      toast.loading("جاري تحضير الملف...", { id: "export" });

      let dataToDownload: string;
      let mimeType: string;
      let fileExtension: string;

      if (format === "json") {
        dataToDownload = JSON.stringify(products, null, 2);
        mimeType = "application/json";
        fileExtension = "json";
      } else {
        const csvData = products.map((p) => {
          return {
            ...p,
            images: JSON.stringify(p.images || []),
            videoUrls: JSON.stringify(p.videoUrls || []),
            sizes: JSON.stringify(p.sizes || []),
            customOptionGroups: JSON.stringify(p.customOptionGroups || []),
            addons: JSON.stringify(p.addons || []),
            specifications: JSON.stringify(p.specifications || []),
            features: JSON.stringify(p.features || []),
            costs: JSON.stringify(p.costs || {}),
            wholesaleInfo: JSON.stringify(p.wholesaleInfo || {}),
            processor: JSON.stringify(p.processor || {}),
            dedicatedGraphics: JSON.stringify(p.dedicatedGraphics || {}),
            display: JSON.stringify(p.display || {}),
          };
        });

        dataToDownload = Papa.unparse(csvData, { header: true });
        mimeType = "text/csv;charset=utf-8;";
        fileExtension = "csv";
      }

      const blob = new Blob([dataToDownload], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_backup_${new Date().toISOString().split("T")[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `تم تصدير ${products.length} منتج بنجاح كملف ${format.toUpperCase()}`,
        { id: "export" }
      );
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تصدير المنتجات", { id: "export" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoogleMerchantExport = async (format: "tsv" | "xml" | "csv") => {
    try {
      setIsExporting(true);
      toast.loading("جاري جلب وتجهيز المنتجات لـ Google Merchant...", { id: "gmc-export" });
      const products = await productsService.getAllProducts();

      if (!products.length) {
        toast.error("لا توجد منتجات لتصديرها", { id: "gmc-export" });
        return;
      }

      const res = exportGoogleMerchantFeed(products, format);
      if (res.success) {
        toast.success(
          `تم تصدير ${res.count} منتج بنجاح بصيغة ${format.toUpperCase()} المتوافقة مع Google Merchant Center!`,
          { id: "gmc-export", duration: 5000 }
        );
      } else {
        toast.error(res.error || "فشل إنشاء ملف Google Merchant", { id: "gmc-export" });
      }
    } catch (error: any) {
      console.error(error);
      toast.error("حدث خطأ أثناء تصدير ملف Google Merchant", { id: "gmc-export" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-card rounded-lg border shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">تصدير المنتجات وGoogle Merchant Center</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="p-4 space-y-6 border-t">
          {/* Google Merchant Center Section */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>تغذية المنتجات لـ Google Merchant Center (GMC Feed)</span>
              <span className="text-[11px] bg-blue-600 text-white dark:bg-blue-500 px-2 py-0.5 rounded-full font-normal">
                مطابق لمعايير جوجل
              </span>
            </div>
            <p className="text-xs text-blue-900/80 dark:text-blue-200 leading-relaxed">
              ملفات مهيأة خصيصاً للتوافق مع شروط Google Merchant Center (تشمل الحقول القياسية: المعرّف id، العنوان، الوصف، روابط المنتجات، الصور، العملة EGP، حالة التوفر، حالة المنتج، وتعطيل إجبارية الباركود GTIN).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <Button
                onClick={() => handleGoogleMerchantExport("tsv")}
                disabled={isExporting}
                variant="outline"
                className="gap-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/70 h-auto py-2.5 flex-col items-center justify-center text-center shadow-xs"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>تصدير TSV (موصى به ⭐)</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-normal">
                  الحل الأضمن لتفادي أخطاء الـ XML
                </span>
              </Button>

              <Button
                onClick={() => handleGoogleMerchantExport("xml")}
                disabled={isExporting}
                variant="outline"
                className="gap-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 h-auto py-2.5 flex-col items-center justify-center text-center shadow-xs"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>تصدير XML (RSS 2.0)</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-normal">
                  تغذية Google RSS القياسية
                </span>
              </Button>

              <Button
                onClick={() => handleGoogleMerchantExport("csv")}
                disabled={isExporting}
                variant="outline"
                className="gap-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 h-auto py-2.5 flex-col items-center justify-center text-center shadow-xs"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تصدير CSV لـ Google</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-normal">
                  أعمدة إنجليزية قياسية
                </span>
              </Button>
            </div>
          </div>

          {/* Backup Database Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">نسخة احتياطية كاملة للمتجر (Full Database Backup)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                قم بتصدير جميع منتجات المتجر ببياناتها الخام الكاملة كملف احتياطي (Backup).
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => handleExportBackup("json")}
                disabled={isExporting}
                className="flex-1 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                variant="outline"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <FileJson className="w-5 h-5" />
                )}
                تصدير JSON (شامل)
              </Button>
              <Button
                onClick={() => handleExportBackup("csv")}
                disabled={isExporting}
                className="flex-1 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                variant="outline"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
                تصدير CSV
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
