import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getCategoryDisplayName } from "../helpers/homeCategoryFeedHelper";
import {
  getCachedCategoryName,
  requestCategoryNamesTranslation,
  subscribeCategoryNameTranslations,
} from "../helpers/categoryNameTranslationHelper";

function buildNameMap(categories, lang) {
  const map = {};
  (categories || []).forEach((category) => {
    const id = String(category?._id || "").trim();
    if (!id) return;
    map[id] = getCachedCategoryName(category, lang) || getCategoryDisplayName(category);
  });
  return map;
}

export default function useCategoryDisplayNames(categories = []) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const categoryKey = (categories || [])
    .map((c) => `${c?._id || ""}:${getCategoryDisplayName(c)}`)
    .join("|");

  const [names, setNames] = useState(() => buildNameMap(categories, lang));

  useEffect(() => {
    setNames(buildNameMap(categories, lang));

    if (lang !== "fr") return undefined;

    requestCategoryNamesTranslation(categories);

    return subscribeCategoryNameTranslations(() => {
      setNames(buildNameMap(categories, "fr"));
    });
  }, [categoryKey, lang, categories]);

  return names;
}
