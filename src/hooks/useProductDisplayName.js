import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getCachedProductName,
  requestProductNameTranslation,
  resolveProductTranslationId,
  subscribeProductNameTranslations,
} from "../helpers/productNameTranslationHelper";

export default function useProductDisplayName(product) {
  const { i18n } = useTranslation();
  const sourceName = String(product?.name || "").trim();
  const productId = resolveProductTranslationId(product);
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const item = useMemo(
    () => (product ? { ...product, name: sourceName } : { name: sourceName }),
    [product, sourceName]
  );

  const [displayName, setDisplayName] = useState(() =>
    lang === "fr" ? (getCachedProductName(item, "fr") || sourceName) : sourceName
  );

  useEffect(() => {
    if (!sourceName) return undefined;

    requestProductNameTranslation(item);

    if (lang !== "fr") {
      setDisplayName(sourceName);
      return undefined;
    }

    setDisplayName(getCachedProductName(item, "fr") || sourceName);

    return subscribeProductNameTranslations(() => {
      setDisplayName(getCachedProductName(item, "fr") || sourceName);
    });
  }, [item, sourceName, productId, lang]);

  return displayName || sourceName;
}
