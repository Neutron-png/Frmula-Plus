import "intl-pluralrules";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

const LANGUAGE_STORAGE_KEY = "@frmula_language";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

const supportedLanguages = ["en", "fr", "ar"] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const langCode = locales[0].languageCode;
      if (langCode && supportedLanguages.includes(langCode as SupportedLanguage)) {
        return langCode;
      }
    }
  } catch {}
  return "en";
}

async function getStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setLanguage(lang: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  } catch {}
}

export function isRTL(): boolean {
  return i18n.language === "ar";
}

export function getCurrentLanguage(): string {
  return i18n.language || "en";
}

async function initI18n() {
  const storedLang = await getStoredLanguage();
  const initialLang = storedLang || getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4",
    react: {
      useSuspense: false,
    },
  });
}

initI18n();

export { useTranslation };
export default i18n;
