import { z } from "zod";

// Size schema for products
export const ProductSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  extraPrice: z.number().optional().default(0), // Extra cost added to base price
  price: z.number(), // Final price (Base + Extra)
});

// Custom Option Group Schema (e.g., RAM Size, HDD Size)
export const CustomOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  extraPrice: z.number().optional().default(0),
});

export const CustomOptionGroupSchema = z.object({
  id: z.string(),
  name: z.string(), // e.g. "حجم الرامات"
  options: z.array(CustomOptionSchema),
});

// Addon schema for products
export const ProductAddonSchema = z.object({
  id: z.string(),
  label: z.string(),
  price_delta: z.number(), // Additional price to add to base price
});

// Specification schema for dynamic product properties
export const ProductSpecificationSchema = z.object({
  id: z.string(),
  key: z.string(),   // e.g. "Screen Size", "Refresh Rate"
  value: z.string(), // e.g. "15.6 inches", "144Hz"
  inFilter: z.boolean().default(false), // whether to show in filters
  filterSlug: z.string().optional(), // clean URL identifier for custom filters
  isDropdown: z.boolean().optional(), // whether to show as dropdown in filters
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(), // Base price when no sizes are defined
  category: z.string(),
  subcategory: z.string().optional(),
  merchant: z.string().optional(),
  color: z.string(),
  size: z.string(),
  images: z.array(z.string()),
  description: z.string(),
  specialOffer: z.boolean().optional().default(false),
  discountPercentage: z.number().optional(),
  discountPrice: z.number().optional(),
  offerEndsAt: z.string().optional(),
  isArchived: z.boolean(),
  createdAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  displayPriority: z.number().optional(), // Priority for display ordering (lower number = higher priority)
  expirationDate: z.string().optional(),
  videoUrls: z.array(z.string()).optional(), // New field for video links
  // New fields for sizes and addons
  sizes: z.array(ProductSizeSchema).optional().default([]),
  customOptionGroups: z.array(CustomOptionGroupSchema).optional().default([]),
  addons: z.array(ProductAddonSchema).optional().default([]),
  specifications: z.array(ProductSpecificationSchema).optional().default([]),
  features: z.array(z.string()).optional().default([]), // For checkboxes like touch, x360, detachable
  costs: z.object({
    base_cost: z.number().optional(), // Base cost for profit calculation
  }).optional(),
  wholesaleInfo: z
    .object({
      purchasePrice: z.number().optional(),
      purchasedQuantity: z.number().optional(),
      quantity: z.number().optional(),
      supplierName: z.string().optional(),
      supplierLocation: z.string().optional(),
    })
    .optional(),
  // Optional processor specification (used for filtering)
  processor: z
    .object({
      name: z.string().optional(),
      processorBrand: z.enum(["Intel", "AMD", "Other"]).optional(),
      processorGeneration: z.string().optional(),
      processorSeries: z.string().optional(),
      integratedGpu: z.string().optional(),
    })
    .optional(),
  // Optional dedicated graphics (used for filtering)
  dedicatedGraphics: z
    .object({
      name: z.string().optional(),
      dedicatedGpuBrand: z.enum(["NVIDIA", "AMD", "Intel", "Custom"]).optional(),
      dedicatedGpuModel: z.string().optional(),
      hasDedicatedGraphics: z.boolean().optional(),
      vram: z.union([z.number(), z.string()]).optional(),
    })
    .optional(),
  // Optional display info (used for filtering)
  display: z
    .object({
      sizeInches: z.number().optional(),
      resolution: z.string().optional(),
      panelType: z.string().optional(),
    })
    .optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductSize = z.infer<typeof ProductSizeSchema>;
export type CustomOption = z.infer<typeof CustomOptionSchema>;
export type CustomOptionGroup = z.infer<typeof CustomOptionGroupSchema>;
export type ProductAddon = z.infer<typeof ProductAddonSchema>;
export type ProductSpecification = z.infer<typeof ProductSpecificationSchema>;

export const FilterSchema = z.object({
  search: z.string().optional(),
  category: z.array(z.string()).optional(),
  subcategory: z.array(z.string()).optional(),
  brand: z.array(z.string()).optional(),
  color: z.array(z.string()).optional(),
  size: z.array(z.string()).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  supplier: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  dynamicSpecs: z.record(z.array(z.string())).optional(),
  sortBy: z
    .enum(["price-asc", "price-desc", "name-asc", "name-desc"])
    .optional(),
  // Processor filters
  processorBrand: z.array(z.string()).optional(),
  processorGeneration: z.array(z.string()).optional(),
  processorSeries: z.array(z.string()).optional(),
  processorName: z.array(z.string()).optional(),
  integratedGpu: z.array(z.string()).optional(),
  // Dedicated graphics filters
  dedicatedGraphicsName: z.array(z.string()).optional(),
  hasDedicatedGraphics: z.boolean().optional(),
  dedicatedGpuBrand: z.array(z.string()).optional(),
  dedicatedGpuModel: z.array(z.string()).optional(),
  // Display filter
  screenSize: z.array(z.string()).optional(),
  // Special Offers filter
  specialOffer: z.boolean().optional(),
});

export type Filter = z.infer<typeof FilterSchema>;

// Cart item with selected options
export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: ProductSize; // Legacy selected size option
  selectedOptionGroups?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionLabel: string;
    extraPrice: number;
  }>; // Selected options from dynamic groups
  selectedAddons: ProductAddon[]; // Selected addons
  selectedColor?: string; // Selected color
  unitFinalPrice: number; // Final calculated price per unit
  totalPrice: number; // Final total price (unitFinalPrice * quantity)
}
