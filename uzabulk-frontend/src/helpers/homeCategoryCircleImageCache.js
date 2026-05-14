/** In-memory cache for "Categories for you" circle thumbnails (session lifetime). */
const cache = Object.create(null);

export function getHomeCategoryCircleImage(categoryId) {
  if (!categoryId) return "";
  return cache[categoryId] || "";
}

export function setHomeCategoryCircleImage(categoryId, url) {
  if (categoryId && url) cache[categoryId] = url;
}
