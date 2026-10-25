import React from "react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Topbar } from "@/components/Topbar";
import { useTranslation } from "react-i18next";
import { Phone, MessageCircle } from "lucide-react";

const deliveryPersonnel = [
  {
    id: 1,
    name: "أحمد محمد",
    phone: "01012345678",
    whatsapp: "201012345678",
    area: "المرج",
    transport: "تروسكل",
    image: "/def.png",
  },
  {
    id: 2,
    name: "محمود علي",
    phone: "01087654321",
    whatsapp: "201087654321",
    area: "مؤسسة الزكاة",
    transport: "تروسكل",
    image: "/def.png",
  },
  {
    id: 3,
    name: "خالد أحمد",
    phone: "01098765432",
    whatsapp: "201098765432",
    area: "المرج",
    transport: "مشاة",
    image: "/def.png",
  },
];

export default function Delivery() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">خدمة التوصيل</h1>

          <div className="  p-4 mb-8">
            <p className="text-yellow-800 text-center text-lg">
              يمكنك التواصل مع أي من موظفي التوصيل لدينا لتوصيل طلبك. يرجى تحديد
              المنطقة المناسبة لك.
            </p>
          </div>

          <div className="bg-red-50 border-r-4 border-red-400 p-4 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">تنبيه هام</h3>
            <p className="text-red-700">
              يجب الاتفاق على سعر التوصيل قبل بدء عملية التوصيل لضمان حقوق جميع
              الأطراف. يرجى التأكد من تحديد السعر النهائي مع الموصل قبل الموافقة
              على التوصيل.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveryPersonnel.map((person) => (
              <div
                key={person.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="relative h-48">
                  <img
                    src={person.image}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/400x300?text=صورة+الموصل";
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{person.name}</h3>
                  <div className="space-y-2 text-gray-600">
                    <p>المنطقة: {person.area}</p>
                    <p>وسيلة النقل: {person.transport}</p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <a
                      href={`tel:${person.phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      اتصل
                    </a>
                    <a
                      href={`https://wa.me/${person.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      واتساب
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
