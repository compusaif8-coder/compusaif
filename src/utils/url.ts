export const generateSlug = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, '') // Keep alphanumeric, spaces, Arabic, and hyphens
    .trim()
    .replace(/\s+/g, '-');
};

export const getProductUrl = (id: string, name: string): string => {
  const slug = generateSlug(name);
  return `/product/${slug}`;
};

export const extractProductId = (slugOrId: string | undefined): string | undefined => {
  if (!slugOrId) return undefined;
  if (slugOrId.includes('--')) {
    return slugOrId.split('--').pop();
  }
  return slugOrId;
};
