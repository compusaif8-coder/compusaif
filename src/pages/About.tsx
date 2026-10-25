import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaWhatsapp,
  FaShieldAlt,
  FaBatteryFull,
  FaExchangeAlt,
  FaPhone,
  FaStore,
  FaAward,
  FaCheckCircle,
  FaStar,
  FaLaptop,
  FaDesktop,
  FaTv,
  FaHeadphones,
  FaMapMarkerAlt,
} from "react-icons/fa";
import Footer from "@/components/Footer";
import { STORE_OWNER, STORE_CONFIG } from "@/constants/store";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

/* ─── animation helpers ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

/* ─── data ─── */
const warrantyFeatures = [
  {
    icon: FaShieldAlt,
    title: "ضمان 6 شهور",
    description: "على جميع المنتجات ضد عيوب الصناعة",
    iconColor: "#3B82F6",
    bgColor: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.3)",
  },
  {
    icon: FaBatteryFull,
    title: "ضمان شهر",
    description: "على البطاريات والشواحن والهاردات",
    iconColor: "#10B981",
    bgColor: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  {
    icon: FaExchangeAlt,
    title: "أسبوع استبدال",
    description: "على جميع المنتجات بدون أي شروط",
    iconColor: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.15)",
    borderColor: "rgba(139,92,246,0.3)",
  },
];

const whyUs = [
  {
    id: "importer",
    icon: FaStar,
    label: "من المستورد المباشر",
    desc: "أسعار تنافسية لأننا المستوردون، مع توفر أسعار خاصة جداً للتجار.",
    color: "#F59E0B",
  },
  {
    id: "original",
    icon: FaCheckCircle,
    label: "أصلي 100%",
    desc: "جميع المنتجات والمكونات الداخلية أصلية بالكامل ولم يتم تعديلها.",
    color: "#10B981",
  },
  {
    id: "products",
    icon: FaLaptop,
    label: "منتجات متكاملة",
    desc: "لابتوبات، أجهزة ديسك توب، وشاشات لتلبية كافة احتياجاتكم التقنية.",
    color: "#3B82F6",
  },
];

const productCategories = [
  { icon: FaLaptop, label: "لابتوبات" },
  { icon: FaDesktop, label: "PC أجهزة" },
  { icon: FaTv, label: "شاشات" },
  { icon: FaHeadphones, label: "اكسسوارات" },
];

/* ─── component ─── */
export default function About() {
  const { t } = useTranslation();
  const { settings } = useSiteSettings();

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("مرحباً، أريد الاستفسار عن المنتجات المتاحة");
    window.open(`https://wa.me/${STORE_OWNER.whatsapp}?text=${message}`, "_blank");
  };

  const handlePhoneClick = () => {
    window.open(`tel:${STORE_OWNER.phone}`, "_self");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f0f4ff", fontFamily: "'Cairo', sans-serif" }}
    >
      <main className="flex-1">

        {/* ══ HERO ══ */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a2463 0%, #1e4db7 50%, #3B82F6 100%)",
            minHeight: 480,
          }}
        >
          {/* decorative circles */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 500, height: 500, top: -180, right: -180, background: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 300, height: 300, bottom: -120, left: -80, background: "rgba(255,255,255,0.05)" }}
          />
          {/* diagonal bottom slash */}
          <div
            className="absolute bottom-0 left-0 w-full pointer-events-none"
            style={{ height: 80, background: "#f0f4ff", clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
          />

          <div className="container relative z-10 py-20 md:py-28">
            <div className="flex flex-col md:flex-row items-center gap-10">

              {/* left – brand info */}
              <motion.div className="flex-1 text-center md:text-right" {...fadeUp(0)}>
                <div className="flex justify-center md:justify-start mb-6">
                  <div
                    className="rounded-2xl p-4 flex items-center justify-center"
                    style={{
                      background: "rgba(255, 255, 255, 0.91)",
                      backdropFilter: "blur(12px)",
                      border: "1.5px solid rgba(255, 255, 255, 0.7)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    }}
                  >
                    <img
                      src={settings.logoUrl || "/logo.png"}
                      alt={settings.storeName}
                      className="h-20 md:h-28 w-auto object-contain"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                    />
                  </div>
                </div>

                <motion.h1
                  className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight"
                  {...fadeUp(0.1)}
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
                >
                  {settings.storeName || "COMPU SAIF"}
                </motion.h1>

                <motion.p
                  className="text-blue-100 text-lg md:text-xl mb-2 font-semibold"
                  {...fadeUp(0.18)}
                >
                  {settings.aboutPage?.heroSubtitle || "أجهزة استيراد أمريكي أوريجينال بالكامل"}
                </motion.p>
                <motion.p
                  className="text-blue-200 text-base mb-8 max-w-lg mx-auto md:mx-0"
                  {...fadeUp(0.24)}
                >
                  {settings.aboutPage?.heroDescription || "مع كومبيوسيف أنت دايما في الأمان"}
                </motion.p>

                <motion.div
                  className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
                  {...fadeUp(0.3)}
                >
                  <button
                    onClick={handleWhatsAppClick}
                    className="flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-full transition-all duration-300 hover:scale-105"
                    style={{
                      background: "#25D366",
                      color: "#fff",
                      boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
                      border: "none",
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                  >
                    <FaWhatsapp size={20} />
                    تواصل عبر واتساب
                  </button>
                  <button
                    onClick={handlePhoneClick}
                    className="flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-full transition-all duration-300 hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      color: "#fff",
                      border: "2px solid rgba(255,255,255,0.5)",
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                  >
                    <FaPhone size={16} />
                    {STORE_OWNER.phone}
                  </button>
                </motion.div>
              </motion.div>

              {/* right – product category badges */}
              <motion.div className="flex-shrink-0 grid grid-cols-2 gap-4" {...scaleIn(0.2)}>
                {productCategories.map((cat, i) => (
                  <motion.div
                    key={i}
                    {...scaleIn(0.25 + i * 0.07)}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl"
                    style={{
                      width: 110,
                      height: 110,
                      background: "rgba(255,255,255,0.12)",
                      backdropFilter: "blur(10px)",
                      border: "1.5px solid rgba(255,255,255,0.25)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      cursor: "default",
                    }}
                    whileHover={{ scale: 1.08, background: "rgba(255,255,255,0.22)" } as any}
                  >
                    <cat.icon size={30} color="#fff" />
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{cat.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══ STATS BAR ══ */}
        <section style={{ background: "#fff" }}>
          <div className="container">
            <div className="grid grid-cols-3" style={{ borderBottom: "1px solid #e5eaf5" }}>
              {[
                { value: settings.aboutPage?.stats?.experience || "5+", label: "سنوات خبرة", color: "#3B82F6" },
                { value: settings.aboutPage?.stats?.sold || "1000+", label: "لابتوب مباع", color: "#10B981" },
                { value: settings.aboutPage?.stats?.satisfaction || "100%", label: "رضا العملاء", color: "#F59E0B" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(0.05 + i * 0.08)}
                  className="text-center py-7 px-4"
                  style={{ borderLeft: i < 2 ? "1px solid #e5eaf5" : undefined }}
                >
                  <p className="text-3xl md:text-4xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-sm font-semibold" style={{ color: "#64748b" }}>{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ IMAGE BANNER ══ */}
        <section className="container py-14">
          <motion.div
            {...fadeUp(0.1)}
            className="relative rounded-3xl overflow-hidden group"
            style={{
              boxShadow: "0 20px 60px rgba(30,77,183,0.18)",
              border: "2px solid rgba(59,130,246,0.2)",
            }}
          >
            <img
              src="/img2.png"
              alt={settings.storeName}
              className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-[1.01]"
            />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(10,36,99,0.12), transparent)" }}
            />
          </motion.div>
        </section>

        {/* ══ ABOUT CARDS ══ */}
        <section className="container pb-14">
          <motion.div
            className={`grid ${settings.isImporter !== false ? "md:grid-cols-2" : "md:grid-cols-1 max-w-2xl mx-auto"} gap-6`}
            {...fadeUp(0.1)}
          >
            {settings.isImporter !== false && (
              <div
                className="rounded-2xl p-7 hover:-translate-y-1 transition-all duration-300 group"
                style={{
                  background: "#fff",
                  border: "1.5px solid rgba(59,130,246,0.18)",
                  boxShadow: "0 4px 24px rgba(59,130,246,0.09)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: "rgba(59,130,246,0.1)" }}
                  >
                    <FaStore size={26} color="#3B82F6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2" style={{ color: "#0a2463" }}>
                      من المستورد إليك مباشرةً
                    </h3>
                    <p className="leading-relaxed text-sm" style={{ color: "#64748b" }}>
                      نحن لا نتعامل مع وسطاء! نضمن لك الحصول على جهازك من المستورد مباشرة بأقل سعر في السوق. ويتوفر لدينا{" "}
                      <span className="font-bold" style={{ color: "#3B82F6" }}>أسعار خاصة ومميزة جداً للتجار والموزعين</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div
              className="rounded-2xl p-7 hover:-translate-y-1 transition-all duration-300 group"
              style={{
                background: "#fff",
                border: "1.5px solid rgba(16,185,129,0.18)",
                boxShadow: "0 4px 24px rgba(16,185,129,0.09)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: "rgba(16,185,129,0.1)" }}
                >
                  <FaCheckCircle size={26} color="#10B981" />
                </div>
                <div>
                  <h3 className="text-xl font-black mb-2" style={{ color: "#0a2463" }}>
                    مكونات أصلية 100%
                  </h3>
                  <p className="leading-relaxed text-sm" style={{ color: "#64748b" }}>
                    نتعهد بأن جميع الأجهزة (لابتوب - ديسك توب - شاشات) تأتي بحالتها الأصلية وبالمكونات الداخلية كما خرجت من المصنع (Original)، لتضمن أعلى أداء وعمر افتراضي طويل.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ══ WARRANTY ══ */}
        <section
          className="py-20"
          style={{ background: "linear-gradient(135deg, #0a2463 0%, #1e4db7 60%, #3B82F6 100%)" }}
        >
          <div className="container">
            <motion.div className="text-center mb-14" {...fadeUp(0.05)}>
              <div className="flex items-center justify-center gap-3 mb-3">
                <FaAward size={32} color="#F59E0B" />
                <h2 className="text-3xl md:text-4xl font-black text-white">ضماناتنا</h2>
              </div>
              <p style={{ color: "rgba(255,255,255,0.75)" }} className="text-base max-w-md mx-auto">
                نقدم ضمانات شاملة على جميع منتجاتنا لضمان رضاكم التام
              </p>
              <div className="mx-auto mt-4 rounded-full" style={{ width: 60, height: 4, background: "#F59E0B" }} />
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {warrantyFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  {...fadeUp(0.1 + index * 0.1)}
                  className="text-center rounded-2xl p-8 group hover:-translate-y-2 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(16px)",
                    border: `1.5px solid ${feature.borderColor}`,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    cursor: "default",
                  }}
                >
                  <div
                    className="inline-flex p-4 rounded-2xl mb-5 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: feature.bgColor }}
                  >
                    <feature.icon size={36} color={feature.iconColor} />
                  </div>
                  <h3 className="text-xl font-black text-white mb-3">{feature.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.75)" }} className="text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ WHY US ══ */}
        <section className="container py-20">
          <motion.div className="text-center mb-12" {...fadeUp(0.05)}>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "#0a2463" }}>
              لماذا تختارنا؟
            </h2>
            <div
              className="mx-auto rounded-full"
              style={{ width: 60, height: 4, background: "linear-gradient(90deg,#3B82F6,#1e4db7)" }}
            />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {whyUs
              .filter((item) => settings.isImporter !== false || item.id !== "importer")
              .map((item, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(0.1 + i * 0.1)}
                  className="flex flex-col items-center text-center p-8 rounded-2xl group hover:-translate-y-2 transition-all duration-300"
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${item.color}30`,
                    boxShadow: `0 4px 24px ${item.color}15`,
                    cursor: "default",
                  }}
                >
                  <div
                    className="p-4 rounded-2xl mb-5 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: `${item.color}15` }}
                  >
                    <item.icon size={30} color={item.color} />
                  </div>
                  <h4 className="font-black text-lg mb-2" style={{ color: "#0a2463" }}>{item.label}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{item.desc}</p>
                </motion.div>
              ))}
          </div>
        </section>



        {/* ══ CONTACT ══ */}
        <section
          className="py-20 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0a2463 0%, #1e4db7 55%, #3B82F6 100%)" }}
        >
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 350, height: 350, top: -140, right: -100, background: "rgba(255,255,255,0.05)" }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 250, height: 250, bottom: -80, left: -60, background: "rgba(255,255,255,0.05)" }}
          />

          <div className="container relative z-10">
            <motion.div className="max-w-3xl mx-auto" {...fadeUp(0.05)}>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-white mb-3">تواصل معنا</h2>
                <p style={{ color: "rgba(255,255,255,0.75)" }}>
                  نحن هنا لخدمتكم وتقديم أفضل المنتجات بأفضل الأسعار
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* WhatsApp */}
                <motion.div
                  {...scaleIn(0.1)}
                  className="rounded-2xl p-8 text-center group hover:-translate-y-1 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(16px)",
                    border: "1.5px solid rgba(255,255,255,0.2)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  }}
                >
                  <div
                    className="inline-flex p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: "rgba(37,211,102,0.2)" }}
                  >
                    <FaWhatsapp size={34} color="#25D366" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">واتساب</h3>
                  <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
                    تواصل معنا عبر واتساب للحصول على استشارة مجانية
                  </p>
                  <button
                    onClick={handleWhatsAppClick}
                    className="w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105"
                    style={{
                      background: "#25D366",
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 4px 20px rgba(37,211,102,0.35)",
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    <FaWhatsapp size={18} />
                    تواصل عبر واتساب
                  </button>
                </motion.div>

                {/* Phone */}
                <motion.div
                  {...scaleIn(0.18)}
                  className="rounded-2xl p-8 text-center group hover:-translate-y-1 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(16px)",
                    border: "1.5px solid rgba(255,255,255,0.2)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  }}
                >
                  <div
                    className="inline-flex p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  >
                    <FaPhone size={32} color="#fff" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">اتصال مباشر</h3>
                  <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
                    اتصل بنا مباشرة للحصول على المساعدة الفورية
                  </p>
                  <button
                    onClick={handlePhoneClick}
                    className="w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      color: "#fff",
                      border: "2px solid rgba(255,255,255,0.5)",
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    <FaPhone size={16} />
                    {STORE_OWNER.phone}
                  </button>
                </motion.div>
              </div>


            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
