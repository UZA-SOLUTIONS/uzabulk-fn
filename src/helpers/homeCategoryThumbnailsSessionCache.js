const STORAGE_KEY = "uzabulk_cat_thumbs_v3";
const TTL_MS = 30 * 60 * 1000;

function readStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function buildCategoryThumbnailsCacheKey(categoryIds = [], refresh = "") {
  const ids = [...new Set(categoryIds.map((id) => String(id || "").trim()).filter(Boolean))].sort();
  return `${refresh || "0"}:${ids.join(",")}`;
}

export function getCachedCategoryThumbnails(categoryIds = [], refresh = "") {
  const key = buildCategoryThumbnailsCacheKey(categoryIds, refresh);
  const store = readStore();
  const entry = store?.[key];
  if (!entry?.fetchedAt || Date.now() - entry.fetchedAt > TTL_MS) return null;
  return entry.data && typeof entry.data === "object" ? entry.data : null;
}

export function setCachedCategoryThumbnails(categoryIds = [], refresh = "", data = {}) {
  if (!data || typeof data !== "object" || !Object.keys(data).length) return;
  const key = buildCategoryThumbnailsCacheKey(categoryIds, refresh);
  const store = readStore() || {};
  store[key] = { data, fetchedAt: Date.now() };
  writeStore(store);
}
