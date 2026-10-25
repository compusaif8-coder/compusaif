import { Product } from "@/types/product";
import { getProductUrl } from "./url";
import { format } from "date-fns";

export interface GoogleMerchantExportOptions {
  currency?: string; // Default: "EGP"
  baseUrl?: string;
  customFileName?: string;
  defaultCondition?: "new" | "refurbished" | "used";
  defaultBrand?: string;
}

/**
 * Strips HTML tags and clean up string for feed attributes
 */
function cleanText(text: string | undefined | null, maxLength = 5000): string {
  if (!text) return "";
  const cleaned = text
    .replace(/<[^>]*>/g, " ") // remove html
    .replace(/[\r\n\t]+/g, " ") // remove line breaks & tabs
    .replace(/\s{2,}/g, " ") // collapse spaces
    .trim();
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength - 3) + "..." : cleaned;
}

/**
 * Determines product condition for Google Merchant Center
 */
function detectCondition(product: Product, fallback: "new" | "refurbished" | "used" = "refurbished"): "new" | "refurbished" | "used" {
  const allText = `${product.name} ${product.description || ""} ${
    product.specifications?.map((s) => `${s.key}:${s.value}`).join(" ") || ""
  }`.toLowerCase();

  if (allText.includes("جديد") || allText.includes("new") || allText.includes("برشام") || allText.includes("زيرو")) {
    return "new";
  }
  if (allText.includes("مستعمل") || allText.includes("used")) {
    return "used";
  }
  if (allText.includes("استيراد") || allText.includes("refurbished") || allText.includes("مجدد") || allText.includes("فرز")) {
    return "refurbished";
  }
  return fallback;
}

/**
 * Formats a valid full URL
 */
function getAbsoluteUrl(pathOrUrl: string, baseUrl: string): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Formats a clean, valid and unique ID for Google Merchant Center (strictly <= 50 characters)
 */
export function formatGoogleMerchantId(
  rawId: string | undefined | null,
  index: number,
  fallbackName?: string
): string {
  let cleanId = (rawId || "").replace(/[\t\r\n\s]/g, "").trim();

  // If ID has '--' delimiter, check the suffix (common in slug--id patterns)
  if (cleanId.includes("--")) {
    const lastPart = cleanId.split("--").pop();
    if (lastPart && lastPart.length > 0 && lastPart.length <= 50) {
      cleanId = lastPart;
    }
  }

  // Calculate a deterministic stable hash of rawId (or fallbackName)
  const sourceStr = rawId || fallbackName || `product_${index + 1}`;
  let hash = 5381;
  for (let i = 0; i < sourceStr.length; i++) {
    hash = (hash * 33) ^ sourceStr.charCodeAt(i);
  }
  const hashHex = (hash >>> 0).toString(36); // e.g. "2x9a1z"

  // If already standard ASCII alphanumeric/dash/underscore and <= 50 chars, use it directly
  if (cleanId && /^[a-zA-Z0-9_-]{1,50}$/.test(cleanId)) {
    return cleanId;
  }

  // Filter only valid ASCII alphanumeric chars
  const asciiOnly = cleanId.replace(/[^a-zA-Z0-9_-]/g, "");

  if (asciiOnly.length >= 4 && asciiOnly.length <= 40) {
    return `${asciiOnly.substring(0, 42)}_${hashHex}`.substring(0, 50);
  }

  // If ID was Arabic or empty or invalid characters, create a clean stable short ID
  const prefix = asciiOnly.length > 0 ? `${asciiOnly.substring(0, 30)}_` : `P${index + 1}_`;
  return `${prefix}${hashHex}`.substring(0, 50);
}

/**
 * Transforms a Product array into Google Merchant Center Item Objects
 */
export function buildGoogleMerchantFeedItems(
  products: Product[],
  options?: GoogleMerchantExportOptions
) {
  const currency = options?.currency || "EGP";
  const baseUrl =
    options?.baseUrl ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://compusafe.net");

  return products.map((p, index) => {
    // 1. Basic info (Strictly <= 50 chars)
    const id = formatGoogleMerchantId(p.id, index, p.name);
    const title = cleanText(p.name || "منتج بدون اسم", 150);
    const description =
      cleanText(p.description) ||
      `${title} - ${p.brand || "CompuSafe"} - ${p.category || "إلكترونيات"}`;

    // 2. Links
    const productPath = getProductUrl(p.id, p.name || "");
    const link = getAbsoluteUrl(productPath, baseUrl);

    // 3. Images
    const validImages = (p.images || []).filter((img) => img && typeof img === "string" && img.trim().length > 0);
    const mainImage = validImages.length > 0 ? getAbsoluteUrl(validImages[0], baseUrl) : "";
    const additionalImages = validImages.slice(1, 10).map((img) => getAbsoluteUrl(img, baseUrl));

    // 4. Availability
    const isOut =
      p.isArchived ||
      (p.wholesaleInfo &&
        typeof p.wholesaleInfo.quantity === "number" &&
        p.wholesaleInfo.quantity <= 0);
    const availability = isOut ? "out_of_stock" : "in_stock";

    // 5. Price & Sale Price
    const basePrice = Number(p.price) || 0;
    const priceFormatted = `${basePrice.toFixed(2)} ${currency}`;

    let salePriceFormatted = "";
    if (p.specialOffer) {
      let discPrice = p.discountPrice;
      if (!discPrice && p.discountPercentage) {
        discPrice = basePrice - (basePrice * p.discountPercentage) / 100;
      }
      if (discPrice && discPrice > 0 && discPrice < basePrice) {
        salePriceFormatted = `${Number(discPrice).toFixed(2)} ${currency}`;
      }
    }

    // 6. Brand, Category & Condition
    const brand = cleanText(p.brand || options?.defaultBrand || "CompuSafe", 70);
    const condition = detectCondition(p, options?.defaultCondition || "refurbished");
    const productType = [p.category, p.subcategory].filter(Boolean).join(" > ");

    return {
      id,
      title,
      description,
      link,
      image_link: mainImage,
      additional_image_link: additionalImages.join(","),
      availability,
      price: priceFormatted,
      sale_price: salePriceFormatted,
      brand,
      condition,
      identifier_exists: "no",
      product_type: cleanText(productType, 750),
      custom_label_0: cleanText(p.category || "", 100),
      custom_label_1: cleanText(p.subcategory || "", 100),
    };
  });
}

/**
 * Generates TSV (Tab-Separated Values) format for Google Merchant Center
 * Highly recommended by Google because it avoids comma conflict issues in Arabic and parses reliably.
 */
export function generateGoogleMerchantTSV(
  products: Product[],
  options?: GoogleMerchantExportOptions
): string {
  const items = buildGoogleMerchantFeedItems(products, options);
  const headers = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "additional_image_link",
    "availability",
    "price",
    "sale_price",
    "brand",
    "condition",
    "identifier_exists",
    "product_type",
    "custom_label_0",
    "custom_label_1",
  ];

  const rows = items.map((item) => {
    return [
      item.id,
      item.title,
      item.description,
      item.link,
      item.image_link,
      item.additional_image_link,
      item.availability,
      item.price,
      item.sale_price,
      item.brand,
      item.condition,
      item.identifier_exists,
      item.product_type,
      item.custom_label_0,
      item.custom_label_1,
    ].join("\t");
  });

  return [headers.join("\t"), ...rows].join("\n");
}

/**
 * Generates standard XML RSS 2.0 Feed for Google Merchant Center
 */
export function generateGoogleMerchantXML(
  products: Product[],
  options?: GoogleMerchantExportOptions
): string {
  const items = buildGoogleMerchantFeedItems(products, options);
  const baseUrl =
    options?.baseUrl ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://compusafe.net");

  const xmlItems = items
    .map((item) => {
      let itemXml = `    <item>\n`;
      itemXml += `      <g:id><![CDATA[${item.id}]]></g:id>\n`;
      itemXml += `      <g:title><![CDATA[${item.title}]]></g:title>\n`;
      itemXml += `      <g:description><![CDATA[${item.description}]]></g:description>\n`;
      itemXml += `      <g:link><![CDATA[${item.link}]]></g:link>\n`;
      if (item.image_link) {
        itemXml += `      <g:image_link><![CDATA[${item.image_link}]]></g:image_link>\n`;
      }
      if (item.additional_image_link) {
        const addImgs = item.additional_image_link.split(",");
        addImgs.forEach((img) => {
          if (img) {
            itemXml += `      <g:additional_image_link><![CDATA[${img}]]></g:additional_image_link>\n`;
          }
        });
      }
      itemXml += `      <g:availability>${item.availability}</g:availability>\n`;
      itemXml += `      <g:price>${item.price}</g:price>\n`;
      if (item.sale_price) {
        itemXml += `      <g:sale_price>${item.sale_price}</g:sale_price>\n`;
      }
      itemXml += `      <g:brand><![CDATA[${item.brand}]]></g:brand>\n`;
      itemXml += `      <g:condition>${item.condition}</g:condition>\n`;
      itemXml += `      <g:identifier_exists>no</g:identifier_exists>\n`;
      if (item.product_type) {
        itemXml += `      <g:product_type><![CDATA[${item.product_type}]]></g:product_type>\n`;
      }
      if (item.custom_label_0) {
        itemXml += `      <g:custom_label_0><![CDATA[${item.custom_label_0}]]></g:custom_label_0>\n`;
      }
      if (item.custom_label_1) {
        itemXml += `      <g:custom_label_1><![CDATA[${item.custom_label_1}]]></g:custom_label_1>\n`;
      }
      itemXml += `    </item>`;
      return itemXml;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>CompuSafe Products Feed</title>
    <link>${baseUrl}</link>
    <description>Google Merchant Center Product Feed for CompuSafe Store</description>
${xmlItems}
  </channel>
</rss>`;
}

/**
 * Generates standard CSV for Google Merchant Center
 */
export function generateGoogleMerchantCSV(
  products: Product[],
  options?: GoogleMerchantExportOptions
): string {
  const items = buildGoogleMerchantFeedItems(products, options);
  const headers = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "additional_image_link",
    "availability",
    "price",
    "sale_price",
    "brand",
    "condition",
    "identifier_exists",
    "product_type",
    "custom_label_0",
    "custom_label_1",
  ];

  const escapeCsv = (str: string) => {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = items.map((item) => {
    return [
      escapeCsv(item.id),
      escapeCsv(item.title),
      escapeCsv(item.description),
      escapeCsv(item.link),
      escapeCsv(item.image_link),
      escapeCsv(item.additional_image_link),
      escapeCsv(item.availability),
      escapeCsv(item.price),
      escapeCsv(item.sale_price),
      escapeCsv(item.brand),
      escapeCsv(item.condition),
      escapeCsv(item.identifier_exists),
      escapeCsv(item.product_type),
      escapeCsv(item.custom_label_0),
      escapeCsv(item.custom_label_1),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Triggers browser download for Google Merchant Center Feed
 */
export function exportGoogleMerchantFeed(
  products: Product[],
  formatType: "tsv" | "xml" | "csv" = "tsv",
  options?: GoogleMerchantExportOptions
): { success: boolean; count: number; error?: string; filename?: string } {
  if (!products || products.length === 0) {
    return { success: false, count: 0, error: "لا توجد منتجات لتصديرها" };
  }

  try {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    let content = "";
    let mimeType = "";
    let ext = "";

    if (formatType === "tsv") {
      content = "\ufeff" + generateGoogleMerchantTSV(products, options); // UTF-8 BOM
      mimeType = "text/tab-separated-values;charset=utf-8";
      ext = "tsv";
    } else if (formatType === "xml") {
      content = generateGoogleMerchantXML(products, options);
      mimeType = "application/xml;charset=utf-8";
      ext = "xml";
    } else {
      content = "\ufeff" + generateGoogleMerchantCSV(products, options); // UTF-8 BOM
      mimeType = "text/csv;charset=utf-8";
      ext = "csv";
    }

    const filename =
      options?.customFileName ||
      `google_merchant_feed_${dateStr}.${ext}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, count: products.length, filename };
  } catch (error: any) {
    console.error("Failed to export Google Merchant feed:", error);
    return {
      success: false,
      count: 0,
      error: error?.message || "حدث خطأ أثناء تصدير ملف Google Merchant",
    };
  }
}
