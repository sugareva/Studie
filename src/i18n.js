import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des traductions
import translationFR from './locales/fr/translation.json';
import translationEN from './locales/en/translation.json';
import roadmapTranslation from './locales/roadmapTranslation.json';

const resources = {
  fr: {
    translation: translationFR,
    roadmap: roadmapTranslation // Ajouter comme namespace séparé
  },
  en: {
    translation: translationEN,
    roadmap: roadmapTranslation // Ajouter comme namespace séparé
  }
};

i18n
  // Détection automatique de la langue du navigateur
  .use(LanguageDetector)
  // Passe l'instance i18n à react-i18next
  .use(initReactI18next)
  // Initialisation de i18n
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut si la détection échoue
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    
    detection: {
      // Ordre de détection de la langue
      order: ['localStorage', 'navigator'],
      // Sauvegarde la langue choisie dans localStorage
      caches: ['localStorage'],
    }
  });

export default i18n;