import { apiPost } from "./apiHelper";
import { getProductDedupeKey } from "./commonHelper";
import { getLanguageCode, requestProductNameTranslation } from "./productNameTranslationHelper";
import {
  shouldSkipAttributeApiTranslation,
  shouldTranslateAttributeForLang,
  translateAttributeLabelToFrench,
  translateAttributeValueToFrench,
  containsCjk,
} from "./attributeTranslationGlossary";

const STORAGE_KEY = "uzabulk_product_detail_i18n";
const LEGACY_STORAGE_KEY = "uzabulk_product_detail_fr";
const API_CHUNK_SIZE = 45;

const LABEL_KEYS = [
  "attributeNameTrans",
  "attributeName",
  "attributeNameOrig",
  "attrName",
  "name",
  "key",
  "label",
];

const VALUE_KEYS = [
  "valueTrans",
  "attributeValue",
  "attributeValueTrans",
  "attributeValueOrig",
  "attrValue",
  "value",
  "valueName",
];

const memoryCache = new Map();
const listeners = new Map();
const inflight = new Map();

function cacheKey(lang, productId) {
  return `${lang}:${productId}`;
}

function loadStorageCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([key, fields]) => {
        if (!key || !fields || typeof fields !== "object") return;
        memoryCache.set(key, { ...fields });
      });
      return;
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;
    const parsed = JSON.parse(legacy);
    Object.entries(parsed).forEach(([productId, fields]) => {
      if (!productId || !fields || typeof fields !== "object") return;
      memoryCache.set(cacheKey("fr", productId), { ...fields });
    });
  } catch {
    /* ignore */
  }
}

function persistStorageCache() {
  try {
    const obj = Object.fromEntries(memoryCache.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

loadStorageCache();

function hashText(text) {
  const normalized = String(text || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function labelFieldKey(text) {
  return `txt_l_${hashText(text)}`;
}

function valueFieldKey(text) {
  return `txt_v_${hashText(text)}`;
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];
  values.forEach((value) => {
    const text = String(value || "").trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out;
}

function collectLabelCandidates(attr = {}) {
  return uniqueStrings(LABEL_KEYS.map((key) => attr?.[key]));
}

function collectValueCandidates(attr = {}) {
  return uniqueStrings(VALUE_KEYS.map((key) => attr?.[key]));
}

function lookupTranslatedLabel(text, translations = {}, lang = "fr") {
  const source = String(text || "").trim();
  if (!source) return "";
  if (lang === "fr") {
    return translateAttributeLabelToFrench(source)
      || translations[labelFieldKey(source)]
      || "";
  }
  return translations[labelFieldKey(source)] || "";
}

function lookupTranslatedValue(text, translations = {}, lang = "fr") {
  const source = String(text || "").trim();
  if (!source) return "";
  if (lang === "fr") {
    return translateAttributeValueToFrench(source)
      || translations[valueFieldKey(source)]
      || "";
  }
  return translations[valueFieldKey(source)] || "";
}

function resolveBestTranslatedLabel(attr = {}, translations = {}, index = 0, lang = "fr") {
  const candidates = collectLabelCandidates(attr);
  const source = candidates[0] || "";

  for (const candidate of candidates) {
    const hit = lookupTranslatedLabel(candidate, translations, lang);
    if (hit && hit !== candidate) return hit;
  }

  const indexed = translations[`fa_n_${index}`];
  if (indexed && indexed !== source) return indexed;

  return lookupTranslatedLabel(source, translations, lang) || source;
}

function resolveBestTranslatedValue(attr = {}, translations = {}, index = 0, lang = "fr") {
  const candidates = collectValueCandidates(attr);
  const source = candidates[0] || "";

  for (const candidate of candidates) {
    const hit = lookupTranslatedValue(candidate, translations, lang);
    if (hit && hit !== candidate) return hit;
  }

  const indexed = translations[`fa_v_${index}`];
  if (indexed && indexed !== source) return indexed;

  return lookupTranslatedValue(source, translations, lang) || source;
}

function detailNeedsTranslation(detail, lang = getLanguageCode()) {
  if (!detail) return false;
  const fields = buildDetailTranslationFields(detail, lang);
  return Object.keys(fields).length > 0;
}

export { detailNeedsTranslation };

export function resolveProductDetailId(product) {
  const id = String(product?._id || product?.id || "").trim();
  if (id) return id;
  return getProductDedupeKey(product) || "";
}

export function resolveFeatureAttributeSourceLabel(attr) {
  return collectLabelCandidates(attr)[0] || "";
}

export function resolveFeatureAttributeSourceValue(attr) {
  return collectValueCandidates(attr)[0] || "";
}

export function resolveFeatureAttributeLabel(attr, productId = "", index = 0) {
  const lang = getLanguageCode();
  const display = String(attr?.attributeName || attr?.attrName || attr?.name || "").trim();
  const orig = String(attr?.attributeNameOrig || "").trim();
  if (display && orig && display !== orig && !containsCjk(display)) {
    if (lang === "fr") {
      return translateAttributeLabelToFrench(display) || display;
    }
    return display;
  }

  const source = resolveFeatureAttributeSourceLabel(attr);
  if (!shouldTranslateAttributeForLang(source, lang, "label")) return source;

  const translations = productId ? (getCachedDetailTranslations(productId, lang) || {}) : {};
  return resolveBestTranslatedLabel(attr, translations, index, lang);
}

export function resolveFeatureAttributeValue(attr, productId = "", index = 0) {
  const lang = getLanguageCode();
  const display = String(
    attr?.value || attr?.attributeValue || attr?.valueName || attr?.attrValue || ""
  ).trim();
  const orig = String(attr?.attributeValueOrig || "").trim();
  if (display && orig && display !== orig && !containsCjk(display)) {
    if (lang === "fr") {
      return translateAttributeValueToFrench(display) || display;
    }
    return display;
  }

  const source = resolveFeatureAttributeSourceValue(attr);
  if (!shouldTranslateAttributeForLang(source, lang, "value")) return source;

  const translations = productId ? (getCachedDetailTranslations(productId, lang) || {}) : {};
  return resolveBestTranslatedValue(attr, translations, index, lang);
}

function registerTranslatableStrings(fields, texts = [], kind = "value", lang = "fr") {
  texts.forEach((text) => {
    if (!text || !shouldTranslateAttributeForLang(text, lang, kind)) return;
    if (kind === "label") {
      fields[labelFieldKey(text)] = text;
    } else {
      fields[valueFieldKey(text)] = text;
    }
  });
}

export function buildDetailTranslationFields(detail, lang = getLanguageCode()) {
  if (!detail) return {};

  const fields = {};
  const name = String(detail?.name || "").trim();
  const shortDescription = String(detail?.short_description || "").trim();
  const description = String(detail?.description || "").trim();

  if (name && shouldTranslateAttributeForLang(name, lang, "label")) fields.name = name;
  if (shortDescription && shouldTranslateAttributeForLang(shortDescription, lang, "label")) {
    fields.short_description = shortDescription;
  }
  if (description && shouldTranslateAttributeForLang(description, lang, "label")) {
    fields.description = description;
  }

  (detail?.featureAttribute || []).forEach((attr, index) => {
    const labels = collectLabelCandidates(attr);
    const values = collectValueCandidates(attr);
    registerTranslatableStrings(fields, labels, "label", lang);
    registerTranslatableStrings(fields, values, "value", lang);
    if (labels[0] && shouldTranslateAttributeForLang(labels[0], lang, "label")) {
      fields[`fa_n_${index}`] = labels[0];
    }
    if (values[0] && shouldTranslateAttributeForLang(values[0], lang, "value")) {
      fields[`fa_v_${index}`] = values[0];
    }
  });

  (detail?.attributes || []).forEach((attribute, attrIndex) => {
    const labels = uniqueStrings([attribute?.name, attribute?.label, attribute?.attributeName]);
    registerTranslatableStrings(fields, labels, "label", lang);
    if (labels[0] && shouldTranslateAttributeForLang(labels[0], lang, "label")) {
      fields[`var_a_${attrIndex}`] = labels[0];
    }
    (attribute?.terms || []).forEach((term, termIndex) => {
      const values = uniqueStrings([term?.name, term?.value, term?.valueName, term?.label]);
      registerTranslatableStrings(fields, values, "value", lang);
      if (values[0] && shouldTranslateAttributeForLang(values[0], lang, "value")) {
        fields[`var_t_${attrIndex}_${termIndex}`] = values[0];
      }
    });
  });

  return fields;
}

export function applyDetailTranslations(detail, translations = {}, lang = getLanguageCode()) {
  if (!detail || !Object.keys(translations || {}).length) return detail;

  const merged = { ...detail };

  if (translations.name) merged.name = translations.name;
  if (translations.short_description) merged.short_description = translations.short_description;
  if (translations.description) merged.description = translations.description;

  if (Array.isArray(detail.featureAttribute)) {
    merged.featureAttribute = detail.featureAttribute.map((attr, index) => {
      const sourceLabel = resolveFeatureAttributeSourceLabel(attr);
      const sourceValue = resolveFeatureAttributeSourceValue(attr);
      const label = resolveBestTranslatedLabel(attr, translations, index, lang);
      const value = resolveBestTranslatedValue(attr, translations, index, lang);
      return {
        ...attr,
        attributeNameOrig: attr.attributeNameOrig || sourceLabel,
        attributeValueOrig: attr.attributeValueOrig || sourceValue,
        attributeNameTrans: label,
        attributeName: label,
        attrName: label,
        name: label,
        valueTrans: value,
        value: value,
        valueName: value,
        attributeValue: value,
        attrValue: value,
      };
    });
  }

  if (Array.isArray(detail.attributes)) {
    merged.attributes = detail.attributes.map((attribute, attrIndex) => {
      const sourceName = String(attribute?.name || attribute?.label || "").trim();
      const translatedName = lookupTranslatedLabel(sourceName, translations, lang)
        || translations[`var_a_${attrIndex}`]
        || sourceName;
      return {
        ...attribute,
        name: translatedName,
        terms: (attribute.terms || []).map((term, termIndex) => {
          const sourceTerm = String(term?.name || term?.value || term?.valueName || "").trim();
          const translatedTerm = lookupTranslatedValue(sourceTerm, translations, lang)
            || translations[`var_t_${attrIndex}_${termIndex}`]
            || sourceTerm;
          return { ...term, name: translatedTerm };
        }),
      };
    });
  }

  return merged;
}

function notifyListeners(lang, productId) {
  const set = listeners.get(cacheKey(lang, productId));
  if (!set) return;
  set.forEach((listener) => listener());
}

export function subscribeProductDetailTranslations(productId, listener, lang = getLanguageCode()) {
  const pid = String(productId || "").trim();
  if (!pid) return () => {};
  const key = cacheKey(lang, pid);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(listener);
  return () => listeners.get(key)?.delete(listener);
}

export function getCachedDetailTranslations(productId, lang = getLanguageCode()) {
  const pid = String(productId || "").trim();
  if (!pid) return null;
  return memoryCache.get(cacheKey(lang, pid)) || null;
}

async function translateDetailFieldChunks(productId, missingFields, cached, lang) {
  const entries = Object.entries(missingFields);
  const merged = { ...cached };

  for (let i = 0; i < entries.length; i += API_CHUNK_SIZE) {
    const chunk = Object.fromEntries(entries.slice(i, i + API_CHUNK_SIZE));
    const res = await apiPost(
      "i18n/translate-product-detail",
      { productId, fields: chunk, targetLang: lang },
      { suppressGlobalErrorToast: true }
    );
    const translations = res?.data?.translations || {};
    Object.assign(merged, translations);
  }

  return merged;
}

export async function requestProductDetailTranslation(detail, lang = getLanguageCode()) {
  const productId = resolveProductDetailId(detail);
  if (!productId) return null;

  const fields = buildDetailTranslationFields(detail, lang);
  if (!Object.keys(fields).length) return null;

  const key = cacheKey(lang, productId);
  const cached = { ...(memoryCache.get(key) || {}) };
  const missingFields = {};
  Object.entries(fields).forEach(([fieldKey, value]) => {
    if (!cached[fieldKey]) missingFields[fieldKey] = value;
  });

  if (!Object.keys(missingFields).length) {
    return cached;
  }

  if (inflight.has(key)) return inflight.get(key);

  if (lang === "fr" && missingFields.name) {
    requestProductNameTranslation({ ...detail, _id: productId, name: missingFields.name });
  }

  const promise = (async () => {
    try {
      const merged = await translateDetailFieldChunks(productId, missingFields, cached, lang);
      if (Object.keys(merged).length) {
        memoryCache.set(key, merged);
        persistStorageCache();
        notifyListeners(lang, productId);
      }
      return merged;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[product detail translation]", error?.message || error);
      }
      return cached;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Prefetch Chinese → EN and Chinese → FR attribute translations for faster language switching. */
export async function prefetchBilingualProductDetailTranslations(detail) {
  if (!detail) return;
  const tasks = [];
  if (detailNeedsTranslation(detail, "en")) {
    tasks.push(requestProductDetailTranslation(detail, "en"));
  }
  if (detailNeedsTranslation(detail, "fr")) {
    tasks.push(requestProductDetailTranslation(detail, "fr"));
  }
  if (tasks.length) {
    await Promise.allSettled(tasks);
  }
}

export function getDisplayProductDetail(detail) {
  if (!detail) return detail;
  const lang = getLanguageCode();
  if (!detailNeedsTranslation(detail, lang)) return detail;
  const productId = resolveProductDetailId(detail);
  const translations = productId ? getCachedDetailTranslations(productId, lang) : null;
  return applyDetailTranslations(detail, translations || {}, lang);
}
