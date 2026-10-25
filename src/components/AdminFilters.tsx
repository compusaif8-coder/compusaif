import { useStore } from "@/store/useStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Package,
  Tag,
  Timer,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import { useTranslation } from "react-i18next";

interface AdminFiltersProps {
  filters: {
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    isArchived?: boolean;
    archivedStatus?: "all" | "archived" | "active";
    stockStatus?: "all" | "out-of-stock" | "low-stock";
  };
  onFilterChange: (filters: any) => void;
  uniqueSuppliers?: string[];
}

export function AdminFilters({
  filters,
  onFilterChange,
}: AdminFiltersProps) {
  const products = useStore((state) => state.products) || [];
  const { t } = useTranslation();

  // Get unique categories
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  return (
    <Card className="p-6 mb-6 bg-card shadow-sm border-none">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onFilterChange({
              minPrice: undefined,
              maxPrice: undefined,
              category: undefined,
              isArchived: false,
              archivedStatus: "active",
              stockStatus: "all",
            })
          }
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة تعيين
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Price Range */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            نطاق السعر
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="الحد الأقصى"
              value={filters.maxPrice || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="text-left"
            />
            <Input
              type="number"
              placeholder="الحد الأدنى"
              value={filters.minPrice || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="text-left"
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filters.maxPrice ? formatPrice(filters.maxPrice) : "0"}{" "}
              {t("common.currency")}
            </span>
            <span>
              {filters.minPrice ? formatPrice(filters.minPrice) : "0"}{" "}
              {t("common.currency")}
            </span>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-primary" />
            التصنيف
          </Label>
          <Select
            value={filters.category || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                category: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Status */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-primary" />
            حالة المخزون
          </Label>
          <Select
            value={filters.stockStatus || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                stockStatus: value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر حالة المخزون" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="low-stock">أقل من 5 منتجات</SelectItem>
              <SelectItem value="out-of-stock">نفدت الكمية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-primary" />
            حالة المنتج
          </Label>
          <Select
            value={filters.archivedStatus || "active"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                archivedStatus: value,
                isArchived: value === "archived",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المنتجات</SelectItem>
              <SelectItem value="active">المنتجات النشطة</SelectItem>
              <SelectItem value="archived">المنتجات المؤرشفة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Toggle */}
        <div className="space-y-2 bg-secondary/10 p-4 rounded-lg">
          <Label className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            عرض المنتجات المؤرشفة
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!filters.isArchived}
              onCheckedChange={(checked) =>
                onFilterChange({
                  ...filters,
                  isArchived: checked,
                  archivedStatus: checked ? "archived" : "active",
                })
              }
            />
            <Label className="text-sm text-muted-foreground">
              {filters.isArchived ? "إظهار المؤرشفة" : "إخفاء المؤرشفة"}
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
}
