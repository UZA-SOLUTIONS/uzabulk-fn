import { apiPost } from "./apiHelper";
import { getProductDedupeKey } from "./commonHelper";
import { getLanguageCode } from "./languageHelper";

const STORAGE_KEY = "uzabulk_product_names_fr";
const memoryCache = new Map();
const listeners = new Set();
let pending = new Map();
let flushTimer = null;
let inflight = false;

function loadStorageCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([key, value]) => {
      if (key && value) memoryCache.set(key, String(value));
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

export function resolveProductTranslationId(product) {
  return (
    getProductDedupeKey(product)
    || String(product?._id || product?.id || product?.offerId || "").trim()
  );
}

export function getCachedProductName(product, lang = getLanguageCode()) {
  const name = String(product?.name || "").trim();
  if (!name || lang !== "fr") return name;

  const id = resolveProductTranslationId(product);
  if (!id) return name;
  return memoryCache.get(`fr:${id}`) || name;
}

export function subscribeProductNameTranslations(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

async function flushPending() {
  if (inflight || pending.size === 0) return;

  const batch = Array.from(pending.entries()).map(([id, name]) => ({ id, name }));
  pending = new Map();
  inflight = true;

  try {
    const res = await apiPost("i18n/translate-products", { items: batch });
    const translations = res?.data?.translations || {};
    Object.entries(translations).forEach(([id, translated]) => {
      const value = String(translated || "").trim();
      if (id && value) memoryCache.set(`fr:${id}`, value);
    });
    persistStorageCache();
    notifyListeners();
  } catch {
    /* keep original names on failure */
  } finally {
    inflight = false;
    if (pending.size > 0) {
      scheduleFlush();
    }
  }
}

function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void flushPending();
  }, 100);
}

export function requestProductNameTranslation(product) {
  const lang = getLanguageCode();
  const name = String(product?.name || "").trim();
  if (!name || lang !== "fr") return;

  const id = resolveProductTranslationId(product);
  if (!id || memoryCache.has(`fr:${id}`) || pending.has(id)) return;

  pending.set(id, name);
  scheduleFlush();
}

export function requestProductNamesTranslation(products = []) {
  (products || []).forEach(requestProductNameTranslation);
}

export function clearProductNameTranslationCache() {
  memoryCache.clear();
  pending.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notifyListeners();
}
