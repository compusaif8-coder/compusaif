import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, DollarSign, Settings2 } from "lucide-react";
import { productsService } from "@/lib/firebase";

export function BulkPriceUpdateTool() {
  const { products, loadProducts } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("laptop");
  const [updateType, setUpdateType] = useState<"percentage" | "fixed">("percentage");
  const [operation, setOperation] = useState<"increase" | "decrease" | "set">("increase");
  const [targetElement, setTargetElement] = useState<"base" | "options">("base");
  const [selectedGroupName, setSelectedGroupName] = useState<string>("all");
  const [selectedOptionName, setSelectedOptionName] = useState<string>("all");
  const [amount, setAmount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Round change to nearest 50 or 100
  const quantizeAmount = (amount: number) => {
    // If we want either 50 or 100, we round to nearest 50
    // so 25-74 -> 50, 75-124 -> 100, etc.
    const quantum = 50;
    const rounded = Math.round(amount / quantum) * quantum;
    return rounded === 0 ? quantum : rounded; // Minimum change is 50
  };

  const getTargetProducts = () => {
    return products.filter((p) => p.category === category);
  };

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    getTargetProducts().forEach((p) => {
      p.customOptionGroups?.forEach((g) => {
        if (g.name) groups.add(g.name);
      });
    });
    return Array.from(groups);
  }, [products, category]);

  const availableOptions = useMemo(() => {
    const options = new Set<string>();
    getTargetProducts().forEach((p) => {
      p.customOptionGroups?.forEach((g) => {
        if (selectedGroupName === "all" || g.name === selectedGroupName) {
          g.options?.forEach((opt) => {
            if (opt.label) options.add(opt.label);
          });
        }
      });
    });
    return Array.from(options);
  }, [products, category, selectedGroupName]);

  const calculateNewPrice = (currentPrice: number) => {
    const val = Number(amount);
    if (!val || val <= 0) return currentPrice;

    // Direct set mode: replace price directly
    if (operation === "set") {
      return Math.max(0, val);
    }

    let delta = 0;
    if (updateType === "fixed") {
      delta = val;
    } else {
      // Percentage
      const exactChange = (currentPrice * val) / 100;
      if (exactChange === 0) return currentPrice;
      delta = quantizeAmount(exactChange);
    }
    
    // Ensure new price never goes below 0
    const newPrice = operation === "increase" ? currentPrice + delta : currentPrice - delta;
    return Math.max(0, newPrice);
  };

  const handleUpdate = async () => {
    const val = Number(amount);
    if (!val || val <= 0) {
      toast.error("الرجاء إدخال قيمة صحيحة");
      return;
    }

    const targetProducts = getTargetProducts();
    if (targetProducts.length === 0) {
      toast.error("لا يوجد منتجات في هذا التصنيف");
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من تحديث أسعار ${targetProducts.length} منتج؟\n\nتنبيه: لا يمكن التراجع عن هذا الإجراء.`
    );

    if (!confirmed) return;

    setIsUpdating(true);
    toast.loading("جاري تحديث الأسعار...", { id: "bulk-update" });

    try {
      let updatedCount = 0;
      for (const product of targetProducts) {
        let isModified = false;
        const updatedProduct = { ...product };

        if (targetElement === "base") {
          const newPrice = calculateNewPrice(product.price);
          if (newPrice !== product.price) {
            updatedProduct.price = newPrice;
            // Optionally, update sizes prices if they exist
            if (updatedProduct.sizes && updatedProduct.sizes.length > 0) {
              updatedProduct.sizes = updatedProduct.sizes.map((size) => ({
                ...size,
                price: calculateNewPrice(Number(size.price)),
              }));
            }
            isModified = true;
          }
        } else if (targetElement === "options") {
          if (updatedProduct.customOptionGroups && updatedProduct.customOptionGroups.length > 0) {
            updatedProduct.customOptionGroups = updatedProduct.customOptionGroups.map((g) => {
              if (selectedGroupName === "all" || g.name === selectedGroupName) {
                return {
                  ...g,
                  options: g.options.map((opt, optIndex) => {
                    const matchesOption = selectedOptionName === "all" || opt.label === selectedOptionName;
                    if (matchesOption) {
                      // In "set" mode with ALL options: skip the first option (index 0) — it's the base tier
                      // But when a SPECIFIC option is selected by name, ALWAYS update it regardless of position.
                      if (operation === "set" && optIndex === 0 && selectedOptionName === "all") {
                        return opt;
                      }
                      const currentExtra = Number(opt.extraPrice) || 0;
                      // Only apply change to options that already have an extra price > 0,
                      // OR if the user explicitly selected this specific option label.
                      if (currentExtra > 0 || selectedOptionName !== "all") {
                        const newExtra = calculateNewPrice(currentExtra);
                        if (newExtra !== currentExtra) {
                          isModified = true;
                          return { ...opt, extraPrice: newExtra };
                        }
                      }
                    }
                    return opt;
                  })
                };
              }
              return g;
            });
          }
        }

        if (isModified) {
          await productsService.updateProduct(product.id, updatedProduct);
          updatedCount++;
        }
      }

      await loadProducts(); // Reload to refresh the local state
      toast.success(`تم تحديث أسعار ${updatedCount} منتج بنجاح`, { id: "bulk-update" });
      setAmount("");
    } catch (error) {
      console.error("Error bulk updating prices:", error);
      toast.error("حدث خطأ أثناء تحديث الأسعار", { id: "bulk-update" });
    } finally {
      setIsUpdating(false);
    }
  };

  const targetCount = getTargetProducts().length;

  // Handle category change reset
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setSelectedGroupName("all");
    setSelectedOptionName("all");
  };

  const handleTargetElementChange = (val: "base" | "options") => {
    setTargetElement(val);
    // Reset operation to "increase" when switching away from options
    if (val === "base" && operation === "set") {
      setOperation("increase");
    }
  };

  const handleGroupNameChange = (val: string) => {
    setSelectedGroupName(val);
    setSelectedOptionName("all");
    // Reset set mode when group changes
    if (operation === "set") setOperation("increase");
  };

  const handleOptionNameChange = (val: string) => {
    setSelectedOptionName(val);
    // Reset set mode when switching to "all"
    if (val === "all" && operation === "set") setOperation("increase");
  };

  // Whether "set direct price" mode is available
  const canUseSetMode = targetElement === "options" && selectedOptionName !== "all";

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-card rounded-lg border shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">تحديث الأسعار المجمع (منتجات وخيارات)</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="p-4 space-y-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <Label>التصنيف المستهدف</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptop">لابتوب (Laptop)</SelectItem>
                  <SelectItem value="desktop">كمبيوتر مكتبي (Desktop)</SelectItem>
                  <SelectItem value="monitor">شاشات (Monitor)</SelectItem>
                  <SelectItem value="storage">وحدات تخزين (Storage)</SelectItem>
                  <SelectItem value="accessories">إكسسوارات وملحقات (Accessories)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>العنصر المراد تحديث سعره</Label>
              <Select value={targetElement} onValueChange={handleTargetElementChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">سعر المنتج الأساسي</SelectItem>
                  <SelectItem value="options">الخيارات الإضافية (مثل حجم الرامات أو التخزين)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetElement === "options" && (
              <>
                <div className="space-y-2">
                  <Label>تحديد القسم (مثال: الرامات)</Label>
                  <Select value={selectedGroupName} onValueChange={handleGroupNameChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل الأقسام" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">تحديث في جميع الأقسام المتاحة</SelectItem>
                      {availableGroups.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تحديد الخيار (مثال: RAM 16GB)</Label>
                  <Select value={selectedOptionName} onValueChange={handleOptionNameChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل الخيارات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">تحديث جميع الخيارات الإضافية (ذات التكلفة)</SelectItem>
                      {availableOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>الغرض من التعديل</Label>
              <Select
                value={operation}
                onValueChange={(val: "increase" | "decrease" | "set") => setOperation(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">زيادة السعر (+)</SelectItem>
                  <SelectItem value="decrease">تخفيض السعر (-)</SelectItem>
                  {canUseSetMode && (
                    <SelectItem value="set">تحديد سعر مباشر (=)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {operation !== "set" && (
              <div className="space-y-2">
                <Label>نوع التعديل</Label>
                <Select
                  value={updateType}
                  onValueChange={(val: "percentage" | "fixed") => setUpdateType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ج.م)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {operation === "set" ? `السعر المباشر لـ "${selectedOptionName}" (ج.م)` : "مقدار التعديل"}
              </Label>
              {operation === "set" ? (
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="مثال: 1850"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ج.م</span>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder={updateType === "percentage" ? "مثال: 5" : "مثال: 500"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {updateType === "percentage" ? "%" : "ج.م"}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-end md:col-span-2">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating || !amount || Number(amount) <= 0 || targetCount === 0}
                className="w-full gap-2 py-6"
              >
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <DollarSign className="h-5 w-5" />
                )}
                {isUpdating ? "جاري التحديث..." : `تحديث أسعار (${targetCount}) منتج مطابق (${targetElement === 'base' ? 'السعر الأساسي' : 'الخيارات'})`}
              </Button>
            </div>
          </div>
          {operation === "set" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 border-t pt-2">
              ⚠️ وضع التحديد المباشر: سيتم تعيين سعر الفارق (extraPrice) لـ &quot;{selectedOptionName}&quot; بالقيمة المدخلة مباشرةً في جميع المنتجات المطابقة، <strong>مع تخطي أول خيار في كل مجموعة (الخيار الأساسي)</strong>.
            </p>
          )}
          {operation !== "set" && updateType === "percentage" && (
            <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
              ملاحظة: سيتم تقريب {operation === "increase" ? "الزيادة" : "النقصان"} إلى أقرب 50 أو 100 جنيه لصالح السعر (مثلاً لو كانت 60 جنيه سيتم تقريبها إلى 50، ولو كانت 80 سيتم تقريبها إلى 100). الحد الأدنى {operation === "increase" ? "للزيادة" : "للنقصان"} هو 50 جنيه.
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
