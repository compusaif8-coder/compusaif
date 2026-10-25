const CATEGORY_TO_SLUG_MAP: Record<string, string> = {
  "لابتوب": "laptop",
  "لابتوبات": "laptop",
  "laptop": "laptop",
  "laptops": "laptop",
  "کمبيوترات": "desktop",
  "كمبيوترات": "desktop",
  "كيسات": "desktop",
  "كيسات استيراد": "desktop",
  "كمبيوتر مكتبي": "desktop",
  "desktop": "desktop",
  "شاشات": "monitor",
  "شاشة": "monitor",
  "monitor": "monitor",
  "all in one": "All+In+One",
  "all+in+one": "All+In+One",
  "all-in-one": "All+In+One",
  "آل ان ون": "All+In+One",
  "إكسسوارات": "accessories",
  "اكسسوارات": "accessories",
  "accessories": "accessories",
};

const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  "laptop": "لابتوب",
  "desktop": "كمبيوتر مكتبي",
  "monitor": "شاشات",
  "all+in+one": "All In One",
  "all-in-one": "All In One",
  "accessories": "إكسسوارات",
  "other": "أخرى",
};

export function categoryToSlug(categoryName: string): string {
  if (!categoryName) return "";
  const key = categoryName.trim().toLowerCase();
  return CATEGORY_TO_SLUG_MAP[key] || categoryName.trim();
}

export function slugToCategory(slug: string, availableCategories: string[] = []): string {
  if (!slug) return "";
  const decoded = decodeURIComponent(slug).trim();
  const lower = decoded.toLowerCase();

  if (CATEGORY_TO_SLUG_MAP[lower]) {
    const canonicalSlug = CATEGORY_TO_SLUG_MAP[lower];
    if (availableCategories.length > 0) {
      const match = availableCategories.find(c => c.toLowerCase() === canonicalSlug || c.toLowerCase() === lower);
      if (match) return match;
    }
    return canonicalSlug;
  }

  if (availableCategories.length > 0) {
    const match = availableCategories.find(c => c.toLowerCase() === lower);
    if (match) return match;
  }

  return decoded;
}

export function getCategoryLabel(categoryVal: string): string {
  if (!categoryVal) return "";
  const lower = categoryVal.trim().toLowerCase();
  return CATEGORY_DISPLAY_MAP[lower] || categoryVal;
}
