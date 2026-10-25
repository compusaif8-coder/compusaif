// Store Constants - جميع ثوابت المشروع
export const STORE_CONFIG = {
  // معلومات المتجر الأساسية
  name: "Zaky",
  displayName: "متجر ستوري",
  description: "متجر إلكتروني متخصص في بيع الأجهزة الإلكترونية وملحقاتها",
  tagline: "   جميع الاجهزة استيراد امريكي بمكونات اصليه بالكامل",

  // الشعارات
  logo: {
    primary: "/logo1.png",
    secondary: "/logo2.webp",
    favicon: "/logo1.png",
    text: "اي زون مول ", // نص اللوجو الذي يظهر في Navbar
  },

  // معلومات الاتصال
  contact: {
    phone: "01146324540",
    formattedPhone: "201146324540",
    whatsapp: "01146324540",
    email: "ibrahim.moamen100@gmail.com",
    address: "  مكرم عبيد - مدينة نصر - القاهرة",
    city: "القاهرة",
    country: "مصر",
  },

  // ساعات العمل
  workingHours: {
    weekdays: "11:00 صباحاً - 9:00 مساءً",
    weekends: "11:00 صباحاً - 9:00 مساءً",
    friday: "مغلق",
    holidays: "مغلق",
  },

  // روابط التواصل الاجتماعي
  socialMedia: {
    facebook: "https://facebook.com/storee",
    instagram: "https://instagram.com/storee",
    twitter: "https://twitter.com/storee",
    youtube: "https://youtube.com/storee",
    tiktok: "https://tiktok.com/@storee",
  },

  // معلومات صاحب المتجر
  owner: {
    name: "شركه كمبيو سيف   ",
    phone: "01146324540",
    whatsapp: "01146324540",
    email: "elaraby_ahamed@yahoo.com",
    title: "صاحب المتجر",

  },

  // معلومات الموظفين
  team: {
    salesManager: {
      name: "Ibrahim",
      image: "/ibrahim.png",
      phone: "01146324540",
      title: "مدير المبيعات",
      bio: "مسؤول عن إدارة المبيعات وتطوير استراتيجيات التسويق",
    },
    deliveryManager: {
      name: "Ahmed",
      image: "/def.png",
      phone: "01146324540",
      title: "مسؤول التوصيل",
      bio: "مسؤول عن توصيل الطلبات وضمان وصولها في الوقت المحدد",
    },
  },

  // مواقع الفروع
  locations: [

    {
      id: "branch2",
      name: "       شركة كمبيو سيف فرع ايزون مول    ",
      address: " 382W+8V9, Al Manteqah Ath Thamenah, Nasr City, Cairo Governorate 4441552 ",
      phone: "01080027827",
      hours: "11:00 صباحاً - 9:00 مساءً (ماعدا الجمعة)",
      coordinates: {
        lat: 30.0507931,
        lng: 31.34706
      },

      googleMapsUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4249.441131397072!2d31.3470600000003!3d30.0507931!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583f0002866a51%3A0x59ff341bcbf1b4c3!2sE%20ZONE%20MALL!5e1!3m2!1sen!2seg!4v1773481659531!5m2!1sen!2seg",
      isMain: true,
    },
    {
      id: "branch3",
      name: "       شركة كمبيو سيف فرع فيصل      ",
      address: " شارع الاربعتاشر مقابل سوبر ماركت الفرجانى متفرع من شارع العشرين فيصل، شارع ال, Boulaq Al Dakrour, Giza Governorate  ",
      phone: "01146324540",
      hours: "11:00 صباحاً - 9:00 مساءً (ماعدا الجمعة)",
      coordinates: {
        lat: 30.018461617336946,
        lng: 31.182576619105504
      },

      googleMapsUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3593.4579070445393!2d31.182576619105504!3d30.018461617336946!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1458473919d136ab%3A0x7478f0aaa5e48ed9!2z2LTYsdmD2Kkg2YPZhdio2YrZiCDYs9mK2YE!5e1!3m2!1sen!2seg!4v1773486354903!5m2!1sen!2seg",
      isMain: false,
    },
    {
      id: "branch4",
      name: "       شركة كمبيو سيف فرع مول البستان      ",
      address: " مول البستان, Bab Al Louq, Abdeen, Cairo Governorate 4280122 ",
      phone: "01018154208",
      hours: "11:00 صباحاً - 9:00 مساءً (ماعدا الجمعة)",
      coordinates: {
        lat: 30.04520578513648,
        lng: 31.238287239912097
      },

      googleMapsUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1468.0774421207127!2d31.238287239912097!3d30.04520578513648!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145840c775c807a7%3A0x4e6b07f8bc12ffe6!2sAl%20Boustan%20Computer%20Center!5e1!3m2!1sen!2seg!4v1773486753341!5m2!1sen!2seg",
      isMain: false,
    },

  ],

  // ألوان المشروع
  colors: {
    primary: "#3B82F6", // blue-500
    secondary: "#10B981", // emerald-500
    accent: "#F59E0B", // amber-500
    success: "#10B981", // emerald-500
    warning: "#F59E0B", // amber-500
    error: "#EF4444", // red-500
    info: "#3B82F6", // blue-500
  },

  // معلومات Carousel الصفحة الرئيسية
  heroCarousel: [
    {
      id: "slide1",
      image: "/bg4.png",
      title: "  ",
      description: " ",
      buttonText: "تسوق الآن",
      buttonLink: "/products?category=laptop",
      overlay: "from-black/70 to-transparent",
    },
    {
      id: "slide2",
      image: "/bg3.png",
      title: "  ",
      description: " ",
      buttonText: "تسوق الآن",
      buttonLink: "/products?category=laptop&subcategory=Precision&subcategory=Zbook",
      overlay: "from-black/70 to-transparent",
    }


  ],

  //  العلامات التجارية
  brands: [
    {
      id: "brand1",
      name: "Apple",
      logo: "/brands/apple.png",
      description: "أجهزة Apple الأصلية",
    },
    {
      id: "brand2",
      name: "Samsung",
      logo: "/brands/samsung.png",
      description: "أجهزة Samsung عالية الجودة",
    },
    {
      id: "brand3",
      name: "Huawei",
      logo: "/brands/huawei.png",
      description: "أجهزة Huawei المميزة",
    },
    {
      id: "brand4",
      name: "Xiaomi",
      logo: "/brands/xiaomi.png",
      description: "أجهزة Xiaomi بأسعار منافسة",
    },
  ],

  // معلومات الموردين
  suppliers: [

  ],

  // معلومات التوصيل
  delivery: {
    freeShippingThreshold: 1000, // EGP
    deliveryTime: "24-48 ساعة",
    deliveryAreas: ["القاهرة", "الجيزة", "الإسكندرية"],
    deliveryFee: "تحدد حسب المنطقة",
    returnPolicy: "إمكانية الإرجاع خلال 14 يوم",
    governorates: [
      { name: "القاهرة", shippingCost: "", deliveryTime: '24 ساعة' },
      { name: "الجيزة", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "الإسكندرية", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "الدقهلية", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "البحر الأحمر", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "البحيرة", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "الفيوم", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "الغربية", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "الإسماعيلية", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "المنوفية", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "المنيا", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "القليوبية", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "الوادي الجديد", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "السويس", shippingCost: "", deliveryTime: '24-48 ساعة' },
      { name: "أسوان", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "أسيوط", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "بني سويف", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "بورسعيد", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "دمياط", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "الشرقية", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "جنوب سيناء", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "كفر الشيخ", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "مطروح", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "الأقصر", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "قنا", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "شمال سيناء", shippingCost: "", deliveryTime: '48-72 ساعة' },
      { name: "سوهاج", shippingCost: "", deliveryTime: '48-72 ساعة' }
    ],
  },

  // معلومات الدفع
  payment: {
    methods: ["الدفع عند الاستلام", "بطاقات الائتمان", "التحويل البنكي"],
    securePayment: true,
    installmentAvailable: true,
    maxInstallments: 12,
  },

  // معلومات الضمان
  warranty: {
    defaultWarranty: "ضمان سنة واحدة",
    extendedWarranty: "إمكانية تمديد الضمان",
    warrantyCoverage: "جميع الأجزاء والعمالة",
  },

  // معلومات SEO
  seo: {
    title: "Storee - متجر الأجهزة الإلكترونية",
    description: "متجر إلكتروني متخصص في بيع الأجهزة الإلكترونية وملحقاتها ب جميع الاجهزة استيراد امريكي بمكونات اصليه بالكامل",
    keywords: "أجهزة إلكترونية, موبايلات, لابتوب, تابلت, ملحقات, مصر",
    author: "Storee Team",
    ogImage: "/og-image.png",
  },

  // معلومات التطبيق
  app: {
    version: "1.0.0",
    buildNumber: "1",
    minSupportedVersion: "1.0.0",
    updateUrl: "https://storee.com/update",
  },

  // معلومات API
  api: {
    baseUrl: "https://api.storee.com",
    version: "v1",
    timeout: 30000, // 30 seconds
  },

  // معلومات Firebase
  firebase: {
    projectId: "storee-app",
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: "storee-app.firebaseapp.com",
    storageBucket: "storee-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
  },

  // معلومات التطوير
  development: {
    environment: import.meta.env.MODE || "development",
    debug: import.meta.env.MODE === "development",
    logLevel: import.meta.env.MODE === "development" ? "debug" : "error",
  },
} as const;

// تصدير الثوابت الفردية للاستخدام المباشر
export const STORE_NAME = STORE_CONFIG.name;
export const STORE_DISPLAY_NAME = STORE_CONFIG.displayName;
export const STORE_LOGO = STORE_CONFIG.logo.primary;
export const STORE_LOGO_TEXT = STORE_CONFIG.logo.text;
export const STORE_PHONE = STORE_CONFIG.contact.phone;
export const STORE_WHATSAPP = STORE_CONFIG.contact.whatsapp;
export const STORE_EMAIL = STORE_CONFIG.contact.email;
export const STORE_ADDRESS = STORE_CONFIG.contact.address;
export const STORE_WORKING_HOURS = STORE_CONFIG.workingHours.weekdays;
export const STORE_OWNER = STORE_CONFIG.owner;
export const STORE_LOCATIONS = STORE_CONFIG.locations;
export const STORE_COLORS = STORE_CONFIG.colors;
export const STORE_HERO_CAROUSEL = STORE_CONFIG.heroCarousel;
export const STORE_BRANDS = STORE_CONFIG.brands;
export const STORE_SUPPLIERS = STORE_CONFIG.suppliers;
export const STORE_SOCIAL_MEDIA = STORE_CONFIG.socialMedia;
export const STORE_TEAM = STORE_CONFIG.team;
export const STORE_GOVERNORATES = STORE_CONFIG.delivery.governorates;