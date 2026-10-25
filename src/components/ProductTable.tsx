import { Product } from "@/types/product";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Timer,
  ArrowDownToLine,
  FileSpreadsheet,
  FileCode,
  FileText,
  Package,
  Globe,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { DEFAULT_SUPPLIER } from "@/constants/supplier";
import { formatCurrency } from "@/utils/format";
import { Input } from "@/components/ui/input";
import { exportProductsToExcel } from "@/utils/excelExport";
import { exportGoogleMerchantFeed } from "@/utils/googleMerchantExport";

interface ProductTableProps {
  products?: Product[];
  searchQuery: string;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onUpdateQuantity?: (productId: string, newQuantity: number) => void;
  onUpdatePriority?: (productId: string, newPriority: number | null) => Promise<boolean>;
  onToggleArchive?: (productId: string, isArchived: boolean) => Promise<boolean>;
  onExportExcel?: () => void;
}

export function ProductTable({
  products = [],
  searchQuery,
  onEdit,
  onDelete,
  onUpdateQuantity,
  onUpdatePriority,
  onToggleArchive,
  onExportExcel,
}: ProductTableProps) {
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingPriorityProductId, setEditingPriorityProductId] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;

  const filteredProducts = (products || []).filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, products.length]);

  const hasMore = visibleCount < filteredProducts.length;
  const currentProducts = filteredProducts.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setIsLoadingMore(false);
    }, 1500); // 1.5 seconds wait
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Product ID copied to clipboard");
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete.id);
      setProductToDelete(null);
      toast.success("Product deleted successfully");
    }
  };

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingProductId(productId);
    setEditingQuantity(currentQuantity.toString());
  };

  const handleQuantitySave = () => {
    if (editingProductId && editingQuantity && onUpdateQuantity) {
      const newQuantity = parseInt(editingQuantity);
      if (!isNaN(newQuantity) && newQuantity >= 0) {
        onUpdateQuantity(editingProductId, newQuantity);
        toast.success("تم تحديث الكمية بنجاح");
      } else {
        toast.error("يرجى إدخال رقم صحيح");
      }
    }
    setEditingProductId(null);
    setEditingQuantity(null);
  };

  const handleQuantityCancel = () => {
    setEditingProductId(null);
    setEditingQuantity(null);
  };

  const handlePriorityEdit = (productId: string, currentPriority: number | undefined) => {
    setEditingPriorityProductId(productId);
    setEditingPriority(currentPriority?.toString() || "");
  };

  const handlePrioritySave = async () => {
    if (editingPriorityProductId && onUpdatePriority) {
      // Treat empty string or 0 as null (no priority)
      const parsedValue = editingPriority === "" ? null : parseInt(editingPriority);
      const newPriority = (parsedValue === null || parsedValue === 0) ? null : parsedValue;

      if (newPriority === null || (!isNaN(newPriority) && newPriority > 0)) {
        const success = await onUpdatePriority(editingPriorityProductId, newPriority);
        if (success) {
          toast.success("تم تحديث أولوية الظهور بنجاح");
        }
      } else {
        toast.error("يرجى إدخال رقم صحيح (1 أو أكثر)");
      }
    }
    setEditingPriorityProductId(null);
    setEditingPriority(null);
  };

  const handlePriorityCancel = () => {
    setEditingPriorityProductId(null);
    setEditingPriority(null);
  };

  const handleArchiveClick = (product: Product) => {
    setProductToArchive(product);
  };

  const handleConfirmArchive = async () => {
    if (productToArchive && onToggleArchive) {
      const success = await onToggleArchive(productToArchive.id, !productToArchive.isArchived);
      if (success) {
        toast.success(productToArchive.isArchived ? "تم إلغاء أرشفة المنتج بنجاح" : "تم أرشفة المنتج بنجاح");
      } else {
        toast.error("حدث خطأ أثناء تغيير حالة الأرشفة");
      }
      setProductToArchive(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 bg-muted/40 p-3 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">المنتجات المعروضة:</span>
          <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
            {filteredProducts.length} منتج
          </Badge>
          {visibleCount < filteredProducts.length && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (معروض {currentProducts.length} حالياً)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Excel Export for Admin */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onExportExcel) {
                onExportExcel();
              } else {
                const res = exportProductsToExcel(filteredProducts);
                if (res.success) {
                  toast.success(`تم تصدير ${res.count} منتج بنجاح إلى ملف Excel منظم للإدارة`);
                } else {
                  toast.error(res.error || "فشل التصدير");
                }
              }
            }}
            disabled={filteredProducts.length === 0}
            className="w-full sm:w-auto gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm font-medium"
            title="تصدير ملف إكسل منسق باللغة العربية للإدارة والمحاسبة"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Excel للإدارة</span>
            <span className="text-xs bg-emerald-600 text-white dark:bg-emerald-500 px-1.5 py-0.2 rounded-full font-bold">
              {filteredProducts.length}
            </span>
          </Button>

          {/* Google Merchant Center Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={filteredProducts.length === 0}
                className="w-full sm:w-auto gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-sm font-medium"
                title="تصدير ملف مطابق لمعايير ومواصفات Google Merchant Center"
              >
                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>تصدير لـ Google Merchant</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-popover shadow-lg border p-1 z-50">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                تنسيقات Google Merchant Center
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const res = exportGoogleMerchantFeed(filteredProducts, "tsv");
                  if (res.success) {
                    toast.success(`تم تحميل ملف TSV لـ Google Merchant بنجاح (${res.count} منتج)`);
                  } else {
                    toast.error(res.error || "فشل التصدير");
                  }
                }}
                className="gap-2.5 p-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-950/50"
              >
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex flex-col text-right">
                  <span className="font-semibold text-xs text-foreground">صيغة TSV (موصى بها من Google ⭐)</span>
                  <span className="text-[10px] text-muted-foreground">أفضل صيغة لتفادي أي أخطاء بالـ XML وتنسيق الأسعار</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const res = exportGoogleMerchantFeed(filteredProducts, "xml");
                  if (res.success) {
                    toast.success(`تم تحميل ملف XML لـ Google Merchant بنجاح (${res.count} منتج)`);
                  } else {
                    toast.error(res.error || "فشل التصدير");
                  }
                }}
                className="gap-2.5 p-2 cursor-pointer focus:bg-amber-50 dark:focus:bg-amber-950/50"
              >
                <FileCode className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex flex-col text-right">
                  <span className="font-semibold text-xs text-foreground">صيغة XML Feed (RSS 2.0 القياسية)</span>
                  <span className="text-[10px] text-muted-foreground">تغذية قياسية صالحة للربط مع Google Feed</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const res = exportGoogleMerchantFeed(filteredProducts, "csv");
                  if (res.success) {
                    toast.success(`تم تحميل ملف CSV لـ Google Merchant بنجاح (${res.count} منتج)`);
                  } else {
                    toast.error(res.error || "فشل التصدير");
                  }
                }}
                className="gap-2.5 p-2 cursor-pointer focus:bg-emerald-50 dark:focus:bg-emerald-950/50"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col text-right">
                  <span className="font-semibold text-xs text-foreground">صيغة CSV (مفصولة بفواصل)</span>
                  <span className="text-[10px] text-muted-foreground">أعمدة قياسية بالإنجليزية مع ترميز UTF-8</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] text-center">ID</TableHead>
              <TableHead className="w-[300px]">المنتج</TableHead>
              <TableHead className="w-[120px] text-center">
                العلامة التجارية
              </TableHead>
              <TableHead className="w-[120px] text-center">السعر</TableHead>
              <TableHead className="w-[120px] text-center">التصنيف</TableHead>
              <TableHead className="w-[120px] text-center">الحالة</TableHead>
              <TableHead className="w-[120px] text-center">الكمية</TableHead>
              <TableHead className="w-[100px] text-center">
                أولوية الظهور
              </TableHead>
              <TableHead className="w-[150px] text-center">
                العرض الخاص
              </TableHead>
              <TableHead className="w-[150px] text-center">
                تاريخ الإضافة
              </TableHead>
              <TableHead className="w-[80px] text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {product.id.slice(0, 8)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopyId(product.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(product.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '').slice(0, 50)}{product.description ? '...' : ''}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-normal">
                    {product.brand}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {product.specialOffer && product.discountPercentage ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="destructive" className="w-fit">
                        {formatCurrency(
                          product.discountPrice ||
                          (product.price -
                            (product.price * product.discountPercentage) / 100),
                          'جنيه'
                        )}
                      </Badge>
                      <span className="text-muted-foreground line-through text-xs">
                        {formatCurrency(product.price, 'جنيه')}
                      </span>
                    </div>
                  ) : (
                    <span>{formatCurrency(product.price, 'جنيه')}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="font-normal">
                      {product.category}
                    </Badge>
                    {product.subcategory && (
                      <div className="flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 128 128"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-muted-foreground"
                          style={{ transform: "rotate(0deg)" }}
                        >
                          <path
                            d="M78.1 0v6.2c22.4 0 40.5 18.2 40.5 40.6s-18.1 40.6-40.5 40.6H17.9l27.9-28-4.5-4.5L5.5 90.8l36 36.2 4.5-4.5-28.8-28.9h60.9c25.8 0 46.7-21 46.7-46.8S103.9 0 78.1 0z"
                            stroke="currentColor"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs"
                        >
                          {product.subcategory}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant={product.isArchived ? "secondary" : "outline"}
                    size="sm"
                    className={`h-8 font-semibold w-20 ${product.isArchived ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => handleArchiveClick(product)}
                  >
                    {product.isArchived ? "مؤرشف" : "أرشفة"}
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {editingProductId === product.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editingQuantity || ""}
                          onChange={(e) => setEditingQuantity(e.target.value)}
                          className="w-16 h-8 text-center"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleQuantitySave();
                            } else if (e.key === "Escape") {
                              handleQuantityCancel();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuantitySave}
                          className="h-8 w-8 p-0"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleQuantityCancel}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                        onClick={() => handleQuantityEdit(product.id, product.wholesaleInfo?.quantity || 0)}
                        title="انقر لتعديل الكمية"
                      >
                        <Badge
                          variant={product.wholesaleInfo?.quantity && product.wholesaleInfo.quantity > 0 ? "default" : "destructive"}
                          className="font-normal"
                        >
                          {product.wholesaleInfo?.quantity || 0} متاح
                        </Badge>
                      </div>
                    )}
                    {product.wholesaleInfo?.purchasedQuantity && (
                      <span className="text-xs text-muted-foreground">
                        تم شراء: {product.wholesaleInfo.purchasedQuantity}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {editingPriorityProductId === product.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="بدون"
                        value={editingPriority || ""}
                        onChange={(e) => setEditingPriority(e.target.value)}
                        className="w-16 h-8 text-center"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePrioritySave();
                          } else if (e.key === "Escape") {
                            handlePriorityCancel();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrioritySave}
                        className="h-8 w-8 p-0"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePriorityCancel}
                        className="h-8 w-8 p-0"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => handlePriorityEdit(product.id, product.displayPriority)}
                      title="انقر لتعديل الأولوية"
                    >
                      <Badge
                        variant={product.displayPriority && product.displayPriority > 0 ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {product.displayPriority && product.displayPriority > 0 ? product.displayPriority : "بدون"}
                      </Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {product.specialOffer ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {product.discountPercentage}% خصم
                      </Badge>
                      {product.offerEndsAt && (
                        <div className="flex items-center justify-center text-xs gap-1 text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(
                              new Date(product.offerEndsAt),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">
                      {format(
                        new Date(product.createdAt || new Date()),
                        "dd/MM/yyyy hh:mm a",
                        { locale: ar }
                      )
                        .replace("AM", "ص")
                        .replace("PM", "م")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(product.createdAt || new Date()),
                        { addSuffix: true, locale: ar }
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit(product)}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(product)}
                        className="flex items-center gap-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopyId(product.id)}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        نسخ المعرف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Infinite Scroll Sentinel ── */}
      <div ref={sentinelRef} className="mt-4 flex flex-col items-center gap-3 pb-4">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-blue-500 bg-white rounded-full px-5 py-2 shadow-sm border border-blue-100">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-semibold">جاري تحميل المزيد...</span>
          </div>
        )}
        {!hasMore && filteredProducts.length > 0 && (
          <div className="text-xs text-gray-400 font-medium py-2">
            ✓ تم عرض جميع المنتجات المعثور عليها ({filteredProducts.length})
          </div>
        )}
      </div>

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={() => setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنتج نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!productToArchive}
        onOpenChange={() => setProductToArchive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
            <AlertDialogDescription>
              {productToArchive?.isArchived
                ? "هل أنت متأكد من رغبتك في إلغاء أرشفة هذا المنتج وعرضه للعملاء مجدداً؟"
                : "هل أنت متأكد من رغبتك في أرشفة هذا المنتج؟ سيتم إخفاؤه من واجهة المتجر ولن يتمكن العملاء من رؤيته."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive} className={productToArchive?.isArchived ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}>
              {productToArchive?.isArchived ? "إلغاء الأرشفة" : "تأكيد الأرشفة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
