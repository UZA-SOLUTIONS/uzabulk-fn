import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getCachedCategoriesByLevel } from "../../helpers/categoriesSessionCache";
import { getHomeFeedRefreshToken } from "../../helpers/commonHelper";
import {
  applyCategoryThumbnailBatch,
  fetchCategoryThumbnailsBatch,
  resolveCategoryIconUrl,
  rotateHomeCategories,
} from "../../helpers/homeCategoryFeedHelper";
import { getCachedCategoryThumbnails } from "../../helpers/homeCategoryThumbnailsSessionCache";
import { hydratePersistedCategoryImages } from "../../helpers/homeCategoryImagePersistCache";
import { setHomeCategoryCircleImage } from "../../helpers/homeCategoryCircleImageCache";
import { apiGetCategories } from "../../store/categories/actions";
import { hydrateCategoriesFromCache } from "../../store/categories/slice";

const MAX_HOME_CATEGORIES = 16;

function seedCategoryIcons(categories = [], refresh = "") {
  categories.forEach((category) => {
    const id = String(category?._id || "").trim();
    if (!id) return;
    const iconUrl = resolveCategoryIconUrl(category);
    if (iconUrl) setHomeCategoryCircleImage(id, iconUrl, refresh);
  });
}

function prefetchHomeCategoryThumbnails(categories = [], refresh = "") {
  if (!categories.length) return;

  const ids = categories.map((c) => String(c?._id || "").trim()).filter(Boolean);
  hydratePersistedCategoryImages(refresh, ids);
  seedCategoryIcons(categories, refresh);

  const cachedBatch = getCachedCategoryThumbnails(ids, refresh);
  if (cachedBatch) {
    applyCategoryThumbnailBatch(cachedBatch, refresh);
    return;
  }

  void fetchCategoryThumbnailsBatch(categories, refresh).then((batch) => {
    applyCategoryThumbnailBatch(batch, refresh);
  });
}

/**
 * Starts level 1 + 2 category requests as soon as the app loads so the home page
 * (and header) can render from Redux without waiting for the home route to mount.
 */
export default function PrefetchHomeCategories() {
  const dispatch = useDispatch();
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const cachedLevel1 = useMemo(() => getCachedCategoriesByLevel(1) || [], []);
  const resolvedLevel1 = level1Categories.length ? level1Categories : cachedLevel1;

  useEffect(() => {
    const cachedL1 = getCachedCategoriesByLevel(1);
    const cachedL2 = getCachedCategoriesByLevel(2);
    if (cachedL1?.length || cachedL2?.length) {
      dispatch(hydrateCategoriesFromCache({ level1: cachedL1 || [], level2: cachedL2 || [] }));
    }
    dispatch(apiGetCategories({ level: 1 }));
    dispatch(apiGetCategories({ level: 2 }));
  }, [dispatch]);

  useEffect(() => {
    if (!resolvedLevel1.length) return;
    const refresh = getHomeFeedRefreshToken();
    const categories = rotateHomeCategories(resolvedLevel1, refresh, MAX_HOME_CATEGORIES);
    prefetchHomeCategoryThumbnails(categories, refresh);
  }, [resolvedLevel1.length, level1Categories]);

  return null;
}
