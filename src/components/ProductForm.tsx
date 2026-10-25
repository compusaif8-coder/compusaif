import { useState, useEffect, useMemo } from "react";
import { Product, ProductSchema } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  X,
  Calendar as CalendarIcon,
  Timer,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { Calendar as CalendarIconAr } from "lucide-react";
import { ar } from "date-fns/locale";
import { formatPrice } from "@/utils/format";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "@/styles/quill-custom.css";
import { useTranslation } from "react-i18next";
import { commonColors, getColorByName } from "@/constants/colors";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { UnsavedChangesAlert } from "@/components/UnsavedChangesAlert";
import { SpecificationsEditor, SpecRow } from "@/components/SpecificationsEditor";
import { ProductImageUploader } from "@/components/ProductImageUploader";

// Storage key for custom option groups template
const LOCALSTORAGE_CUSTOM_OPTIONS_KEY = 'compusafe_last_custom_options';

function getLastCustomOptions() {
  try {
    const saved = localStorage.getItem(LOCALSTORAGE_CUSTOM_OPTIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return [];
}

interface ProductFormProps {
  onSubmit: (product: Product) => void;
}


// Fixed category options
const fixedCategories = [
  { value: "desktop", label: "كمبيوتر مكتبي (Desktop)" },
  { value: "laptop", label: "لابتوب (Laptop)" },
  { value: "storage", label: "وحدات تخزين (Storage)" },
  { value: "monitor", label: "شاشات (Monitor)" },
  { value: "network", label: "أجهزة شبكات (Network)" },
  { value: "accessories", label: "إكسسوارات وملحقات (Accessories)" },
  { value: "other", label: "أخرى (Other)" },
];

// Cache memory options
const cacheMemoryOptions = ["8MB", "12MB", "16MB", "20MB", "24MB", "32MB"];

// Integrated graphics options
const integratedGraphicsOptions = [
  "Intel UHD Graphics 770",
  "Intel UHD Graphics 630",
  "Intel UHD Graphics 620",

  "Intel Iris Xe Graphics",
  "AMD Radeon Graphics",
  "AMD Radeon Vega 6", "AMD Radeon Vega 8", "AMD Radeon Vega 10", "AMD Radeon Vega 11",
  "لا يوجد"
];

// Graphics card options
const graphicsCardOptions = [
  "RTX 4090", "RTX 4080", "RTX 4070", "RTX 4060",
  "RTX 3080", "RTX 3070", "RTX 3060", "RTX 3050",
  "GTX 1660 Ti", "GTX 1650",
  "RX 7900 XTX", "RX 7900 XT", "RX 7800 XT",
  "RX 6800 XT", "RX 6700 XT", "RX 6600 XT",
  "MX930", "MX950", "MX960", "MX970", "MX980", "MX990",

  "RX 5700 XT", "RX 5600 XT", "RTX A2000", "RTX A3000", "RTX A4000", "RTX A5000", "RTX A6000", "RTX A7000", "RTX A8000",
  "P1000", "P1200", "P2000", "P3000", "P4000",
  "M1000", "M1200", "M2000", "M3000", "M4000",
  "T1000", "T1200", "T2000", "T3000", "T4000",
];

// Graphics card manufacturers
const graphicsManufacturers = ["NVIDIA", "AMD", "Intel Arc", "أخرى"];

// VRAM options
const vramOptions = [2, 4, 6, 8, 12, 16, 24, 48];

// Memory type options
const memoryTypeOptions = ["GDDR6X", "GDDR6", "GDDR5", "HBM2", "HBM3", "أخرى"];

// Memory bus width options
const memoryBusWidthOptions = [64, 128, 192, 256, 320, 384, 512];

// Power connector options
const powerConnectorOptions = ["6-pin", "8-pin", "12-pin", "16-pin", "لا يتطلب موصل إضافي"];

// Available ports options
const availablePortsOptions = [
  "HDMI 2.1", "DisplayPort 1.4", "DisplayPort 2.1",
  "DVI-D", "USB-C", "VGA"
];

// Processor generation options
const processorGenerationOptions = [
  "1st Generation", "2nd Generation", "3rd Generation", "4th Generation", "5th Generation",
  "6th Generation", "7th Generation", "8th Generation", "9th Generation", "10th Generation",
  "11th Generation", "12th Generation", "13th Generation", "14th Generation", "15th Generation"
];

// Gaming technologies options
const gamingTechnologiesOptions = [
  "Ray Tracing", "DLSS", "FSR", "G-Sync Compatible",
  "FreeSync", "DirectX 12 Ultimate"
];



// ─────────────────────────────────────────────────────────────────────────────
// Reusable collapsible section for the admin form
// ─────────────────────────────────────────────────────────────────────────────
function CollapsibleFormSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-right"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export function ProductForm({ onSubmit }: ProductFormProps) {
  const { products } = useStore();
  const { t } = useTranslation();

  // Initial form state
  const initialFormState = {
    id: crypto.randomUUID(),
    name: "",
    brand: "",
    price: "",
    category: "",
    subcategory: "",
    color: "",
    size: "",
    images: [] as string[],
    description: "",
    specialOffer: false,
    discountPercentage: "",
    discountPrice: "",
    offerEndsAt: "",
    isArchived: false,
    expirationDate: undefined as string | undefined,
    sizes: [] as Array<{ id: string; label: string; price: string; extraPrice: string }>,
    customOptionGroups: getLastCustomOptions() as Array<{
      id: string;
      name: string;
      options: Array<{ id: string; label: string; price: string; extraPrice: string }>;
    }>,
    addons: [] as Array<{ id: string; label: string; price_delta: string }>,
    specifications: [] as Array<{ id: string; key: string; value: string; inFilter: boolean; filterSlug?: string; isDropdown?: boolean }>,
    videoUrls: [] as string[],
    baseCost: "",
    wholesaleInfo: {
      purchasedQuantity: 50,
      quantity: 50,
    },
    features: [] as string[],
  };

  // Use form persistence hook
  const {
    state: formData,
    updateState: setFormData,
    clearSavedState,
    resetState,
    hasUnsavedChanges,
  } = useFormPersistence(initialFormState, {
    key: 'add_product_form',
    debounceMs: 2000, // Save every 2 seconds
    autoSave: true,
  });

  // Additional form state that doesn't need persistence
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [offerEndDate, setOfferEndDate] = useState<Date | undefined>(undefined);
  const [customBrand, setCustomBrand] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [discountPrice, setDiscountPrice] = useState("");
  const [showWholesaleInfo, setShowWholesaleInfo] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Functions to manage sizes
  const addSize = () => {
    const basePrice = (formData.specialOffer && formData.discountPrice)
      ? Number(formData.discountPrice)
      : (Number(formData.price) || 0);

    const newSize = {
      id: crypto.randomUUID(),
      label: "",
      price: basePrice.toString(),
      extraPrice: "0",
    };
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, newSize]
    }));
  };

  // Update size prices when base price changes
  useEffect(() => {
    if (formData.sizes.length > 0) {
      setFormData(prev => {
        const basePrice = (prev.specialOffer && prev.discountPrice)
          ? Number(prev.discountPrice)
          : (Number(prev.price) || 0);

        return {
          ...prev,
          sizes: prev.sizes.map(size => {
            const extra = Number(size.extraPrice) || 0;
            return {
              ...size,
              price: (basePrice + extra).toString()
            };
          }),
          customOptionGroups: (prev.customOptionGroups || []).map(group => ({
            ...group,
            options: group.options.map((opt, idx) => ({
              ...opt,
              extraPrice: idx === 0 ? "0" : opt.extraPrice,
              price: (basePrice + (idx === 0 ? 0 : Number(opt.extraPrice) || 0)).toString()
            }))
          }))
        };
      });
    }
  }, [formData.price, formData.specialOffer, formData.discountPrice, formData.sizes.length, formData.customOptionGroups?.length]);

  const updateSize = (index: number, field: 'label' | 'extraPrice', value: string) => {
    setFormData(prev => {
      const newSizes = [...prev.sizes];
      const size = { ...newSizes[index] };

      if (field === 'extraPrice') {
        size.extraPrice = value;
        const basePrice = (prev.specialOffer && prev.discountPrice)
          ? Number(prev.discountPrice)
          : (Number(prev.price) || 0);
        const extra = Number(value) || 0;
        size.price = (basePrice + extra).toString();
      } else {
        size[field] = value;
      }

      newSizes[index] = size;
      return { ...prev, sizes: newSizes };
    });
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  // Functions to manage custom option groups
  const addCustomOptionGroup = () => {
    const basePrice = (formData.specialOffer && formData.discountPrice)
      ? Number(formData.discountPrice)
      : (Number(formData.price) || 0);

    const newGroup = {
      id: crypto.randomUUID(),
      name: "",
      options: [
        { id: crypto.randomUUID(), label: "", price: basePrice.toString(), extraPrice: "0" }
      ]
    };
    setFormData(prev => ({
      ...prev,
      customOptionGroups: [...(prev.customOptionGroups || []), newGroup]
    }));
  };

  const updateCustomOptionGroupName = (groupIndex: number, name: string) => {
    setFormData(prev => {
      const groups = [...(prev.customOptionGroups || [])];
      groups[groupIndex] = { ...groups[groupIndex], name };
      return { ...prev, customOptionGroups: groups };
    });
  };

  const removeCustomOptionGroup = (groupIndex: number) => {
    setFormData(prev => ({
      ...prev,
      customOptionGroups: (prev.customOptionGroups || []).filter((_, i) => i !== groupIndex)
    }));
  };

  const addOptionToGroup = (groupIndex: number) => {
    const basePrice = (formData.specialOffer && formData.discountPrice)
      ? Number(formData.discountPrice)
      : (Number(formData.price) || 0);

    setFormData(prev => {
      const groups = [...(prev.customOptionGroups || [])];
      groups[groupIndex].options.push({
        id: crypto.randomUUID(),
        label: "",
        price: basePrice.toString(),
        extraPrice: "0"
      });
      return { ...prev, customOptionGroups: groups };
    });
  };

  const updateOptionInGroup = (groupIndex: number, optionIndex: number, field: 'label' | 'extraPrice', value: string) => {
    setFormData(prev => {
      const groups = [...(prev.customOptionGroups || [])];
      const option = { ...groups[groupIndex].options[optionIndex] };

      if (field === 'extraPrice') {
        if (optionIndex === 0) {
          option.extraPrice = "0";
        } else {
          option.extraPrice = value;
        }

        const basePrice = (prev.specialOffer && prev.discountPrice)
          ? Number(prev.discountPrice)
          : (Number(prev.price) || 0);
        const extra = Number(option.extraPrice) || 0;
        option.price = (basePrice + extra).toString();
      } else {
        option[field] = value;
      }

      groups[groupIndex].options[optionIndex] = option;
      return { ...prev, customOptionGroups: groups };
    });
  };

  const removeOptionFromGroup = (groupIndex: number, optionIndex: number) => {
    setFormData(prev => {
      const groups = [...(prev.customOptionGroups || [])];
      groups[groupIndex].options = groups[groupIndex].options.filter((_, i) => i !== optionIndex);
      return { ...prev, customOptionGroups: groups };
    });
  };

  // Functions to manage addons
  const addAddon = () => {
    const newAddon = {
      id: crypto.randomUUID(),
      label: "",
      price_delta: "",
    };
    setFormData(prev => ({
      ...prev,
      addons: [...prev.addons, newAddon]
    }));
  };

  const updateAddon = (index: number, field: 'label' | 'price_delta', value: string) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.map((addon, i) =>
        i === index ? { ...addon, [field]: value } : addon
      )
    }));
  };

  const removeAddon = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index)
    }));
  };

  // Functions to manage specifications
  const addSpecification = () => {
    const newSpec = {
      id: crypto.randomUUID(),
      key: "",
      value: "",
      inFilter: false,
    };
    setFormData(prev => ({
      ...prev,
      specifications: [...(prev.specifications || []), newSpec]
    }));
  };

  const updateSpecification = (index: number, field: 'key' | 'value' | 'inFilter', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      specifications: (prev.specifications || []).map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      )
    }));
  };

  const removeSpecification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: (prev.specifications || []).filter((_, i) => i !== index)
    }));
  };

  // Get unique brands and subcategories from existing products
  const getUniqueBrands = () => {
    const brands = products.map((product) => product.brand).filter(Boolean);
    return [...new Set(brands)].sort();
  };

  const getUniqueCategories = () => {
    const categories = products.map((product) => product.category).filter(Boolean);
    const uniqueCategories = [...new Set(categories)].sort();
    const fixedValues = fixedCategories.map(c => c.value);
    
    const customCategories = uniqueCategories
      .filter(c => !fixedValues.includes(c))
      .map(c => ({ value: c, label: c }));

    return [...fixedCategories, ...customCategories];
  };

  const getUniqueSubcategories = (category: string) => {
    const subcategories = products
      .filter((product) => product.category === category)
      .map((product) => product.subcategory)
      .filter(Boolean) as string[];
    return [...new Set(subcategories)].sort();
  };

  const uniqueBrands = getUniqueBrands();
  const allCategories = getUniqueCategories();
  const uniqueSubcategories = formData.category
    ? getUniqueSubcategories(formData.category)
    : [];

  const addColor = (colorValue: string) => {
    if (!colors.includes(colorValue)) {
      setColors([...colors, colorValue]);
    }
  };

  const removeColor = (colorToRemove: string) => {
    setColors(colors.filter((color) => color !== colorToRemove));
  };

  const addOldSize = (size: string) => {
    if (!sizes.includes(size)) {
      setSizes([...sizes, size]);
    }
  };

  const removeOldSize = (sizeToRemove: string) => {
    setSizes(sizes.filter((size) => size !== sizeToRemove));
  };

  const addImageUrl = () => {
    if (imageUrl && !formData.images.includes(imageUrl)) {
      setFormData({ ...formData, images: [...formData.images, imageUrl] });
      setImageUrl("");
    }
  };

  const removeImage = (urlToRemove: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((url) => url !== urlToRemove),
    });
  };

  const addVideoUrl = () => {
    if (videoUrl && !formData.videoUrls?.includes(videoUrl)) {
      setFormData({ ...formData, videoUrls: [...(formData.videoUrls || []), videoUrl] });
      setVideoUrl("");
    }
  };

  const removeVideo = (urlToRemove: string) => {
    setFormData({
      ...formData,
      videoUrls: (formData.videoUrls || []).filter((url) => url !== urlToRemove),
    });
  };

  // Calculate discount percentage based on price and discount price
  const calculateDiscountPercentage = (
    price: number,
    discountPrice: number
  ) => {
    if (!price || !discountPrice) return "";
    const percentage = ((price - discountPrice) / price) * 100;
    return percentage.toFixed(0);
  };

  // Update form data when discount price changes
  const handleDiscountPriceChange = (value: string) => {
    setDiscountPrice(value);
    const price = Number(formData.price);
    const discountPriceNum = Number(value);
    if (price && discountPriceNum) {
      const percentage = calculateDiscountPercentage(price, discountPriceNum);
      setFormData({
        ...formData,
        discountPercentage: percentage,
        discountPrice: value,
      });
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use custom values if they exist, otherwise use selected values
    const finalBrand = showCustomBrand ? customBrand : formData.brand;
    const finalSubcategory = showCustomSubcategory
      ? customSubcategory
      : formData.subcategory;
    const finalCategory = showCustomCategory
      ? formData.category
      : formData.category;

    if (
      !formData.name ||
      !finalBrand ||
      !formData.price ||
      !finalCategory ||
      !finalSubcategory
    ) {
      toast.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }

    // Validate special offer fields if special offer is enabled
    if (formData.specialOffer) {
      if (!formData.discountPrice && !formData.discountPercentage) {
        toast.error("الرجاء إدخال سعر الخصم للعرض الخاص");
        return;
      }
    }

    // Validate wholesale info if enabled
    if (showWholesaleInfo && formData.wholesaleInfo) {
      const { purchasedQuantity, quantity } = formData.wholesaleInfo;
      if (purchasedQuantity < 0) {
        toast.error("الكمية المشتراة يجب أن تكون أكبر من أو تساوي صفر");
        return;
      }
      if (quantity < 0) {
        toast.error("الكمية المتاحة يجب أن تكون أكبر من أو تساوي صفر");
        return;
      }
      if (quantity > purchasedQuantity) {
        toast.error("الكمية المتاحة لا يمكن أن تكون أكبر من الكمية المشتراة");
        return;
      }
    }

    try {
      // Process sizes and addons
      const processedSizes = formData.sizes
        .filter(size => size.label.trim())
        .map(size => ({
          id: size.id,
          label: size.label.trim(),
          extraPrice: Number(size.extraPrice) || 0,
          price: Number(size.price)
        }));

      const processedCustomOptionGroups = (formData.customOptionGroups || [])
        .filter(group => group.name.trim() && group.options.some(opt => opt.label.trim()))
        .map(group => ({
          id: group.id,
          name: group.name.trim(),
          options: group.options
            .filter(opt => opt.label.trim())
            .map((opt, idx) => ({
              id: opt.id,
              label: opt.label.trim(),
              extraPrice: idx === 0 ? 0 : (Number(opt.extraPrice) || 0)
            }))
        }));

      const processedAddons = formData.addons
        .filter(addon => addon.label.trim() && addon.price_delta.trim())
        .map(addon => ({
          id: addon.id,
          label: addon.label.trim(),
          price_delta: Number(addon.price_delta)
        }));

      const processedSpecifications = (formData.specifications || [])
        .filter(spec => spec.key.trim() && spec.value.trim())
        .map(spec => ({
          id: spec.id,
          key: spec.key.trim(),
          value: spec.value.trim(),
          inFilter: spec.inFilter,
          ...(spec.filterSlug ? { filterSlug: spec.filterSlug.trim() } : {}),
          ...(spec.isDropdown !== undefined ? { isDropdown: spec.isDropdown } : {}),
        }));

      const product = {
        ...formData,
        brand: finalBrand,
        subcategory: finalSubcategory,
        category: finalCategory,
        price: Number(formData.price),
        color: colors.length > 0 ? colors.join(",") : "",
        size: sizes.length > 0 ? sizes.join(",") : "",
        sizes: processedSizes,
        customOptionGroups: processedCustomOptionGroups,
        addons: processedAddons,
        specifications: processedSpecifications,
        costs: formData.baseCost ? { base_cost: Number(formData.baseCost) } : undefined,
        discountPercentage: formData.specialOffer && formData.discountPercentage
          ? Number(formData.discountPercentage)
          : null,
        discountPrice: formData.specialOffer && formData.discountPrice
          ? Number(formData.discountPrice)
          : null,
        offerEndsAt:
          formData.specialOffer && offerEndDate
            ? offerEndDate.toISOString()
            : null,
        isArchived: formData.isArchived,
        createdAt: new Date().toISOString(),
        expirationDate: formData.expirationDate || null,
        wholesaleInfo: showWholesaleInfo ? (() => {
          const wholesaleInfo = formData.wholesaleInfo;
          if (!wholesaleInfo) return null;

          // عند إضافة منتج جديد، نضمن أن الكمية المتاحة = الكمية المشتراة
          // إذا كانت الكمية المتاحة = 0 أو لم يتم تعيينها، نعيّنها = الكمية المشتراة
          const finalQuantity = wholesaleInfo.quantity === 0 && wholesaleInfo.purchasedQuantity > 0
            ? wholesaleInfo.purchasedQuantity
            : (wholesaleInfo.quantity || 0);

          return {
            ...wholesaleInfo,
            quantity: finalQuantity,
          };
        })() : null,

        videoUrls: formData.videoUrls || [],
      };

      // Remove id from product data since Firebase will generate it
      const { id, ...productData } = product;

      // Update the store using Firebase
      await onSubmit(productData as any);

      // Save custom option groups to localStorage as template for next products
      try {
        localStorage.setItem(LOCALSTORAGE_CUSTOM_OPTIONS_KEY, JSON.stringify(processedCustomOptionGroups));
      } catch (e) { }

      // Reset form and clear saved state
      resetState();

      // Preserve the custom option groups for the next entry
      setFormData((prev: any) => ({
        ...prev,
        customOptionGroups: processedCustomOptionGroups
      }));
      setColors([]);
      setSizes([]);
      setImageUrl("");
      setVideoUrl("");
      setOfferEndDate(undefined);
      setCustomBrand("");
      setCustomSubcategory("");
      setShowCustomBrand(false);
      setShowCustomSubcategory(false);
      setShowCustomCategory(false);
      setDiscountPrice("");
      setShowWholesaleInfo(true);

      // Success message (will be shown regardless of Firebase/localStorage)
      toast.success("تمت إضافة المنتج بنجاح");
    } catch (error) {
      console.error("خطأ في إضافة المنتج:", error);
      toast.error("فشل في إضافة المنتج");
    }
  };

  return (
    <>
      <UnsavedChangesAlert hasUnsavedChanges={hasUnsavedChanges} />
      <Collapsible
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        className="border rounded-lg bg-card shadow-sm overflow-hidden"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">إضافة منتج جديد</h2>
            </div>
            <div className="flex items-center gap-4">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">تم حفظ البيانات تلقائياً</span>
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isFormOpen ? "rotate-180" : "rotate-0"}`} />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 p-6 pt-0 border-t mt-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">الاسم *</label>
            <Input
              id="product-name"
              name="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">العلامة التجارية *</label>
            {!showCustomBrand ? (
              <div className="space-y-2">
                <Select
                  value={formData.brand}
                  onValueChange={(value) => {
                    if (value === "add-new") {
                      setShowCustomBrand(true);
                      setFormData({ ...formData, brand: "" });
                    } else {
                      setFormData({ ...formData, brand: value });
                    }
                  }}
                >
                  <SelectTrigger className="shrink-0">
                    <SelectValue placeholder="اختر علامة تجارية" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {uniqueBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="add-new"
                      className="text-blue-600 font-medium"
                    >
                      + إضافة علامة تجارية جديدة
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="custom-brand"
                  name="brand"
                  required
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="أدخل اسم العلامة التجارية الجديدة"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomBrand(false);
                    setCustomBrand("");
                  }}
                >
                  العودة إلى الاختيار
                </Button>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">السعر *</label>
            <Input
              id="product-price"
              name="price"
              required
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
            />
            {formData.price && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatPrice(Number(formData.price))} جنيه
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">التصنيف *</label>
            <div className="space-y-2">
              <Select
                value={showCustomCategory ? "custom" : formData.category}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomCategory(true);
                    setFormData({ ...formData, category: "", subcategory: "" });
                  } else {
                    setShowCustomCategory(false);
                    setFormData({
                      ...formData,
                      category: value,
                      subcategory: "",
                    });
                  }
                }}
              >
                <SelectTrigger className="shrink-0">
                  <SelectValue placeholder="اختر تصنيفًا" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="custom"
                    className="text-blue-600 font-medium"
                  >
                    + إضافة تصنيف جديد
                  </SelectItem>
                </SelectContent>
              </Select>
              {showCustomCategory && (
                <Input
                  type="text"
                  placeholder="أدخل تصنيف جديد"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {formData.category && (
            <div>
              <label className="text-sm font-medium">التصنيف الفرعي *</label>
              {!showCustomSubcategory ? (
                <div className="space-y-2">
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => {
                      if (value === "add-new") {
                        setShowCustomSubcategory(true);
                        setFormData({ ...formData, subcategory: "" });
                      } else {
                        setFormData({ ...formData, subcategory: value });
                      }
                    }}
                  >
                    <SelectTrigger className="shrink-0">
                      <SelectValue placeholder="اختر تصنيفًا فرعيًا" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {uniqueSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="add-new"
                        className="text-blue-600 font-medium"
                      >
                        + إضافة تصنيف فرعي جديد
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    required
                    id="custom-subcategory"
                    name="subcategory"
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="أدخل اسم تصنيف فرعي جديد"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCustomSubcategory(false);
                      setCustomSubcategory("");
                    }}
                  >
                    العودة إلى الاختيار
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Special Offer Section */}
        <CollapsibleFormSection
          title="🎯 عرض خاص"
          badge={formData.specialOffer ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">مفعّل</span> : undefined}
          defaultOpen={formData.specialOffer}
        >
          <div className="flex items-center space-x-2">
            <Switch
              id="special-offer"
              checked={formData.specialOffer}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, specialOffer: checked })
              }
            />
            <Label htmlFor="special-offer" className="font-medium">
              تفعيل العرض الخاص
            </Label>
          </div>

          {formData.specialOffer && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-sm font-medium">سعر الخصم *</label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    min="1"
                    value={discountPrice}
                    onChange={(e) => handleDiscountPriceChange(e.target.value)}
                    className="flex-1"
                    placeholder="أدخل سعر الخصم"
                  />
                  <span className="ms-2 text-lg">ج.م</span>
                </div>
                {formData.price && discountPrice && (
                  <p className="text-sm text-muted-foreground mt-1">
                    الخصم: {formData.discountPercentage}%
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">
                    تاريخ انتهاء العرض (اختياري - للعد التنازلي)
                  </label>
                  {offerEndDate && (
                    <button
                      type="button"
                      onClick={() => setOfferEndDate(undefined)}
                      className="text-xs text-red-500 hover:text-red-700 underline font-normal"
                    >
                      إلغاء التاريخ (بدون عد تنازلي)
                    </button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !offerEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {offerEndDate ? (
                        format(offerEndDate, "PPP", { locale: ar })
                      ) : (
                        <span>بدون تاريخ انتهاء (عرض دائم)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={offerEndDate}
                      onSelect={setOfferEndDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className={cn("p-3 pointer-events-auto")}
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CollapsibleFormSection>

        {/* Color section */}
        <CollapsibleFormSection
          title="🎨 الألوان المتاحة"
          badge={colors.length > 0 ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{colors.length} لون</span> : undefined}
        >
          <div className="space-y-4">
            {/* Color Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">الألوان الأساسية</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "basic").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warm Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">الألوان الدافئة</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "warm").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cool Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">الألوان الباردة</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "cool").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fashion Colors */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ألوان الموضة</h4>
                <div className="grid grid-cols-5 gap-2">
                  {commonColors.filter(color => color.category === "fashion").map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => addColor(color.value)}
                      disabled={colors.includes(color.value)}
                      className={cn(
                        "relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
                        colors.includes(color.value)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {colors.includes(color.value) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Colors Display */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  الألوان المختارة ({colors.length})
                </h4>
                <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg border">
                  {colors.map((color, index) => {
                    const colorInfo = getColorByName(color);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-background rounded-full px-3 py-2 border shadow-sm"
                      >
                        <div
                          className="h-6 w-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{colorInfo.name}</span>
                        <button
                          type="button"
                          onClick={() => removeColor(color)}
                          className="ml-1 p-1 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Color Picker */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                اختيار سريع للألوان الشائعة
              </h4>
              <div className="flex flex-wrap gap-2">
                {commonColors.slice(0, 12).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => addColor(color.value)}
                    disabled={colors.includes(color.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
                      colors.includes(color.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:border-primary/50"
                    )}
                  >
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleFormSection>

        {/* sizes section */}
        {/* <div>
        <label className="text-sm font-medium">الأحجام *</label>
        <div className="space-y-2">
          <Select onValueChange={addOldSize}>
            <SelectTrigger className="w-full shrink-0">
              <SelectValue placeholder="اختر حجمًا" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {commonSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-2">
            {sizes.map((size, index) => (
              <div
                key={index}
                className="relative inline-flex items-center rounded-md border bg-background px-3 py-1"
              >
                {size}
                <button
                  type="button"
                  onClick={() => removeOldSize(size)}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div> */}

        <CollapsibleFormSection
          title="📼 فيديوهات المنتج"
          badge={(formData.videoUrls?.length || 0) > 0 ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formData.videoUrls?.length} فيديو</span> : undefined}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="أدخل رابط الفيديو (YouTube, Facebook, etc)"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addVideoUrl}
                variant="outline"
                className="flex gap-1 items-center"
              >
                <PlusCircle className="h-4 w-4" />
                إضافة
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {(formData.videoUrls || []).map((url, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border">
                  <span className="text-sm truncate flex-1 ml-2" dir="ltr">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeVideo(url)}
                    className="p-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleFormSection>

        <CollapsibleFormSection
          title="📸 صور المنتج *"
          badge={formData.images.length > 0 ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formData.images.length} صور</span> : undefined}
          defaultOpen={true}
        >
          <ProductImageUploader
            images={formData.images}
            onChange={(newImages) => setFormData({ ...formData, images: newImages })}
            folder="products"
            productName={formData.name}
            brand={showCustomBrand ? customBrand : formData.brand}
          />
        </CollapsibleFormSection>

        <CollapsibleFormSection
          title="📝 وصف المنتج *"
          badge={formData.description.trim() ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">جاهز</span> : undefined}
          defaultOpen={true}
        >
          <div className="space-y-2">
            <div
              className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:font-semibold
            prose-p:leading-relaxed
            prose-ul:list-disc prose-ul:pl-4
            prose-ol:list-decimal prose-ol:pl-4
            prose-li:my-1
            prose-strong:text-foreground
            prose-em:text-foreground/80
            prose-ul:marker:text-foreground
            prose-ol:marker:text-foreground"
            >
              <div className="quill-container">
                <ReactQuill
                  theme="snow"
                  value={formData.description}
                  onChange={(value) =>
                    setFormData({ ...formData, description: value })
                  }
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ["bold", "italic", "underline", "strike"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["clean"],
                    ],
                  }}
                  className="rtl-quill"
                  style={{
                    height: "auto",
                    minHeight: "200px",
                  }}
                  formats={[
                    "header",
                    "bold",
                    "italic",
                    "underline",
                    "strike",
                    "list",
                    "bullet",
                  ]}
                />
              </div>
            </div>
          </div>
        </CollapsibleFormSection>

        {/* Specifications Section */}
        <SpecificationsEditor
          category={formData.category}
          specifications={(formData.specifications || []) as SpecRow[]}
          onChange={(specs) => setFormData(prev => ({ ...prev, specifications: specs }))}
          features={formData.features || []}
          onFeaturesChange={(features) => setFormData(prev => ({ ...prev, features }))}
        />



        {/* Archive Status */}
        <CollapsibleFormSection
          title="📁 أرشفة المنتج"
          badge={formData.isArchived ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">مؤرشف</span> : undefined}
          defaultOpen={formData.isArchived}
        >
          <div className="flex items-center space-x-2">
            <Switch
              id="archive-status"
              checked={formData.isArchived}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isArchived: checked })
              }
            />
            <Label htmlFor="archive-status" className="font-medium">
              أرشفة المنتج
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            المنتجات المؤرشفة لن تكون مرئية للعملاء
          </p>
        </CollapsibleFormSection>

        {/* Wholesale Information */}
        <CollapsibleFormSection
          title="📦 الكمية والمخزون"
          badge={showWholesaleInfo ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formData.wholesaleInfo?.quantity || 0} متوفر</span> : undefined}
          defaultOpen={showWholesaleInfo}
        >
          <div className="flex items-center space-x-2">
            <Switch
              id="wholesale-info"
              checked={showWholesaleInfo}
              onCheckedChange={(checked) => {
                setShowWholesaleInfo(checked);
                if (!checked) {
                  setFormData({
                    ...formData,
                    wholesaleInfo: undefined,
                  });
                } else if (!formData.wholesaleInfo) {
                  setFormData({
                    ...formData,
                    wholesaleInfo: {
                      purchasedQuantity: 0,
                      quantity: 0,
                    },
                  });
                }
              }}
            />
            <Label htmlFor="wholesale-info" className="font-medium">
              تفعيل إدارة المخزون
            </Label>
          </div>

          {showWholesaleInfo && formData.wholesaleInfo && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="text-sm font-medium">
                  الكمية التي تم شراؤها *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.wholesaleInfo?.purchasedQuantity || 0}
                  onChange={(e) => {
                    const purchasedQuantity = parseInt(e.target.value) || 0;
                    const currentQuantity = formData.wholesaleInfo?.quantity || 0;
                    // عند إضافة منتج جديد، نعيّن الكمية المتاحة = الكمية المشتراة
                    // إذا كانت الكمية المتاحة = 0 أو لم يتم تعيينها، نعيّنها = الكمية المشتراة
                    const newQuantity = currentQuantity === 0 ? purchasedQuantity : currentQuantity;
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        purchasedQuantity: purchasedQuantity,
                        quantity: newQuantity,
                      },
                    });
                  }}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  الكمية الإجمالية التي تم شراؤها
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  الكمية المتوفرة حالياً *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.wholesaleInfo?.quantity || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wholesaleInfo: {
                        ...formData.wholesaleInfo!,
                        quantity: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  الكمية المتوفرة حالياً في المخزن (يتم خصمها تلقائياً عند البيع)
                </p>
                {formData.wholesaleInfo && formData.wholesaleInfo.purchasedQuantity > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    المتبقي من الشراء: {formData.wholesaleInfo.purchasedQuantity - (formData.wholesaleInfo.quantity || 0)} قطعة
                  </p>
                )}
              </div>
            </div>
          )}
        </CollapsibleFormSection>

        {/* Expiration Date Section */}
        <CollapsibleFormSection
          title="⏳ تاريخ انتهاء الصلاحية"
          badge={formData.expirationDate ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">محدد</span> : undefined}
          defaultOpen={!!formData.expirationDate}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">تحديد تاريخ انتهاء الصلاحية</h3>
            <Switch
              id="expiration-date"
              checked={!!formData.expirationDate}
              onCheckedChange={(checked) => {
                if (checked) {
                  // Set default expiration date to 30 days from now if not set
                  const defaultDate = new Date();
                  defaultDate.setDate(defaultDate.getDate() + 30);
                  setFormData({
                    ...formData,
                    expirationDate: defaultDate.toISOString(),
                  });
                } else {
                  setFormData({ ...formData, expirationDate: undefined });
                }
              }}
            />
          </div>
          {formData.expirationDate && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expirationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expirationDate ? (
                    format(new Date(formData.expirationDate), "PPP", {
                      locale: ar,
                    })
                  ) : (
                    <span>اختر تاريخ انتهاء الصلاحية</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    formData.expirationDate
                      ? new Date(formData.expirationDate)
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      setFormData({
                        ...formData,
                        expirationDate: date.toISOString(),
                      });
                    }
                  }}
                  initialFocus
                  locale={ar}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            عند انتهاء الصلاحية، سيتم أرشفة المنتج تلقائياً ولن يظهر للعملاء
          </p>
        </CollapsibleFormSection>

        {/* Custom Option Groups Section */}
        <CollapsibleFormSection
          title="🧩 أقسام متخصصة (خيارات المنتج)"
          badge={(formData.customOptionGroups?.length || 0) > 0 ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formData.customOptionGroups?.length} قسم</span> : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                مثل: حجم الرامات، حجم الهاردات، وتحديد خيارات كل قسم. الخيار الأول في كل قسم يكون أساسياً.
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={addCustomOptionGroup}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة قسم جديد
            </Button>
          </div>

          {formData.customOptionGroups && formData.customOptionGroups.length > 0 && (
            <div className="space-y-6 mt-4">
              {formData.customOptionGroups.map((group, groupIndex) => (
                <div key={group.id} className="relative p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
                  {/* ... same inside items ... */}
                  <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex-1 max-w-sm">
                      <label className="text-sm font-bold text-gray-700 mb-1 block">اسم القسم * <span className="text-xs font-normal text-gray-400">(مثال: حجم الرامات)</span></label>
                      <Input
                        placeholder="اسم القسم"
                        value={group.name}
                        onChange={(e) => updateCustomOptionGroupName(groupIndex, e.target.value)}
                        className="bg-gray-50 font-bold"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomOptionGroup(groupIndex)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 ml-1" />
                      إزالة القسم بالكامل
                    </Button>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3">
                    {group.options.map((option, optionIndex) => (
                      <div key={option.id} className={`grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-lg border ${optionIndex === 0 ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-gray-100'}`}>
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                            اسم الخيار * {optionIndex === 0 && <span className="text-blue-600 font-bold">(الأساسي)</span>}
                          </label>
                          <Input
                            placeholder="مثال: 8GB"
                            value={option.label}
                            onChange={(e) => updateOptionInGroup(groupIndex, optionIndex, 'label', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                            سعر إضافي (+)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={optionIndex === 0 ? 0 : option.extraPrice}
                            disabled={optionIndex === 0}
                            onChange={(e) => updateOptionInGroup(groupIndex, optionIndex, 'extraPrice', e.target.value)}
                            className={optionIndex === 0 ? "bg-gray-100 cursor-not-allowed" : ""}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">السعر النهائي</label>
                            <Input
                              value={option.price}
                              disabled
                              className="bg-gray-50 text-gray-500"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeOptionFromGroup(groupIndex, optionIndex)}
                            disabled={group.options.length === 1}
                            className="shrink-0 h-10 w-10 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOptionToGroup(groupIndex)}
                      className="mt-2 text-sm text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <PlusCircle className="h-3 w-3 ml-1.5" />
                      إضافة خيار إضافي
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleFormSection>

        {/* Product Addons Section */}
        <CollapsibleFormSection
          title="⚙️ الإضافات الاختيارية"
          badge={formData.addons.length > 0 ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formData.addons.length} إضافة</span> : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                إضافة خصائص اختيارية يمكن للعميل اختيارها
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAddon}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              إضافة إضافة
            </Button>
          </div>

          {formData.addons.length > 0 && (
            <div className="space-y-3 mt-4">
              {formData.addons.map((addon, index) => (
                <div key={addon.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium">اسم الإضافة *</label>
                    <Input
                      placeholder="مثال: SSD 1TB"
                      value={addon.label}
                      onChange={(e) => updateAddon(index, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">السعر الإضافي (ج.م) *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={addon.price_delta}
                      onChange={(e) => updateAddon(index, 'price_delta', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAddon(index)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleFormSection>

        {/* Base Cost Section */}
        <CollapsibleFormSection
          title="💰 التكلفة الأساسية (اختياري)"
          badge={formData.baseCost ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{formData.baseCost} ج.م</span> : undefined}
          defaultOpen={!!formData.baseCost}
        >
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              التكلفة الأساسية للمنتج لحساب الأرباح
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">التكلفة الأساسية (ج.م)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.baseCost}
              onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })}
            />
          </div>
        </CollapsibleFormSection>

        <Button type="submit" className="w-full">
          إضافة المنتج
        </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
