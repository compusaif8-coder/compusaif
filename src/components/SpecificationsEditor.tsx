import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  Cpu,
  Monitor,
  Keyboard,
  Package,
  Zap,
  ClipboardList,
  LayoutTemplate,
} from "lucide-react";

export interface SpecRow {
  id: string;
  key: string;
  value: string;
  inFilter: boolean;
  filterSlug?: string;
  isDropdown?: boolean;
}

interface SpecificationsEditorProps {
  category: string;
  specifications: SpecRow[];
  onChange: (specs: SpecRow[]) => void;
  features?: string[];
  onFeaturesChange?: (features: string[]) => void;
}

// ────────────────────────────────────────────────────────────────
// Profile definitions
// ────────────────────────────────────────────────────────────────

type SpecTemplate = { key: string; placeholder: string };
type SectionTemplate = { title: string; icon: string; specs: SpecTemplate[] };

const LAPTOP_PROFILE: SectionTemplate[] = [
  {
    title: "المعالج (Processor)",
    icon: "cpu",
    specs: [
      { key: "المعالج", placeholder: "مثال: Intel Core i7-13700H" },
      { key: "فئة المعالج", placeholder: "مثال: Intel Core i7" },
      { key: "حرف المعالج", placeholder: "مثال: H" },
      { key: "الجيل", placeholder: "مثال: الجيل الثالث عشر" },
      { key: "عدد الأنوية", placeholder: "مثال: 14 نواة" },
      { key: "عدد المسارات", placeholder: "مثال: 20 مسار" },
      { key: "التردد الأساسي", placeholder: "مثال: 2.4 GHz" },
      { key: "أقصى تردد", placeholder: "مثال: 5.0 GHz" },
      { key: "الكاش", placeholder: "مثال: 24 MB" },
      { key: "الكرت المدمج", placeholder: "مثال: Intel UHD Graphics 770" },
    ],
  },
  {
    title: "الذاكرة والتخزين",
    icon: "package",
    specs: [
      { key: "الرامات", placeholder: "مثال: 16 GB DDR5" },
      { key: "سرعة الرامات", placeholder: "مثال: 4800 MHz" },
      { key: "التخزين", placeholder: "مثال: 512 GB NVMe SSD" },
      { key: "فتحة توسعة", placeholder: "مثال: فتحة M.2 إضافية" },
    ],
  },
  {
    title: "الشاشة (Display)",
    icon: "monitor",
    specs: [
      { key: "حجم الشاشة", placeholder: "مثال: 15.6 بوصة" },
      { key: "دقة الشاشة", placeholder: "مثال: 1920×1080 FHD" },
      { key: "معدل التحديث", placeholder: "مثال: 144 Hz" },
      { key: "نوع الشاشة", placeholder: "مثال: IPS Anti-Glare" },
      { key: "سطوع الشاشة", placeholder: "مثال: 300 nits" },
    ],
  },
  {
    title: "كرت الشاشة (GPU)",
    icon: "zap",
    specs: [
      { key: "كرت الشاشة", placeholder: "مثال: NVIDIA RTX 4060" },
      { key: "حجم VRAM", placeholder: "مثال: 8 GB" },
      { key: "نوع VRAM", placeholder: "مثال: GDDR6" },
    ],
  },
  {
    title: "المواصفات العامة",
    icon: "package",
    specs: [
      { key: "البطارية", placeholder: "مثال: 72 Wh" },
      { key: "نظام التشغيل", placeholder: "مثال: Windows 11 Home" },
      { key: "الوزن", placeholder: "مثال: 1.9 كجم" },
      { key: "لوحة المفاتيح", placeholder: "مثال: Backlit Arabic/English" },
      { key: "المنافذ", placeholder: "مثال: 2× USB-A، 1× USB-C، HDMI، SD" },
      { key: "الواي فاي", placeholder: "مثال: Wi-Fi 6E (802.11ax)" },
      { key: "البلوتوث", placeholder: "مثال: Bluetooth 5.2" },
    ],
  },
];

const DESKTOP_PROFILE: SectionTemplate[] = [
  {
    title: "المعالج (Processor)",
    icon: "cpu",
    specs: [
      { key: "المعالج", placeholder: "مثال: Intel Core i9-13900K" },
      { key: "فئة المعالج", placeholder: "مثال: Intel Core i9" },
      { key: "الجيل", placeholder: "مثال: الجيل الثالث عشر" },
      { key: "عدد الأنوية", placeholder: "مثال: 24 نواة" },
      { key: "عدد المسارات", placeholder: "مثال: 32 مسار" },
      { key: "التردد الأساسي", placeholder: "مثال: 3.0 GHz" },
      { key: "أقصى تردد", placeholder: "مثال: 5.8 GHz" },
      { key: "الكاش", placeholder: "مثال: 36 MB" },
      { key: "الكرت المدمج", placeholder: "مثال: Intel UHD Graphics 770" },
    ],
  },
  {
    title: "كرت الشاشة (GPU)",
    icon: "zap",
    specs: [
      { key: "كرت الشاشة", placeholder: "مثال: NVIDIA RTX 4090" },
      { key: "حجم VRAM", placeholder: "مثال: 24 GB" },
      { key: "نوع VRAM", placeholder: "مثال: GDDR6X" },
    ],
  },
  {
    title: "الذاكرة والتخزين",
    icon: "package",
    specs: [
      { key: "الرامات", placeholder: "مثال: 32 GB DDR5" },
      { key: "سرعة الرامات", placeholder: "مثال: 6000 MHz" },
      { key: "أماكن الرامات", placeholder: "مثال: 4 أماكن" },
      { key: "أنواع التخزين", placeholder: "مثال: 512GB SSD + 1TB HDD" },
      { key: "أماكن التخزين", placeholder: "مثال: 2 مكان M.2 + 2 مكان SATA" },
    ],
  },
  {
    title: "اللوحة الأم والطاقة",
    icon: "cpu",
    specs: [
      { key: "اللوحة الأم", placeholder: "مثال: ASUS ROG STRIX Z790-F" },
      { key: "مصدر الطاقة", placeholder: "مثال: 850W 80+ Gold" },
      { key: "الكيس", placeholder: "مثال: NZXT H510" },
    ],
  },
  {
    title: "المواصفات العامة",
    icon: "package",
    specs: [
      { key: "نظام التشغيل", placeholder: "مثال: Windows 11 Pro" },
      { key: "المنافذ الأمامية", placeholder: "مثال: 2× USB-A، 1× USB-C" },
      { key: "المنافذ الخلفية", placeholder: "مثال: 2× USB 3.2، HDMI، DP" },
    ],
  },
];

const MONITOR_PROFILE: SectionTemplate[] = [
  {
    title: "الشاشة (Display)",
    icon: "monitor",
    specs: [
      { key: "حجم الشاشة", placeholder: "مثال: 27 بوصة" },
      { key: "دقة الشاشة", placeholder: "مثال: 2560×1440 QHD" },
      { key: "معدل التحديث", placeholder: "مثال: 165 Hz" },
      { key: "زمن الاستجابة", placeholder: "مثال: 1 ms GTG" },
      { key: "نوع اللوح", placeholder: "مثال: IPS" },
      { key: "السطوع", placeholder: "مثال: 400 nits" },
      { key: "نسبة التباين", placeholder: "مثال: 1000:1" },
      { key: "تغطية sRGB", placeholder: "مثال: 99% sRGB" },
    ],
  },
  {
    title: "المنافذ والتوصيلات",
    icon: "zap",
    specs: [
      { key: "DisplayPort", placeholder: "مثال: 1× DisplayPort 1.4" },
      { key: "HDMI", placeholder: "مثال: 2× HDMI 2.1" },
      { key: "USB Hub", placeholder: "مثال: 4× USB 3.0" },
      { key: "مقبس الصوت", placeholder: "مثال: 3.5mm" },
    ],
  },
  {
    title: "المواصفات العامة",
    icon: "package",
    specs: [
      { key: "تقنية Sync", placeholder: "مثال: G-Sync Compatible / FreeSync Premium" },
      { key: "HDR", placeholder: "مثال: HDR10" },
      { key: "الحامل", placeholder: "مثال: قابل للتعديل في الارتفاع والإمالة" },
      { key: "VESA", placeholder: "مثال: 100×100 mm" },
      { key: "استهلاك الطاقة", placeholder: "مثال: 40W" },
    ],
  },
];

const ACCESSORIES_PROFILE: SectionTemplate[] = [
  {
    title: "المواصفات الأساسية",
    icon: "keyboard",
    specs: [
      { key: "النوع", placeholder: "مثال: لاسلكي / سلكي" },
      { key: "التوصيل", placeholder: "مثال: USB / Bluetooth / 2.4GHz" },
      { key: "المدى", placeholder: "مثال: 10 متر" },
    ],
  },
  {
    title: "مواصفات إضافية",
    icon: "package",
    specs: [
      { key: "البطارية", placeholder: "مثال: AA × 2 أو مدمجة 1500 mAh" },
      { key: "التوافق", placeholder: "مثال: Windows / macOS / Android" },
      { key: "الأبعاد", placeholder: "مثال: 44 × 15 × 3 سم" },
      { key: "الوزن", placeholder: "مثال: 250 جرام" },
      { key: "ضمان", placeholder: "مثال: سنة" },
    ],
  },
];

const PROFILES: Record<string, SectionTemplate[]> = {
  laptop: LAPTOP_PROFILE,
  desktop: DESKTOP_PROFILE,
  monitor: MONITOR_PROFILE,
  accessories: ACCESSORIES_PROFILE,
};

const PROFILE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  laptop: { label: "لابتوب", emoji: "💻", color: "bg-blue-50 border-blue-200 text-blue-700" },
  desktop: { label: "كيس استيراد", emoji: "🖥️", color: "bg-purple-50 border-purple-200 text-purple-700" },
  monitor: { label: "شاشة", emoji: "🖵", color: "bg-green-50 border-green-200 text-green-700" },
  accessories: { label: "إكسسوار", emoji: "⌨️", color: "bg-orange-50 border-orange-200 text-orange-700" },
};

// ────────────────────────────────────────────────────────────────
// Icon helper
// ────────────────────────────────────────────────────────────────
function SectionIcon({ icon }: { icon: string }) {
  const cls = "h-4 w-4";
  if (icon === "cpu") return <Cpu className={cls} />;
  if (icon === "monitor") return <Monitor className={cls} />;
  if (icon === "keyboard") return <Keyboard className={cls} />;
  if (icon === "zap") return <Zap className={cls} />;
  return <Package className={cls} />;
}

// ────────────────────────────────────────────────────────────────
// CollapsibleSection – inner section (per profile group)
// ────────────────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-right"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SectionIcon icon={icon} />
          <span>{title}</span>
          {badge}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <div className="p-4 space-y-3 bg-background/50">{children}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Single spec row
// ────────────────────────────────────────────────────────────────
function SpecRowItem({
  spec,
  keyPlaceholder = "اسم الخاصية",
  valuePlaceholder = "القيمة",
  keyReadOnly = false,
  options = [],
  onUpdate,
  onRemove,
}: {
  spec: SpecRow;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyReadOnly?: boolean;
  options?: string[];
  onUpdate: (field: "key" | "value" | "inFilter" | "filterSlug" | "isDropdown", val: string | boolean | undefined) => void;
  onRemove: () => void;
}) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value.trim();
    if (!val) return;

    const isNumber = /^[\d.,]+$/.test(val);
    if (isNumber) {
      const suffixes: Record<string, string> = {
        "التردد الأساسي": "GHz",
        "أقصى تردد": "GHz",
        "الكاش": "MB",
        "سرعة الرامات": "MHz",
        "معدل التحديث": "Hz",
        "سطوع الشاشة": "nits",
        "حجم VRAM": "GB",
        "زمن الاستجابة": "ms",
        "حجم الشاشة": "بوصة",
        "المدى": "متر",
        "الرامات": "GB",
        "استهلاك الطاقة": "W",
        "عمر البطارية": "ساعات",
        "الوزن": "كجم",
      };

      const suffix = suffixes[spec.key];
      if (suffix) {
        onUpdate("value", `${val} ${suffix}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 bg-background rounded-lg border border-gray-200 p-3 shadow-sm mb-2 transition-all hover:border-gray-300">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
        {keyReadOnly ? (
          <div className="w-full sm:w-40 shrink-0">
            <span className="text-sm font-bold text-muted-foreground px-1">{spec.key}</span>
          </div>
        ) : (
          <Input
            className="w-full sm:w-40 shrink-0 text-sm font-semibold"
            placeholder={keyPlaceholder}
            value={spec.key}
            onChange={(e) => onUpdate("key", e.target.value)}
          />
        )}

        <div className="flex-1 w-full bg-white relative rounded-md border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-shadow flex items-center pr-2">
          {spec.isDropdown ? (
            <select
              className="flex-1 h-9 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-2 py-1 cursor-pointer"
              value={spec.value}
              onChange={(e) => onUpdate("value", e.target.value)}
              onBlur={handleBlur}
            >
              <option value="" disabled hidden>اختر من القائمة المسبقة...</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="flex-1 h-9 bg-transparent border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 px-2 py-1 outline-none"
              placeholder={valuePlaceholder}
              value={spec.value}
              onBlur={handleBlur}
              onChange={(e) => onUpdate("value", e.target.value)}
              list={options.length > 0 ? `datalist-${spec.id}` : undefined}
            />
          )}

          {options.length > 0 && !spec.isDropdown && (
            <datalist id={`datalist-${spec.id}`}>
              {options.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          )}

          {options.length > 0 && (
            <div className="flex items-center gap-1.5 border-r border-gray-100 pr-2 my-1 mr-1">
              <Switch
                id={`dropdown-${spec.id}`}
                checked={spec.isDropdown || false}
                onCheckedChange={(v) => onUpdate("isDropdown", v)}
                className="scale-75 data-[state=checked]:bg-amber-500"
              />
              <Label htmlFor={`dropdown-${spec.id}`} className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap hidden sm:block">
                تصفح الخيارات
              </Label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 mr-auto sm:ml-0 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
          <div
            className="flex items-center gap-1.5 h-9 px-2 bg-blue-50/50 rounded-md border border-blue-100 cursor-pointer hover:bg-blue-100/50 transition-colors"
          >
            <Switch
              id={`filter-${spec.id}`}
              checked={spec.inFilter}
              onCheckedChange={(v) => onUpdate("inFilter", v)}
              className="data-[state=checked]:bg-blue-600 scale-90"
            />
            <Label htmlFor={`filter-${spec.id}`} className="text-xs font-bold text-blue-900/70 cursor-pointer whitespace-nowrap">
              تصفية
            </Label>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors bg-gray-50 border border-gray-100"
            title="حذف المواصفة"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {spec.inFilter && (
        <div className="flex items-center gap-3 mt-1 pt-2 border-t border-dashed border-gray-200 animate-in fade-in slide-in-from-top-1">
          <Label className="text-xs font-medium text-gray-500 w-full sm:w-40 shrink-0">الاسم البرمجي (Slug)</Label>
          <div className="flex-1 w-full max-w-sm flex items-center relative group">
            <span className="absolute left-3 text-[11px] text-gray-400 font-mono select-none pointer-events-none group-focus-within:text-blue-500 transition-colors" dir="ltr">
              ?<span className="font-bold text-blue-600">{spec.filterSlug || ''}</span>=
            </span>
            <Input
              className="h-8 text-xs font-mono w-full bg-gray-50/50 focus:bg-white pl-[60px] text-left border-gray-200 focus-visible:ring-blue-500 transition-all font-semibold text-blue-800"
              placeholder="e.g. screen-size"
              dir="ltr"
              value={spec.filterSlug || ""}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                onUpdate("filterSlug", val);
              }}
            />
          </div>
          <p className="text-[10px] text-gray-400 hidden lg:block">سيظهر هكذا في الرابط لتكوين مسارات احترافية للـ SEO</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Global Filter State Key
// ────────────────────────────────────────────────────────────────
const GLOBAL_FILTER_STORAGE_KEY = "compusafe_default_filters";
const DEFAULT_GLOBAL_FILTERS = [
  "فئة المعالج",
  "الجيل",
  "الكرت المدمج",
  "حجم الشاشة",
  "كرت الشاشة",
  "حجم VRAM",
  "الكيس",
];

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────
export function SpecificationsEditor({
  category,
  specifications,
  onChange,
  features = [],
  onFeaturesChange,
}: SpecificationsEditorProps) {
  // Outer collapse state
  const [outerOpen, setOuterOpen] = useState(true);

  // Detect profile from category automatically, or allow manual override
  const autoProfileKey =
    Object.keys(PROFILES).find((k) => category?.toLowerCase().includes(k)) ?? null;

  const [manualProfileKey, setManualProfileKey] = useState<string | null>(null);
  const [showProfilePicker, setShowProfilePicker] = useState(false);

  // Resolved profile key: manual override takes precedence over auto
  const profileKey = manualProfileKey ?? autoProfileKey;
  const profile = profileKey ? PROFILES[profileKey] : null;

  // Read all existing products to map Slugs and Options dynamically
  const products = useStore((state) => state.products) || [];
  const { slugMap, optionsMap } = useMemo(() => {
    const sMap: Record<string, string> = {};
    const oMap: Record<string, Set<string>> = {};

    products.forEach(p => {
      if (p.specifications) {
        p.specifications.forEach(spec => {
          if (spec.key && spec.value) {
            if (!oMap[spec.key]) oMap[spec.key] = new Set();
            if (spec.value.trim() !== '') oMap[spec.key].add(spec.value.trim());
          }
          if (spec.inFilter && spec.key && spec.filterSlug) {
            sMap[spec.key] = spec.filterSlug;
          }
        });
      }
    });

    const formattedOMap: Record<string, string[]> = {};
    for (const k in oMap) {
      formattedOMap[k] = Array.from(oMap[k]).sort();
    }
    return { slugMap: sMap, optionsMap: formattedOMap };
  }, [products]);

  // ── Global Filter Keys ────────────────────────────────────────
  const [globalFilterKeys, setGlobalFilterKeys] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(GLOBAL_FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.includes("الكيس") && !localStorage.getItem("compusafe_filters_case_added")) {
          parsed.push("الكيس");
          localStorage.setItem("compusafe_filters_case_added", "true");
        }
        return parsed;
      }
    } catch (e) { }
    return DEFAULT_GLOBAL_FILTERS;
  });

  const updateGlobalFilterKeys = (newKeys: string[]) => {
    setGlobalFilterKeys(newKeys);
    localStorage.setItem(GLOBAL_FILTER_STORAGE_KEY, JSON.stringify(newKeys));
  };

  // ── helpers ──────────────────────────────────────────────────
  const addManualSpec = () => {
    onChange([
      ...specifications,
      { id: crypto.randomUUID(), key: "", value: "", inFilter: false },
    ]);
  };

  const applyProfile = (key?: string) => {
    const pk = key ?? profileKey;
    if (!pk) return;
    const prof = PROFILES[pk];
    const profileSpecs: SpecRow[] = prof.flatMap((section) =>
      section.specs.map((s) => ({
        id: crypto.randomUUID(),
        key: s.key,
        value: "",
        inFilter: globalFilterKeys.includes(s.key),
        filterSlug: slugMap[s.key] || "",
        isDropdown: false
      }))
    );
    const existingKeys = specifications.filter((s) => s.value.trim()).map((s) => s.key);
    const newKeys = profileSpecs.filter((s) => !existingKeys.includes(s.key));
    onChange([...specifications.filter((s) => s.value.trim()), ...newKeys]);
  };

  const clearAll = () => onChange([]);

  const updateSpec = (id: string, field: keyof Omit<SpecRow, 'id'>, val: string | boolean | undefined) => {
    const specToUpdate = specifications.find((s) => s.id === id);
    if (!specToUpdate) return;

    // Detect and apply smart slug mapping
    let autoSlug = specToUpdate.filterSlug;
    if (field === "key" && typeof val === "string") {
      if (slugMap[val]) autoSlug = slugMap[val];
    } else if (field === "inFilter" && val === true && !specToUpdate.filterSlug) {
      if (slugMap[specToUpdate.key]) autoSlug = slugMap[specToUpdate.key];
    }

    if (field === "inFilter") {
      let newGlobals = [...globalFilterKeys];
      if (val === true && !newGlobals.includes(specToUpdate.key)) {
        newGlobals.push(specToUpdate.key);
      } else if (val === false) {
        newGlobals = newGlobals.filter((k) => k !== specToUpdate.key);
      }
      updateGlobalFilterKeys(newGlobals);
    }

    onChange(specifications.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        [field]: val,
        filterSlug: field === 'filterSlug' ? (val as string) : autoSlug
      };
    }));
  };

  const removeSpec = (id: string) => {
    onChange(specifications.filter((s) => s.id !== id));
  };

  // ── Profile spec helpers ──────────────────────────────────────
  const handleProfileSpecChange = (
    sectionKey: string,
    field: "key" | "value" | "inFilter",
    value: string | boolean
  ) => {
    const existing = specifications.find((s) => s.key === sectionKey);
    if (existing) {
      updateSpec(existing.id, field, value);
    } else {
      let isFilterDefault = field === "inFilter" ? (value as boolean) : globalFilterKeys.includes(sectionKey);

      if (field === "inFilter") {
        let newGlobals = [...globalFilterKeys];
        if (value === true && !newGlobals.includes(sectionKey)) {
          newGlobals.push(sectionKey);
        } else if (value === false) {
          newGlobals = newGlobals.filter((k) => k !== sectionKey);
        }
        updateGlobalFilterKeys(newGlobals);

        onChange([
          ...specifications,
          { id: crypto.randomUUID(), key: sectionKey, value: "", inFilter: value as boolean, filterSlug: slugMap[sectionKey] || "" },
        ]);
      } else if (field === "value" && typeof value === "string" && value.trim()) {
        onChange([
          ...specifications,
          { id: crypto.randomUUID(), key: sectionKey, value, inFilter: isFilterDefault, filterSlug: slugMap[sectionKey] || "" },
        ]);
      }
    }
  };

  const handleProfileSpecRemove = (sectionKey: string) => {
    onChange(specifications.filter((s) => s.key !== sectionKey));
  };

  const getProfileValue = (key: string): SpecRow => {
    const found = specifications.find((s) => s.key === key);
    return found ?? { id: `ph-${key}`, key, value: "", inFilter: globalFilterKeys.includes(key), filterSlug: slugMap[key] || "" };
  };

  // specs NOT matched by any profile key
  const unprofiledSpecs = profile
    ? specifications.filter(
      (s) => !profile.flatMap((sec) => sec.specs.map((t) => t.key)).includes(s.key)
    )
    : specifications;

  // Count total filled specs
  const filledCount = specifications.filter((s) => s.value.trim()).length;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* ── Outer collapsible header ── */}
      <button
        type="button"
        onClick={() => setOuterOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-right"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold">المواصفات والخصائص (جدول التفاصيل)</span>
          {filledCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {filledCount} مواصفة
            </span>
          )}
          {profileKey && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROFILE_LABELS[profileKey].color}`}>
              {PROFILE_LABELS[profileKey].emoji} {PROFILE_LABELS[profileKey].label}
            </span>
          )}
        </div>
        {outerOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* ── Outer body ── */}
      {outerOpen && (
        <div className="border border-t-0 rounded-b-lg p-4 space-y-4 bg-card">

          {/* Profile picker + action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {/* Manual profile picker button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProfilePicker((v) => !v)}
                className="text-xs gap-1 border-dashed"
              >
                <LayoutTemplate className="h-3 w-3" />
                {profileKey
                  ? `البروفايل: ${PROFILE_LABELS[profileKey].emoji} ${PROFILE_LABELS[profileKey].label}`
                  : "اختر بروفايل"}
                <ChevronDown className="h-3 w-3" />
              </Button>



              {specifications.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3 ml-1" />
                  مسح الكل
                </Button>
              )}
            </div>
          </div>

          {/* Profile picker dropdown */}
          {showProfilePicker && (
            <div className="rounded-lg border bg-background p-3 shadow-md">
              <p className="text-xs font-semibold text-muted-foreground mb-2">اختر بروفايل الفئة:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(PROFILE_LABELS).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setManualProfileKey(key);
                      setShowProfilePicker(false);
                      applyProfile(key);
                    }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-semibold transition-all hover:scale-105
                      ${profileKey === key
                        ? `${info.color} border-current shadow-sm`
                        : "border-muted hover:border-primary/40 bg-muted/20 hover:bg-primary/5"
                      }`}
                  >
                    <span className="text-2xl">{info.emoji}</span>
                    <span>{info.label}</span>
                  </button>
                ))}
              </div>
              {manualProfileKey && (
                <button
                  type="button"
                  onClick={() => { setManualProfileKey(null); setShowProfilePicker(false); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  ✕ إلغاء اختيار البروفايل
                </button>
              )}
            </div>
          )}

          {/* Column labels */}
          {specifications.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span className="w-40 shrink-0">اسم الخاصية</span>
              <span className="flex-1">القيمة / التفاصيل</span>
              <span className="w-28 text-center">إظهار في التصفية</span>
              <span className="w-8" />
            </div>
          )}

          {/* Profile view */}
          {profile ? (
            <div className="space-y-1">
              {profile.map((section) => {
                const filledInSection = section.specs.filter((t) => {
                  const row = specifications.find((s) => s.key === t.key);
                  return row && row.value.trim();
                }).length;

                return (
                  <CollapsibleSection
                    key={section.title}
                    title={section.title}
                    icon={section.icon}
                    badge={
                      filledInSection > 0 ? (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {filledInSection}/{section.specs.length}
                        </span>
                      ) : undefined
                    }
                    defaultOpen={filledInSection > 0 || section === profile[0]}
                  >
                    {section.specs.map((tmpl) => {
                      const row = getProfileValue(tmpl.key);
                      return (
                        <SpecRowItem
                          key={tmpl.key}
                          spec={row}
                          keyReadOnly={true}
                          valuePlaceholder={tmpl.placeholder}
                          options={optionsMap[tmpl.key] || []}
                          onUpdate={(field, val) => handleProfileSpecChange(tmpl.key, field as any, val)}
                          onRemove={() => handleProfileSpecRemove(tmpl.key)}
                        />
                      );
                    })}

                    {/* Checkboxes for Display Features */}
                    {section.title === "الشاشة (Display)" && onFeaturesChange && (
                      <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                        <h4 className="text-[11px] font-bold text-blue-900 mb-3">مميزات الشاشة الإضافية (تستخدم للفلترة في المتجر)</h4>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { id: "touch", label: "تدعم اللمس" },
                            { id: "x360", label: "قابل للدوران (x360)" },
                            { id: "detachable", label: "قابل للفصل" },
                          ].map((feature) => (
                            <div key={feature.id} className="flex items-center space-x-2 space-x-reverse">
                              <Switch
                                id={`feature-${feature.id}`}
                                checked={(features || []).includes(feature.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    onFeaturesChange([...(features || []), feature.id]);
                                  } else {
                                    onFeaturesChange((features || []).filter(f => f !== feature.id));
                                  }
                                }}
                                className="scale-75"
                              />
                              <Label htmlFor={`feature-${feature.id}`} className="text-[11px] font-medium cursor-pointer">
                                {feature.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleSection>
                );
              })}

              {/* Unprofiled / extra manual specs */}
              {unprofiledSpecs.length > 0 && (
                <CollapsibleSection title="مواصفات إضافية أخرى" icon="package" defaultOpen={true}>
                  {unprofiledSpecs.map((spec) => (
                    <SpecRowItem
                      key={spec.id}
                      spec={spec}
                      valuePlaceholder="القيمة"
                      options={optionsMap[spec.key] || []}
                      onUpdate={(field, val) => updateSpec(spec.id, field, val)}
                      onRemove={() => removeSpec(spec.id)}
                    />
                  ))}
                </CollapsibleSection>
              )}
            </div>
          ) : (
            /* No profile – flat list */
            <div className="space-y-2">
              {specifications.length === 0 && (
                <div className="text-center py-8 border rounded-lg border-dashed space-y-2">
                  <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    اختر بروفايل لملء المواصفات تلقائياً، أو أضف صفوفاً يدوياً
                  </p>
                </div>
              )}
              {specifications.map((spec) => (
                <SpecRowItem
                  key={spec.id}
                  spec={spec}
                  options={optionsMap[spec.key] || []}
                  onUpdate={(field, val) => updateSpec(spec.id, field, val)}
                  onRemove={() => removeSpec(spec.id)}
                />
              ))}
            </div>
          )}

          {/* Add more button at bottom */}
          <Button
            type="button"
            variant="outline"
            onClick={addManualSpec}
            className="w-full border-dashed text-sm"
          >
            <PlusCircle className="h-4 w-4 ml-2" />
            إضافة صف جديد للجدول
          </Button>
        </div>
      )}
    </div>
  );
}
