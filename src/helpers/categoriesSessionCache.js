const STORAGE_KEY = "uzabulk_categories_v1";
const TTL_MS = 30 * 60 * 1000;

function readStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, fetchedAt: Date.now() }));
  } catch {
    /* quota */
  }
}

export function getCachedCategoriesByLevel(level) {
  const store = readStore();
  const key = `level${level}`;
  const list = store?.[key];
  return Array.isArray(list) && list.length ? list : null;
}

export function setCachedCategoriesByLevel(level, categories = []) {
  if (!Array.isArray(categories) || !categories.length) return;
  const store = readStore() || {};
  store[`level${level}`] = categories;
  writeStore(store);
}
