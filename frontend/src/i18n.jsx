import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des fichiers de traduction (on les créera juste après)
import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import translationES from './locales/es/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
    en: { translation: translationEN },
    fr: { translation: translationFR },
    es: { translation: translationES },
    ar: { translation: translationAR },
};

i18n
    .use(LanguageDetector) // Détecte la langue du navigateur
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'fr', // Langue par défaut
        interpolation: {
            escapeValue: false, // React protège déjà contre XSS
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'], // Mémorise le choix de l'utilisateur
        },
    });

export default i18n;