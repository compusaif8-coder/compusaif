import * as XLSX from "xlsx";
import { Product } from "@/types/product";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// Default global filter keys used as standard filterable specs fallback
const DEFAULT_FILTER_KEYS = [
  "فئة المعالج",
  "الجيل",
  "حرف المعالج",
  "كرت الشاشة",
  "حجم VRAM",
  "حجم الشاشة",
  "نوع الشاشة",
  "تردد الشاشة",
  "الكرت المدمج",
  "الكيس",
  "اللوحة الأم",
  "مزود الطاقة",
  "الضمان",
  "الحالة",
];

const GLOBAL_FILTER_STORAGE_KEY = "compusafe_default_filters";

/**
 * Retrieves the list of filterable specification keys across stored preferences and the provided products
 */
export function getFilterableSpecKeys(products: Product[]): string[] {
  const filterKeySet = new Set<string>();

  // 1. Get user/system default filter keys from localStorage if available
  try {
    const stored = localStorage.getItem(GLOBAL_FILTER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((k) => {
          if (typeof k === "string" && k.trim()) filterKeySet.add(k.trim());
        });
      }
    }
  } catch (e) {
    // ignore
  }

  // Add default keys
  DEFAULT_FILTER_KEYS.forEach((k) => filterKeySet.add(k));

  // 2. Discover any keys explicitly marked with inFilter === true in the products
  products.forEach((p) => {
    if (p.specifications && Array.isArray(p.specifications)) {
      p.specifications.forEach((spec) => {
        if (spec.inFilter && spec.key && spec.key.trim()) {
          filterKeySet.add(spec.key.trim());
        }
      });
    }
  });

  // Only keep keys that actually exist in at least one of the exported products (or all if specified)
  const presentKeys = new Set<string>();
  products.forEach((p) => {
    if (p.specifications && Array.isArray(p.specifications)) {
      p.specifications.forEach((spec) => {
        if (spec.key && filterKeySet.has(spec.key.trim()) && spec.value && spec.value.trim()) {
          presentKeys.add(spec.key.trim());
        }
      });
    }
  });

  // Return present filter keys preserving order from filterKeySet
  const orderedKeys: string[] = [];
  filterKeySet.forEach((k) => {
    if (presentKeys.has(k)) {
      orderedKeys.push(k);
    }
  });

  return orderedKeys;
}

/**
 * Extracts all unique custom option group names across the provided products
 */
export function getUniqueCustomOptionGroupNames(products: Product[]): string[] {
  const groupNames = new Set<string>();
  products.forEach((p) => {
    if (p.customOptionGroups && Array.isArray(p.customOptionGroups)) {
      p.customOptionGroups.forEach((g) => {
        if (g.name && g.name.trim()) {
          groupNames.add(g.name.trim());
        }
      });
    }
  });
  return Array.from(groupNames);
}

/**
 * Formats custom option group into a readable Arabic string showing options and price additions
 */
export function formatCustomOptionGroup(group?: {
  id?: string;
  name?: string;
  options?: Array<{ id?: string; label?: string; extraPrice?: number }>;
}): string {
  if (!group || !group.options || group.options.length === 0) return "—";
  const formattedOpts = group.options
    .filter((opt) => opt && opt.label)
    .map((opt) => {
      const extra = opt.extraPrice || 0;
      if (extra === 0) {
        return `${opt.label} (أساسي / بدون زيادة)`;
      } else if (extra > 0) {
        return `${opt.label} (+${extra.toLocaleString("ar-EG")} ج.م)`;
      } else {
        return `${opt.label} (${extra.toLocaleString("ar-EG")} ج.م)`;
      }
    });
  return formattedOpts.length > 0 ? formattedOpts.join(" | ") : "—";
}

/**
 * Main export function to generate and download a clean, styled Excel sheet
 */
export function exportProductsToExcel(
  products: Product[],
  options?: {
    filterSummary?: string;
    customFileName?: string;
  }
): { success: boolean; count: number; error?: string } {
  if (!products || products.length === 0) {
    return { success: false, count: 0, error: "لا توجد منتجات لتصديرها" };
  }

  try {
    // 1. Identify dynamic filterable specs & dynamic custom option groups
    const filterSpecKeys = getFilterableSpecKeys(products);
    const customGroupNames = getUniqueCustomOptionGroupNames(products);

    // 2. Build Headers
    const headers: string[] = [
      "م",
      "اسم المنتج كامل",
      "الماركة",
      "الفئة",
      "الفئة الفرعية",
      "السعر الأساسي (ج.م)",
      "العرض الخاص",
      "سعر العرض (ج.م)",
      "أقسام وخيارات الترقية بالكامل",
    ];

    // Add individual columns for each custom option group
    customGroupNames.forEach((groupName) => {
      headers.push(`ترقية: ${groupName}`);
    });

    // Add filterable specifications columns
    filterSpecKeys.forEach((specKey) => {
      headers.push(specKey);
    });

    // Add additional useful status columns
    headers.push(
      "الكمية بالمخزون",
      "حالة المخزون",
      "حالة المنتج",
      "تاريخ الإضافة",
      "معرف المنتج (ID)"
    );

    // 3. Build Rows Data
    const rows: (string | number)[][] = [];

    products.forEach((p, index) => {
      const quantity = p.wholesaleInfo?.quantity ?? 0;
      let stockStatus = "متوفر";
      if (quantity === 0) {
        stockStatus = "نفدت الكمية";
      } else if (quantity < 5) {
        stockStatus = `كمية منخفضة (${quantity})`;
      }

      // Format all custom option groups together
      let allUpgradeOptions = "—";
      if (p.customOptionGroups && p.customOptionGroups.length > 0) {
        allUpgradeOptions = p.customOptionGroups
          .map((g) => `[${g.name || "قسم"}: ${formatCustomOptionGroup(g)}]`)
          .join(" \n ");
      }

      // Offer details
      const isOffer = !!p.specialOffer;
      let offerPrice: number | string = "—";
      if (isOffer) {
        offerPrice =
          p.discountPrice ||
          (p.discountPercentage
            ? p.price - (p.price * p.discountPercentage) / 100
            : p.price);
      }

      // Base row data
      const row: (string | number)[] = [
        index + 1,
        p.name || "—",
        p.brand || "—",
        p.category || "—",
        p.subcategory || "—",
        p.price || 0,
        isOffer ? (p.discountPercentage ? `خصم ${p.discountPercentage}%` : "عرض خاص") : "—",
        offerPrice,
        allUpgradeOptions,
      ];

      // Values for each individual custom option group
      customGroupNames.forEach((groupName) => {
        const foundGroup = p.customOptionGroups?.find(
          (g) => g.name && g.name.trim().toLowerCase() === groupName.trim().toLowerCase()
        );
        if (foundGroup) {
          row.push(formatCustomOptionGroup(foundGroup));
        } else {
          row.push("—");
        }
      });

      // Values for each filterable spec
      filterSpecKeys.forEach((specKey) => {
        const foundSpec = p.specifications?.find(
          (s) => s.key && s.key.trim().toLowerCase() === specKey.trim().toLowerCase()
        );
        row.push(foundSpec && foundSpec.value && foundSpec.value.trim() ? foundSpec.value.trim() : "—");
      });

      // Status columns
      row.push(
        quantity,
        stockStatus,
        p.isArchived ? "مؤرشف" : "نشط",
        p.createdAt
          ? format(new Date(p.createdAt), "yyyy-MM-dd HH:mm", { locale: ar })
          : "—",
        p.id || "—"
      );

      rows.push(row);
    });

    // 4. Create Workbook and Worksheet
    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // 5. Configure Worksheet Properties (RTL + Column Widths + AutoFilter)
    // Enable Right-to-Left (RTL) for Arabic
    ws["!views"] = [{ rightToLeft: true }];

    // Auto-calculate column widths
    const colWidths = headers.map((header, colIdx) => {
      let maxLen = header.length;
      rows.forEach((row) => {
        const cellVal = row[colIdx];
        if (cellVal !== undefined && cellVal !== null) {
          const str = String(cellVal);
          // Split by newline if any
          const lines = str.split("\n");
          lines.forEach((l) => {
            if (l.length > maxLen) maxLen = l.length;
          });
        }
      });
      // Add padding and set reasonable min/max
      return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
    });
    ws["!cols"] = colWidths;

    // Enable Excel AutoFilter
    const totalRows = rows.length + 1;
    const totalCols = headers.length;
    const endColLetter = XLSX.utils.encode_col(totalCols - 1);
    ws["!autofilter"] = { ref: `A1:${endColLetter}${totalRows}` };

    // 6. Assemble and Write File
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات المصفاة");

    const dateStr = format(new Date(), "yyyy-MM-dd_HH-mm");
    const filename =
      options?.customFileName || `تقرير_المنتجات_المصفاة_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);

    return { success: true, count: products.length };
  } catch (error: any) {
    console.error("Failed to export products to Excel:", error);
    return {
      success: false,
      count: 0,
      error: error?.message || "حدث خطأ أثناء إنشاء ملف Excel",
    };
  }
}
