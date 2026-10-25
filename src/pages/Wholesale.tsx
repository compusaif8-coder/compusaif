import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Store,
  Users,
  CheckCircle2,
  Laptop,
  Briefcase,
  UserCheck,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaWhatsapp } from "react-icons/fa";
import { STORE_WHATSAPP } from "@/constants/store";
import Footer from "@/components/Footer";
import { SEOHelmet } from "@/components/SEOHelmet";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay },
});

export default function Wholesale() {
  const { settings } = useSiteSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    governorate: "",
    deviceType: "لابتوب مكتبي",
    quantity: "أقل من 5",
    details: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // محاكاة إرسال البيانات وإظهار رسالة النجاح
    setTimeout(() => {
      // إعداد رسالة الواتس اب
      const text = `*طلب توريد / جملة جديد* 📦
      
👤 *الاسم:* ${formData.name}
📱 *الهاتف:* ${formData.phone}
🏢 *الشركة/المتجر:* ${formData.company || "لم يحدد"}
📍 *المحافظة:* ${formData.governorate}
💻 *نوع الأجهزة المطلوبة:* ${formData.deviceType}
🔢 *الكمية التقريبية:* ${formData.quantity}
📝 *تفاصيل إضافية:* 
${formData.details || "لا يوجد"}`;

      const encodedText = encodeURIComponent(text);
      const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodedText}`;

      setIsSubmitting(false);
      setIsSuccess(true);

      // فتح الواتساب في نافذة جديدة
      window.open(whatsappUrl, "_blank");

      // إخفاء رسالة النجاح بعد فترة
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          name: "",
          phone: "",
          company: "",
          governorate: "",
          deviceType: "لابتوب مكتبي",
          quantity: "أقل من 5",
          details: ""
        });
      }, 8000);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/40">
      <SEOHelmet
        title="توريدات وجملة أجهزة الجملة بأسعار تنافسية | كومبيو سيف"
        description="نوفر خدمات توريد أجهزة اللابتوب والكمبيوتر للشركات والمتاجر في جميع أنحاء مصر من خلال استيراد مباشر من أمريكا بأسعار تنافسية غير مسبوقة."
      />

      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary/90 to-secondary/90 py-20 md:py-28 text-white">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="container relative z-10 text-center px-4">
            <motion.div {...fadeUp(0)} className="max-w-4xl mx-auto">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-accent font-medium text-sm mb-6 shadow-sm">
                <Briefcase className="w-4 h-4" /> قسم التوريدات للشركات والتجار
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 drop-shadow-lg text-white">
                توريدات وجملة أجهزة لابتوب <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white">{settings.wholesalePage.heroTitle}</span>
              </h1>
              <p className="text-white/80 text-lg sm:text-xl leading-relaxed max-w-3xl mx-auto drop-shadow-md">
                {settings.wholesalePage.heroSubtitle}
              </p>
            </motion.div>
          </div>
        </section>




        {/* ── Wholesale Form Section ── */}
        <section className="py-20 bg-gray-100/50 border-t border-gray-200">
          <div className="container max-w-3xl">
            <motion.div {...fadeUp(0.4)} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

              {/* Form Header */}
              <div className="bg-gradient-to-r from-primary to-secondary p-8 text-center text-primary-foreground">
                <h2 className="text-3xl font-bold mb-3">{settings.wholesalePage.formTitle}</h2>
                <p className="text-primary-foreground/80 text-sm md:text-base max-w-lg mx-auto">
                  {settings.wholesalePage.formSubtitle}
                </p>
              </div>

              {/* The Form */}
              <div className="p-6 md:p-10">
                {isSuccess ? (
                  <div className="text-center py-10">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">تم الاستلام بنجاح!</h3>
                    <p className="text-gray-600 text-lg">
                      تم استلام طلبك بنجاح، وسيتم التواصل معك من قبل فريق كومبيوسيف خلال وقت قصير.
                    </p>
                    <Button
                      onClick={() => setIsSuccess(false)}
                      variant="outline"
                      className="mt-8 rounded-full border-2 border-gray-200"
                    >
                      إرسال طلب آخر
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">الاسم بالكامل <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="name"
                          required
                          onChange={handleChange}
                          value={formData.name}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                          placeholder="الاسم الثلاثي"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">رقم الهاتف <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          onChange={handleChange}
                          value={formData.phone}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                          placeholder="مثال: 01012345678"
                        />
                      </div>

                      {/* Company Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">اسم الشركة أو المتجر <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input
                          type="text"
                          name="company"
                          onChange={handleChange}
                          value={formData.company}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                          placeholder="اسم الكيان التجاري"
                        />
                      </div>

                      {/* Governorate */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">المحافظة <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="governorate"
                          required
                          onChange={handleChange}
                          value={formData.governorate}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                          placeholder="محافظتك"
                        />
                      </div>

                      {/* Device Type */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">نوع الأجهزة المطلوبة <span className="text-red-500">*</span></label>
                        <select
                          name="deviceType"
                          required
                          onChange={handleChange}
                          value={formData.deviceType}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        >
                          <option value="لابتوب مكتبي">لابتوب مكتبي</option>
                          <option value="أجهزة طلاب">أجهزة طلاب</option>
                          <option value="أجهزة جرافيك">أجهزة جرافيك وإلترا بوك</option>
                          <option value="غير ذلك">غير ذلك</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">الكمية التقريبية <span className="text-red-500">*</span></label>
                        <select
                          name="quantity"
                          required
                          onChange={handleChange}
                          value={formData.quantity}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        >
                          <option value="أقل من 5">أقل من 5 أجهزة</option>
                          <option value="من 5 إلى 20">من 5 إلى 20 جهاز</option>
                          <option value="أكثر من 20">أكثر من 20 جهاز</option>
                        </select>
                      </div>
                    </div>

                    {/* Additional details */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">تفاصيل إضافية <span className="text-gray-400 font-normal">(اختياري)</span></label>
                      <textarea
                        name="details"
                        rows={4}
                        onChange={handleChange}
                        value={formData.details}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                        placeholder="اذكر أي مواصفات أو ملاحظات خاصة بطلبك..."
                      />
                    </div>

                    <Button
                      disabled={isSubmitting}
                      type="submit"
                      className="w-full py-6 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 gap-3 disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          جاري الإرسال...
                        </div>
                      ) : (
                        <>
                          إرسال طلب التوريد
                          <Send className="w-5 h-5 rtl:rotate-180" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-gray-500 mt-4">
                      بالضغط على "إرسال" سيتم إعادة توجيهك إلى واتس اب لإكمال الطلب مباشرة مع فريق المبيعات.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </section>


        {/* ── Target Audience ── */}
        <section className="py-12 bg-white border-b border-gray-100 shadow-sm relative z-20 -mt-6 rounded-t-[2.5rem] mx-2 sm:mx-0">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">تم التعامل مع نخبة من:</h2>
              <div className="w-16 h-1 bg-primary rounded-full mx-auto opacity-50" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
              {[
                { icon: Building2, title: "شركات ومؤسسات", color: "text-blue-600", bg: "bg-blue-50" },
                { icon: Store, title: "محلات بيع الأجهزة الإلكترونية", color: "text-indigo-600", bg: "bg-indigo-50" },
                { icon: Users, title: "تجار الجملة والموزعين", color: "text-cyan-600", bg: "bg-cyan-50" }
              ].map((item, i) => (
                <motion.div key={i} {...fadeUp(0.1 + (i * 0.1))} className="flex flex-col items-center p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className={`p-4 rounded-full ${item.bg} mb-4`}>
                    <item.icon className={`w-8 h-8 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-800">{item.title}</h3>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-gray-600 font-medium max-w-2xl mx-auto">
              ونقدم حلول توريد مرنة تناسب احتياجات كل عميل سواء في الكميات أو المواصفات أو الميزانية.
            </p>
          </div>
        </section>

        {/* ── Why Choose Us & What We Offer ── */}
        <section className="py-20">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">

              {/* Why Us Column */}
              <motion.div {...fadeUp(0.2)}>
                <h2 className="text-3xl font-bold text-gray-900 mb-8 inline-flex items-center gap-3">
                  <span className="text-primary">لماذا تختار</span> {settings.storeName}؟
                </h2>
                <div className="space-y-4">
                  {[
                    "استيراد مباشر من أمريكا بدون وسطاء",
                    "أجهزة أصلية ومجربة قبل التسليم",
                    "أسعار خاصة للكميات والجملة",
                    "توفير موديلات مختلفة حسب الطلب",
                    "إمكانية التوريد بشكل دوري ومنتظم"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="mt-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <p className="font-bold text-gray-700 text-lg">{feature}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* What We Offer Column */}
              <motion.div {...fadeUp(0.3)}>
                <h2 className="text-3xl font-bold text-gray-900 mb-8 inline-flex items-center gap-3">
                  ماذا يمكنك طلبه من خلالنا؟
                </h2>
                <div className="grid gap-4 mb-6">
                  {[
                    { title: "لابتوبات استيراد بحالة ممتازة", icon: Laptop },
                    { title: "أجهزة مناسبة للشركات والأعمال المكتبية", icon: Briefcase },
                    { title: "أجهزة مخصصة للموظفين أو الاستخدام الشخصي بكميات", icon: UserCheck }
                  ].map((offer, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-l from-primary/10 to-transparent border border-primary/20 border-l-4 border-l-primary">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <offer.icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-bold text-gray-800 text-lg">{offer.title}</p>
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-xl bg-accent/20 border border-accent/40 text-gray-800 font-medium">
                  ✨ كما يمكننا تجهيز عروض مخصصة حسب طبيعة نشاط شركتك أو متجرك.
                </div>
              </motion.div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
