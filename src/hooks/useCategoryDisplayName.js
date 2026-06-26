import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getCategoryDisplayName } from "../helpers/homeCategoryFeedHelper";
import {
  categoryToTranslationItem,
  getCachedCategoryName,
  requestCategoryNameTranslation,
  resolveCategoryTranslationId,
  subscribeCategoryNameTranslations,
} from "../helpers/categoryNameTranslationHelper";

export default function useCategoryDisplayName(category) {
  const { i18n } = useTranslation();
  const sourceName = getCategoryDisplayName(category);
  const categoryId = resolveCategoryTranslationId(category);
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const item = useMemo(
    () => categoryToTranslationItem(category),
    [category, sourceName, categoryId]
  );

  const [displayName, setDisplayName] = useState(() =>
    getCachedCategoryName(category, lang) || sourceName
  );

  useEffect(() => {
    if (lang !== "fr") {
      setDisplayName(sourceName);
      return undefined;
    }

    setDisplayName(getCachedCategoryName(category, "fr") || sourceName);
    if (item) requestCategoryNameTranslation(category);

    return subscribeCategoryNameTranslations(() => {
      setDisplayName(getCachedCategoryName(category, "fr") || sourceName);
    });
  }, [category, sourceName, categoryId, lang, item]);

  return displayName || sourceName;
}
