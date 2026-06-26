import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { prefetchFrenchTranslations } from "../helpers/productNameTranslationHelper";

export default function useFrenchTranslationPrefetch(products = [], categories = []) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const productKey = useMemo(
    () => (products || [])
      .map((p) => String(p?._id || p?.id || p?.offerId || p?.name || ""))
      .join("|"),
    [products]
  );

  const categoryKey = useMemo(
    () => (categories || [])
      .map((c) => String(c?._id || c?.id || ""))
      .join("|"),
    [categories]
  );

  useEffect(() => {
    if (!products?.length && !categories?.length) return;
    void prefetchFrenchTranslations({ products, categories });
  }, [lang, productKey, categoryKey, products, categories]);
}
