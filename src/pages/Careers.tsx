import React from "react";
import { motion } from "framer-motion";
import { FaWhatsapp, FaTruck, FaStore } from "react-icons/fa";
import { Navbar } from "@/components/Navbar";
import { Topbar } from "@/components/Topbar";
import Footer from "@/components/Footer";

export default function Careers() {
  const handleWhatsApp = (type: "product" | "wholesale" | "delivery") => {
    const phoneNumber = "01080027827";
    let message = "";

    switch (type) {
      case "product":
        message = "مرحباً، أنا مهتم بإضافة منتجاتي إلى المتجر";
        break;
      case "wholesale":
        message = "مرحباً، أنا مهتم بالعمل كتاجر جملة مع المتجر";
        break;
      case "delivery":
        message = "مرحباً، أنا مهتم بالعمل كموصل طلبات مع المتجر";
        break;
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-primary/5 py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">انضم إلى فريق المرج</h1>
              <p className="text-lg text-muted-foreground">
                سواء كنت تاجر أو معاك تروسكل وبتوصل اوردر أو ممكن توصل على رجلك،
                احنا بنبحث عن ناس موثوق فيها للانضمام لفريقنا
              </p>
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="container py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">
              متطلبات الانضمام
            </h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="space-y-8">
                {/* متطلبات التجار */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaStore className="text-primary" />
                    متطلبات التجار
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mr-4">
                    <li>يجب أن يكون لديك محل أو مصنع أو مخزن خاص بك</li>
                    <li>
                      سيتم إضافة عنوان المحل/المصنع/المخزن في المتجر لزيادة
                      الموثوقية
                    </li>
                    <li>يجب أن تكون الأسعار تنافسية في السوق</li>
                  </ul>
                </div>

                {/* متطلبات الموصلين */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaTruck className="text-primary" />
                    متطلبات الموصلين
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mr-4">
                    <li>
                      يجب أن يكون لديك وسيلة نقل مناسبة (تروسكل، توكتوك، عربية،
                      موتوسكل)
                    </li>
                    <li>
                      متاح التوصيل مشيا علي الاقدام في حاله كان المكان قريب
                      والحموله خفيفه
                    </li>
                    <li>سيتم محاسبتك حسب كل مشوار تقوم به من الزبون</li>
                    <li>يجب أن تكون على دراية بمناطق المرج جيداً</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Positions */}
        <div className="container py-12 bg-primary/5">
          <h2 className="text-3xl font-bold mb-8 text-center">
            الوظائف المتاحة
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex items-center mb-4">
                <FaTruck className="text-4xl text-primary ml-4" />
                <h3 className="text-2xl font-semibold">موصلين طلبات</h3>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  يشترط وجود وسيلة نقل (تروسكل أو توكتوك) متاح التوصيل مشياً
                  للمسافات القصيره و الحموله الخفيفه
                </p>
                <button
                  onClick={() => handleWhatsApp("delivery")}
                  className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <FaWhatsapp className="text-xl" />
                  تواصل معنا للعمل كموصل طلبات
                </button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex items-center mb-4">
                <FaStore className="text-4xl text-primary ml-4" />
                <h3 className="text-2xl font-semibold">تجار جملة</h3>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  يشترط أن تكون الأسعار تنافسية وأن يكون لديك معرض أو محل أو
                  مخزن وسيتم تصوير المكان وعرضه لزيادة الموثوقية
                </p>
                <button
                  onClick={() => handleWhatsApp("wholesale")}
                  className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <FaWhatsapp className="text-xl" />
                  تواصل معنا كتاجر جملة
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
