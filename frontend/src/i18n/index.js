import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en/translation.json';
import itTranslation from '../locales/it/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      it: {
        translation: itTranslation,
      },
    },
    fallbackLng: 'en', // Lingua di fallback: Inglese per tutti gli altri
    supportedLngs: ['en', 'it'],
    load: 'languageOnly', // Assicura che codici come 'en-US' risolvano a 'en'
    interpolation: {
      escapeValue: false, // React già previene gli XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
  });

export default i18n;