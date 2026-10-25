import React from "react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Topbar } from "@/components/Topbar";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "كيف يمكنني الطلب من المتجر؟",
    answer:
      "يمكنك الطلب من خلال زيارة أي من فروعنا أو التواصل معنا عبر الواتساب على الرقم 01080027827. سنقوم بتوصيل طلبك خلال 48 ساعة.",
  },
  {
    question: "هل يمكنني إضافة منتجاتي إلى المتجر؟",
    answer:
      "نعم، نحن نرحب بإضافة منتجات التجار الناشئين. يمكنك التواصل معنا عبر الواتساب على الرقم 01080027827 لإضافة منتجاتك.",
  },
  {
    question: "ما هي طرق الدفع المتاحة؟",
    answer: "الدفع عند الاستلام فقط.",
  },
  {
    question: "هل يوجد خدمة توصيل؟",
    answer:
      "نعم، يوجد خدمة التوصيل عن طريق شركائنا مباشرة أو عن طريق موظفي التوصيل الموجودين في صفحة خدمة التوصيل.",
  },
  {
    question: "كيف يمكنني التواصل مع خدمة العملاء؟",
    answer:
      "يمكنك التواصل معنا عبر الواتساب على الرقم 01080027827 أو زيارة أي من فروعنا.",
  },
  {
    question: "هل يمكنني إرجاع المنتجات؟",
    answer:
      "نعم، يمكنك إرجاع المنتجات خلال 7 أيام من تاريخ الشراء بشرط أن تكون بحالة جيدة وفي العبوة الأصلية.",
  },
  {
    question: "ما هي مواعيد عمل الفروع؟",
    answer:
      "تعمل جميع فروعنا من الساعة 9 صباحاً حتى 10 مساءً طوال أيام الأسبوع.",
  },
  {
    question: "هل تقدمون خصومات للطلبات الكبيرة؟",
    answer:
      "نعم، نقدم خصومات خاصة للطلبات الكبيرة. يمكنك التواصل معنا عبر الواتساب للحصول على أفضل الأسعار.",
  },
  {
    question: "ما هي الفائدة الأساسية من الموقع؟",
    answer:
      "أن معظم تجار الجملة والمحلات المشهورة تعرض منتجاتها في هذا الموقع. يمكنك الاطلاع على الشركاء من صفحة فروعنا.",
  },
  {
    question: "لماذا لا يمكنني رفع المنتج بنفسي على الموقع؟",
    answer:
      "لأن الموقع لا يوجد به خادم بسبب التكاليف الباهظة للخوادم وتم استبدال ذلك بجهاز الكمبيوتر الخاص بمصمم الموقع. لذا يقتصر رفع المنتج عن طريقه. وتم استخدام الواتساب كواسطة تواصل بين الزبون والتاجر ليكون كل شيء مجاناً.",
  },
  {
    question:
      "في حال اشتريت منتج هل يوجد قابلية لترجيع المنتج إذا كان به عطل أو لا يعمل؟",
    answer:
      "نعم، يمكنك التواصل مع التاجر وفهم الأسباب. وإذا لم يتم استرجاع المنتج، يرجى تقديم شكوى عن طريق رقم المصمم وسيتم حذف جميع المنتجات الخاصة بهذا التاجر.",
  },
];

export default function FAQ() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            الأسئلة الشائعة
          </h1>

          <Accordion type="single" collapsible className="w-full">
            {faqData.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-right">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-right">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">هل لديك سؤال آخر؟</h2>
            <p className="text-gray-600 mb-4">
              يمكنك التواصل معنا عبر الواتساب على الرقم 01080027827 وسنكون سعداء
              بمساعدتك
            </p>
            <a
              href="https://wa.me/201024911062"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              تواصل معنا على الواتساب
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
