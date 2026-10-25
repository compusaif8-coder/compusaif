import { Cpu, Monitor, Keyboard, Package, Zap } from "lucide-react";

// ────────────────────────────────────────────────────────────────
// Same profile structure as SpecificationsEditor
// ────────────────────────────────────────────────────────────────
type SectionTemplate = { title: string; icon: string; keys: string[] };

const LAPTOP_SECTIONS: SectionTemplate[] = [
  { title: "المعالج (Processor)", icon: "cpu", keys: ["المعالج", "فئة المعالج", "حرف المعالج", "الجيل", "عدد الأنوية", "عدد المسارات", "التردد الأساسي", "أقصى تردد", "الكاش", "الكرت المدمج", "كارت الشاشة المدمج"] },
  { title: "الذاكرة والتخزين", icon: "package", keys: ["الرامات", "سرعة الرامات", "التخزين", "فتحة توسعة"] },
  { title: "الشاشة (Display)", icon: "monitor", keys: ["حجم الشاشة", "دقة الشاشة", "معدل التحديث", "نوع الشاشة", "سطوع الشاشة"] },
  { title: "كرت الشاشة (GPU)", icon: "zap", keys: ["كرت الشاشة", "حجم VRAM", "نوع VRAM"] },
  { title: "المواصفات العامة", icon: "package", keys: ["البطارية", "نظام التشغيل", "الوزن", "لوحة المفاتيح", "المنافذ", "الواي فاي", "البلوتوث"] },
];

const DESKTOP_SECTIONS: SectionTemplate[] = [
  { title: "المعالج (Processor)", icon: "cpu", keys: ["المعالج", "فئة المعالج", "حرف المعالج", "الجيل", "عدد الأنوية", "عدد المسارات", "التردد الأساسي", "أقصى تردد", "الكاش", "الكرت المدمج", "كارت الشاشة المدمج"] },
  { title: "كرت الشاشة (GPU)", icon: "zap", keys: ["كرت الشاشة", "حجم VRAM", "نوع VRAM"] },
  { title: "الذاكرة والتخزين", icon: "package", keys: ["الرامات", "سرعة الرامات", "أماكن الرامات", "أنواع التخزين", "أماكن التخزين"] },
  { title: "اللوحة الأم والطاقة", icon: "cpu", keys: ["اللوحة الأم", "مصدر الطاقة", "الكيس"] },
  { title: "المواصفات العامة", icon: "package", keys: ["نظام التشغيل", "المنافذ الأمامية", "المنافذ الخلفية"] },
];

const MONITOR_SECTIONS: SectionTemplate[] = [
  { title: "الشاشة (Display)", icon: "monitor", keys: ["حجم الشاشة", "دقة الشاشة", "معدل التحديث", "زمن الاستجابة", "نوع اللوح", "السطوع", "نسبة التباين", "تغطية sRGB"] },
  { title: "المنافذ والتوصيلات", icon: "zap", keys: ["DisplayPort", "HDMI", "USB Hub", "مقبس الصوت"] },
  { title: "المواصفات العامة", icon: "package", keys: ["تقنية Sync", "HDR", "الحامل", "VESA", "استهلاك الطاقة"] },
];

const ACCESSORIES_SECTIONS: SectionTemplate[] = [
  { title: "المواصفات الأساسية", icon: "keyboard", keys: ["النوع", "التوصيل", "المدى"] },
  { title: "مواصفات إضافية", icon: "package", keys: ["البطارية", "التوافق", "الأبعاد", "الوزن", "ضمان"] },
];

const PROFILE_SECTIONS: Record<string, SectionTemplate[]> = {
  laptop: LAPTOP_SECTIONS,
  desktop: DESKTOP_SECTIONS,
  monitor: MONITOR_SECTIONS,
  accessories: ACCESSORIES_SECTIONS,
};

// Section icon colours
const ICON_COLORS: Record<string, string> = {
  cpu: "bg-blue-100 text-blue-600",
  monitor: "bg-green-100 text-green-600",
  zap: "bg-yellow-100 text-yellow-600",
  keyboard: "bg-orange-100 text-orange-600",
  package: "bg-purple-100 text-purple-600",
};

function SectionIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = `h-5 w-5 ${className ?? ""}`;
  if (icon === "cpu") return <Cpu className={cls} />;
  if (icon === "monitor") return <Monitor className={cls} />;
  if (icon === "keyboard") return <Keyboard className={cls} />;
  if (icon === "zap") return <Zap className={cls} />;
  return <Package className={cls} />;
}

// ────────────────────────────────────────────────────────────────
// Sub-component: one collapsible section card
// ────────────────────────────────────────────────────────────────
function SpecSection({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: string;
  rows: { key: string; value: string }[];
}) {
  const colorClass = ICON_COLORS[icon] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <SectionIcon icon={icon} />
        </div>
        <span className="text-base font-bold text-gray-800">{title}</span>
        <span className="text-xs text-gray-400 font-normal">({rows.length} مواصفة)</span>
      </div>

      {/* Body - always visible */}
      <table className="w-full text-sm sm:text-base text-right">
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={row.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
              <td className="py-3 px-5 font-semibold text-gray-600 w-2/5 align-top border-l border-gray-100">
                {row.key}
              </td>
              <td className="py-3 px-5 text-gray-900 font-medium leading-relaxed">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Helper to apply suffix
// ────────────────────────────────────────────────────────────────
function formatSpecValue(key: string, val: string) {
  const trimmed = val.trim();
  if (!trimmed) return trimmed;
  const isNumber = /^[\d.,]+$/.test(trimmed);
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
    const suffix = suffixes[key];
    if (suffix) return `${trimmed} ${suffix}`;
  }
  return trimmed;
}

// ────────────────────────────────────────────────────────────────
// Main exported component
// ────────────────────────────────────────────────────────────────
interface SpecsDisplayProps {
  category: string;
  specifications: { id?: string; key?: string; value?: string; inFilter?: boolean }[];
}

export function SpecsDisplay({ category, specifications }: SpecsDisplayProps) {
  // Filter to only specs that have both key and value
  const validSpecs = specifications.filter(
    (s): s is { id?: string; key: string; value: string; inFilter?: boolean } =>
      !!s.key && !!s.value
  );

  // Match a profile
  const profileKey =
    Object.keys(PROFILE_SECTIONS).find((k) => category?.toLowerCase().includes(k)) ?? null;
  const sections = profileKey ? PROFILE_SECTIONS[profileKey] : null;

  // Build a quick lookup map for specs
  const specMap = new Map(validSpecs.map((s) => [s.key, s.value]));

  if (!sections) {
    // No profile – flat table
    return (
      <div className=" border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm sm:text-base text-right">
          <tbody className="divide-y divide-gray-100">
            {validSpecs.map((spec, i) => (
              <tr key={spec.id ?? spec.key} className={i % 2 === 0 ? "bg-gray-50/50" : "bg-white"}>
                <td className="py-4 px-6 font-semibold text-gray-700 w-2/5 align-top border-l border-gray-100 bg-gray-50/30">
                  {spec.key}
                </td>
                <td className="py-4 px-6 text-gray-900 leading-relaxed font-medium">
                  {formatSpecValue(spec.key, spec.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Track which spec keys we've placed in a section
  const placed = new Set<string>();

  const sectionBlocks = sections
    .map((section) => {
      const rows = section.keys
        .filter((k) => specMap.has(k))
        .map((k) => {
          placed.add(k);
          return { key: k, value: formatSpecValue(k, specMap.get(k)!) };
        });
      return { ...section, rows };
    })
    .filter((s) => s.rows.length > 0);

  // Remaining specs not matched by any section
  const extraRows = validSpecs.filter((s) => !placed.has(s.key));

  return (
    <div className="space-y-4">
      {sectionBlocks.map((section) => (
        <SpecSection
          key={section.title}
          title={section.title}
          icon={section.icon}
          rows={section.rows}
        />
      ))}

      {/* Extra / unprofiled specs */}
      {extraRows.length > 0 && (
        <SpecSection
          title="مواصفات إضافية"
          icon="package"
          rows={extraRows.map((s) => ({ key: s.key, value: formatSpecValue(s.key, s.value) }))}
        />
      )}
    </div>
  );
}
