import { apiPost } from "./apiHelper";
import { getProductDedupeKey } from "./commonHelper";
import i18n from "../i18n";

const STORAGE_KEY = "uzabulk_product_names_fr";
const API_BATCH_SIZE = 40;
const PARALLEL_REQUESTS = 4;
const FLUSH_DEBOUNCE_MS = 50;
const IMMEDIATE_MODE_MS = 20_000;

const memoryCache = new Map();
const listeners = new Set();
let pending = new Map();
let flushTimer = null;
let inflight = false;
let immediateMode = false;
let immediateModeTimer = null;

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

export const getLanguageCode = () => {
  const code = i18n.language || "en";
  return code.startsWith("fr") ? "fr" : "en";
};

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

function takePendingBatch(size = API_BATCH_SIZE) {
  const batch = [];
  for (const [id, name] of pending.entries()) {
    if (batch.length >= size) break;
    pending.delete(id);
    batch.push({ id, name });
  }
  return batch;
}

async function postTranslationBatch(batch) {
  if (!batch.length) return {};
  try {
    const res = await apiPost(
      "i18n/translate-products",
      { items: batch },
      { suppressGlobalErrorToast: true }
    );
    return res?.data?.translations || {};
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[product translation]", error?.message || error);
    }
    return {};
  }
}

function applyTranslations(translations = {}) {
  let changed = false;
  Object.entries(translations).forEach(([id, translated]) => {
    const value = String(translated || "").trim();
    if (id && value) {
      memoryCache.set(`fr:${id}`, value);
      changed = true;
    }
  });
  return changed;
}

export async function flushProductNameTranslations() {
  if (inflight) {
    return new Promise((resolve) => {
      const unsub = subscribeProductNameTranslations(() => {
        unsub();
        resolve();
      });
    });
  }

  if (!pending.size) return;

  inflight = true;
  try {
    while (pending.size > 0) {
      const workers = [];
      for (let i = 0; i < PARALLEL_REQUESTS && pending.size > 0; i += 1) {
        const batch = takePendingBatch();
        if (batch.length) workers.push(postTranslationBatch(batch));
      }
      if (!workers.length) break;
      const results = await Promise.all(workers);
      results.forEach((translations) => applyTranslations(translations));
    }
    persistStorageCache();
    notifyListeners();
  } finally {
    inflight = false;
    if (pending.size > 0) scheduleFlush();
  }
}

function scheduleFlush() {
  clearTimeout(flushTimer);
  const delay = immediateMode ? 0 : FLUSH_DEBOUNCE_MS;
  flushTimer = setTimeout(() => {
    void flushProductNameTranslations();
  }, delay);
}

export function activateFrenchTranslations() {
  immediateMode = true;
  clearTimeout(immediateModeTimer);
  immediateModeTimer = setTimeout(() => {
    immediateMode = false;
  }, IMMEDIATE_MODE_MS);
  notifyListeners();
  scheduleFlush();
}

export function requestProductNameTranslation(product) {
  const name = String(product?.name || "").trim();
  if (!name) return;

  const id = resolveProductTranslationId(product);
  if (!id || memoryCache.has(`fr:${id}`) || pending.has(id)) return;

  pending.set(id, name);
  scheduleFlush();
}

export function requestProductNamesTranslation(products = []) {
  (products || []).forEach(requestProductNameTranslation);
}

/** Queue French translations in the background (runs in EN or FR UI). */
export async function prefetchFrenchTranslations({ products = [], categories = [] } = {}) {
  requestProductNamesTranslation(products);

  if (categories?.length) {
    const { requestCategoryNamesTranslation } = require("./categoryNameTranslationHelper");
    requestCategoryNamesTranslation(categories);
  }

  await flushProductNameTranslations();
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
