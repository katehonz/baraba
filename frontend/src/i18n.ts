import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files directly
import bgTranslation from './locales/bg/translation.json';
import enTranslation from './locales/en/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'bg',
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    
    resources: {
      bg: {
        translation: bgTranslation
      },
      en: {
        translation: enTranslation
      }
    }
  });

export default i18n;
