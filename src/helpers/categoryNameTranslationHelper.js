import { getCategoryDisplayName } from "./homeCategoryFeedHelper";
import {
  getCachedProductName,
  requestProductNameTranslation,
  requestProductNamesTranslation,
  subscribeProductNameTranslations,
} from "./productNameTranslationHelper";

const CATEGORY_ID_PREFIX = "category-";

export function resolveCategoryTranslationId(category) {
  const id = String(category?._id || category?.id || "").trim();
  return id ? `${CATEGORY_ID_PREFIX}${id}` : "";
}

export function categoryToTranslationItem(category) {
  const name = getCategoryDisplayName(category);
  const id = resolveCategoryTranslationId(category);
  if (!id || !name) return null;
  return { _id: id, name };
}

export function getCachedCategoryName(category, lang = "en") {
  const sourceName = getCategoryDisplayName(category);
  if (!sourceName || lang !== "fr") return sourceName;

  const item = categoryToTranslationItem(category);
  if (!item) return sourceName;
  return getCachedProductName(item, "fr") || sourceName;
}

export function requestCategoryNameTranslation(category) {
  const item = categoryToTranslationItem(category);
  if (item) requestProductNameTranslation(item);
}

export function requestCategoryNamesTranslation(categories = []) {
  const items = (categories || [])
    .map(categoryToTranslationItem)
    .filter(Boolean);
  requestProductNamesTranslation(items);
}

export { subscribeProductNameTranslations as subscribeCategoryNameTranslations };
