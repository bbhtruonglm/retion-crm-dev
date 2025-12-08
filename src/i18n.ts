import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { translation as translationVi } from "./locales/vi/translation";
import { translation as translationEn } from "./locales/en/translation";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: translationVi },
      en: { translation: translationEn },
    },
    fallbackLng: "vi",
    debug: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
