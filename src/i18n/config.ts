import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./en.json";
import arTranslations from "./ar.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslations,
    },
    ar: {
      translation: arTranslations,
    },
  },
  lng: "ar", // Changed default language to Arabic
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Set RTL direction for Arabic language
document.documentElement.dir = "rtl";

export default i18n;
