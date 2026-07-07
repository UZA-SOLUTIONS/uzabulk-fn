/** In-memory cache for home category thumbnails (keyed per feed refresh). */
import { getPersistedCategoryImage, setPersistedCategoryImage } from "./homeCategoryImagePersistCache";

const cache = Object.create(null);
const listeners = new Set();

function cacheKey(categoryId, refresh = "") {
  return `${String(categoryId || "").trim()}:${refresh || "0"}`;
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  });
}

export function subscribeHomeCategoryCircleImages(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHomeCategoryCircleImage(categoryId, refresh = "") {
  const id = String(categoryId || "").trim();
  if (!id) return "";
  return cache[cacheKey(id, refresh)] || getPersistedCategoryImage(id) || "";
}

export function setHomeCategoryCircleImage(categoryId, url, refresh = "") {
  const id = String(categoryId || "").trim();
  if (id && url) {
    cache[cacheKey(id, refresh)] = url;
    setPersistedCategoryImage(id, url);
    notifyListeners();
  }
}

export function clearHomeCategoryCircleImage(categoryId, refresh = "") {
  const id = String(categoryId || "").trim();
  if (id) {
    delete cache[cacheKey(id, refresh)];
    notifyListeners();
  }
}

export function clearHomeCategoryCircleImageCache() {
  Object.keys(cache).forEach((key) => {
    delete cache[key];
  });
  notifyListeners();
}
