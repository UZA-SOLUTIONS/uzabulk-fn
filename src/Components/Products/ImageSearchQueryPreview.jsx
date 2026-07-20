import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveImageSearchPreviewSource } from "../../helpers/imageSearchHelper";

export default function ImageSearchQueryPreview({
  isLoading = false,
  keyword = "",
  imageUrl = "",
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  const displayUrl = resolveImageSearchPreviewSource(imageUrl);

  useEffect(() => {
    setFailed(false);
  }, [displayUrl]);

  if (!displayUrl) return null;

  const altText = keyword
    ? `Image you searched for: ${keyword}`
    : "Image you searched for";

  return (
    <div className="products_list_image_search_banner products_list_image_search_banner--with-image mb-3">
      <figure
        className={`products_list_image_search_query${isLoading ? " is-loading" : ""}`}
        aria-label={altText}
      >
        {!failed ? (
          <img
            src={displayUrl}
            alt={altText}
            className="products_list_image_search_query__img"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="products_list_image_search_query__placeholder" aria-hidden={isLoading}>
            {isLoading ? t("search.scanningImage") : "Image preview unavailable"}
          </div>
        )}
        {isLoading ? (
          <div className="products_list_image_search_query__overlay" aria-live="polite">
            <span className="products_list_image_search_query__scan-line" aria-hidden />
            <span className="products_list_image_search_query__spinner" aria-hidden />
            <span className="visually-hidden">{t("search.scanningImage")}</span>
          </div>
        ) : null}
      </figure>
    </div>
  );
}
