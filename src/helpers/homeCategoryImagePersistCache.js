import { resolveMediaUrl } from "./commonHelper";
import { setHomeCategoryCircleImage } from "./homeCategoryCircleImageCache";

const STORAGE_KEY = "uzabulk_cat_img_persist_v1";
const TTL_MS = 30 * 60 * 1000;

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
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

export function getPersistedCategoryImage(categoryId) {
  const id = String(categoryId || "").trim();
  if (!id) return "";
  const entry = readStore()[id];
  if (!entry?.url || !entry?.fetchedAt || Date.now() - entry.fetchedAt > TTL_MS) return "";
  return resolveMediaUrl(entry.url);
}

export function setPersistedCategoryImage(categoryId, url) {
  const id = String(categoryId || "").trim();
  const resolved = resolveMediaUrl(url);
  if (!id || !resolved) return;
  const store = readStore();
  store[id] = { url: resolved, fetchedAt: Date.now() };
  writeStore(store);
}

export function getPersistedCategoryImages(categoryIds = []) {
  const out = {};
  categoryIds.forEach((categoryId) => {
    const id = String(categoryId || "").trim();
    const url = getPersistedCategoryImage(id);
    if (id && url) out[id] = url;
  });
  return out;
}

/** Show last-known thumbnails instantly after a full page reload. */
export function hydratePersistedCategoryImages(refresh = "", categoryIds = null) {
  const store = readStore();
  const now = Date.now();
  let changed = 0;

  Object.entries(store).forEach(([id, entry]) => {
    if (!entry?.url || !entry?.fetchedAt || now - entry.fetchedAt > TTL_MS) return;
    if (Array.isArray(categoryIds) && categoryIds.length && !categoryIds.includes(id)) return;
    const resolved = resolveMediaUrl(entry.url);
    if (resolved) {
      setHomeCategoryCircleImage(id, resolved, refresh);
      changed += 1;
    }
  });

  return changed;
}
