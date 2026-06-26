import i18n, { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from "../i18n";

const COOKIE_MAX_AGE_DAYS = 365;

export const getLanguageCode = () => {
  const code = i18n.language || "en";
  return code.startsWith("fr") ? "fr" : "en";
};

export const getLanguageMeta = (code = getLanguageCode()) =>
  SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];

export const setSiteLanguage = async (code) => {
  const next = code === "fr" ? "fr" : "en";
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.cookie = `lang=${next};path=/;max-age=${COOKIE_MAX_AGE_DAYS * 86400};SameSite=Lax`;
  }
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  await i18n.changeLanguage(next);
  return next;
};

export const initDocumentLanguage = () => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = getLanguageCode();
  }
};
