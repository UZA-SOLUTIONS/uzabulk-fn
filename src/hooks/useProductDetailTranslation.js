import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  applyDetailTranslations,
  buildDetailTranslationFields,
  detailNeedsTranslation,
  getCachedDetailTranslations,
  getDisplayProductDetail,
  requestProductDetailTranslation,
  resolveProductDetailId,
  subscribeProductDetailTranslations,
} from "../helpers/productDetailTranslationHelper";

export default function useProductDetailTranslation(detail) {
  const { i18n } = useTranslation();
  const productId = resolveProductDetailId(detail);
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!detail || !productId) return undefined;

    const fields = buildDetailTranslationFields(detail, lang);
    if (!Object.keys(fields).length) return undefined;

    void requestProductDetailTranslation(detail, lang);

    const otherLang = lang === "fr" ? "en" : "fr";
    if (detailNeedsTranslation(detail, otherLang)) {
      void requestProductDetailTranslation(detail, otherLang);
    }

    const bump = () => setRevision((value) => value + 1);
    const unsubCurrent = subscribeProductDetailTranslations(productId, bump, lang);
    const unsubOther = detailNeedsTranslation(detail, otherLang)
      ? subscribeProductDetailTranslations(productId, bump, otherLang)
      : () => {};

    return () => {
      unsubCurrent();
      unsubOther();
    };
  }, [detail, productId, lang]);

  return useMemo(() => {
    if (!detail) return detail;
    const fields = buildDetailTranslationFields(detail, lang);
    if (!Object.keys(fields).length) return detail;
    const cached = getCachedDetailTranslations(productId, lang);
    void revision;
    return applyDetailTranslations(detail, cached || {}, lang);
  }, [detail, lang, productId, revision]);
}

export { getDisplayProductDetail };
