import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileUp, Save, ChevronDown, ChevronUp, AlertCircle, RefreshCcw } from "lucide-react";
import { productsService, db } from "@/lib/firebase";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { writeBatch, doc, getDocs, collection, query } from "firebase/firestore";
import { Product } from "@/types/product";
import { useStore } from "@/store/useStore";

export function ImportProductsTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"merge" | "create_only" | "update_only">("merge");
  const [parsedData, setParsedData] = useState<Partial<Product>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadProducts } = useStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        if (fileExt === 'json') {
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            setParsedData(data);
            toast.success(`تم قراءة ${data.length} منتج من ملف JSON`);
          } else {
            toast.error('ملف JSON غير صالح: يجب أن يكون مصفوفة من المنتجات.');
          }
        } else if (fileExt === 'csv') {
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const data = results.data.map(parseProductCsv);
              setParsedData(data);
              toast.success(`تم قراءة ${data.length} منتج من ملف CSV`);
            },
            error: (error) => {
              toast.error('حدث خطأ أثناء قراءة ملف CSV: ' + error.message);
            }
          });
        } else {
          toast.error("صيغة الملف غير مدعومة. الرجاء رفع JSON أو CSV.");
        }
      } catch (err) {
        toast.error("حدث خطأ أثناء تحليل الملف تأكد من صحة التنسيق.");
      }
    };

    if (fileExt === 'json') {
      reader.readAsText(file);
    } else if (fileExt === 'csv') {
      reader.readAsText(file, 'utf-8');
    }
  };

  const parseProductCsv = (row: any): Partial<Product> => {
    const parseField = (fieldValue: any) => {
        if (!fieldValue || fieldValue === 'undefined') return undefined;
        try {
            return JSON.parse(fieldValue);
        } catch {
            return fieldValue;
        }
    }
    
    return {
        ...row,
        price: Number(row.price) || 0,
        displayPriority: row.displayPriority ? Number(row.displayPriority) : undefined,
        discountPercentage: row.discountPercentage && row.discountPercentage !== 'undefined' ? Number(row.discountPercentage) : undefined,
        discountPrice: row.discountPrice && row.discountPrice !== 'undefined' ? Number(row.discountPrice) : undefined,
        images: parseField(row.images) || [],
        videoUrls: parseField(row.videoUrls),
        sizes: parseField(row.sizes) || [],
        customOptionGroups: parseField(row.customOptionGroups) || [],
        addons: parseField(row.addons) || [],
        specifications: parseField(row.specifications) || [],
        features: parseField(row.features) || [],
        costs: parseField(row.costs),
        wholesaleInfo: parseField(row.wholesaleInfo),
        processor: parseField(row.processor),
        dedicatedGraphics: parseField(row.dedicatedGraphics),
        display: parseField(row.display),
        isArchived: row.isArchived === "true" || row.isArchived === true,
        specialOffer: row.specialOffer === "true" || row.specialOffer === true,
    }
  };

  // Helper from the productsService to handle basic logic locally
  const replaceUndefinedWithNull = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(item => replaceUndefinedWithNull(item));
    }
    if (value instanceof Date) {
      return value;
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => [
          key,
          replaceUndefinedWithNull(val === undefined ? null : val),
        ])
      );
    }
    return value === undefined ? null : value;
  };

  const executeImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error("لا توجد بيانات للاستيراد");
      return;
    }

    const confirm = window.confirm(`سوف يتم استيراد/تحديث ${parsedData.length} منتج باستخدام وضع (${mode === 'merge' ? 'دمج' : mode === 'create_only' ? 'إضافة فقط' : 'تحديث فقط'}). هل أنت متأكد؟`);
    if (!confirm) return;

    setIsImporting(true);
    toast.loading("جاري معالجة ورفع البيانات...", { id: "import" });

    try {
      // If we need to check existence for update_only or create_only, let's fetch all IDs first to be efficient
      let existingIds = new Set<string>();
      if (mode === "create_only" || mode === "update_only") {
         const productsRef = collection(db, "products");
         const snap = await getDocs(query(productsRef));
         snap.forEach(doc => existingIds.add(doc.id));
      }

      let processedCount = 0;
      let skippedCount = 0;

      const validProducts = parsedData.filter(p => {
        if (!p.name || typeof p.price !== 'number') return false; // Minimal validation
        return true;
      });

      const CHUNK_SIZE = 400; // Safe margin below 500
      for (let i = 0; i < validProducts.length; i += CHUNK_SIZE) {
        const chunk = validProducts.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const p of chunk) {
          let productId = p.id;
          
          if (!productId) {
             // Fallback generate simple ID if completely missing
             productId = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          }

          if (mode === "create_only" && existingIds.has(productId)) {
            skippedCount++;
            continue;
          }

          if (mode === "update_only" && !existingIds.has(productId)) {
            skippedCount++;
            continue;
          }

          const docRef = doc(db, "products", productId);
          
          // Clean undefined values
          const normalized = replaceUndefinedWithNull(p);
          const cleanProduct = Object.fromEntries(
            Object.entries(normalized).filter(([_, value]) => value !== undefined)
          );
          
          // Remove ID from the data body
          delete cleanProduct.id;

          // Merge: true is used for both 'merge' mode and 'update_only', and even 'create_only' is safe since we checked existence
          batch.set(docRef, cleanProduct, { merge: true });
          processedCount++;
        }

        await batch.commit();
      }

      setParsedData([]);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadProducts(); // Refresh global store

      toast.success(`اكتمل: تم معالجة ${processedCount} وتخطي ${skippedCount} منتج بنجاح`, { id: "import" });
    } catch (error: any) {
      console.error(error);
      toast.error(`خطأ أثناء الاستيراد: ${error?.message || "خطأ غير معروف"}`, { id: "import" });
    } finally {
      setIsImporting(false);
    }
  };

  const resetSelection = () => {
    setParsedData([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-card rounded-lg border shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">استيراد المنتجات (Import)</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="p-4 space-y-5 border-t">
          {parsedData.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">اضغط لرفع ملف (JSON المصدّر من الموقع او CSV)</p>
              <p className="text-xs text-gray-500 mt-1">يُشترط استخدام نفس Structure التصدير</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json,.csv" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-green-50 text-green-700 p-3 rounded-lg border border-green-200">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">تم قراءة الملف ({fileName}) بنجاح</span>
                  <span className="text-xs mt-1">عدد المنتجات المستخرجة: {parsedData.length} منتج</span>
                </div>
                <Button variant="ghost" size="icon" onClick={resetSelection} className="text-green-700 hover:text-green-900 hover:bg-green-100">
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>نوع عملية الاستيراد</Label>
                <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">دمج (تحديث إذا تواجد أو إضافة إن لم يتواجد)</SelectItem>
                    <SelectItem value="create_only">إضافة فقط (سيتم تجاهل المعرفات المكررة)</SelectItem>
                    <SelectItem value="update_only">تحديث فقط (تحديث المتواجد فقط وتجاهل الجديد)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-700">معاينة البيانات (أول 3 منتجات)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">الاسم</th>
                        <th className="px-3 py-2 font-medium">السعر</th>
                        <th className="px-3 py-2 font-medium">القسم</th>
                        <th className="px-3 py-2 font-medium">الماركة</th>
                        <th className="px-3 py-2 font-medium">معرّف (ID)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedData.slice(0, 3).map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[150px]">{p.name || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{p.price || 0}</td>
                          <td className="px-3 py-2 text-gray-600">{p.category || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{p.brand || '-'}</td>
                          <td className="px-3 py-2 text-gray-400 font-mono truncate max-w-[100px]">{p.id || <span className="text-amber-500 text-[10px]">تلقائي</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 3 && (
                  <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-100 text-center text-xs text-gray-500">
                    و {parsedData.length - 3} منتجات أخرى...
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 bg-amber-50 p-3 border border-amber-200 rounded-lg text-amber-700 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                  تأكد من صحة البيانات قبل التنفيذ. هذه العملية لا يمكن التراجع عنها، وسوف تقوم بمعالجة المنتجات على دفعات لضمان عدم توقف النظام.
                </p>
              </div>

              <Button 
                onClick={executeImport} 
                disabled={isImporting} 
                className="w-full gap-2 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isImporting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري رفع المنتجات...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    بدء استيراد {parsedData.length} منتج إلى قاعدة البيانات
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
