import React, { useEffect, useMemo, useState } from "react";
import {
  readImageSearchBlobPreview,
  readImageSearchPreview,
  resolveImageSearchDisplayUrl,
} from "../../helpers/imageSearchHelper";

export default function ImageSearchQueryPreview({
  imageQuery = "",
  imageUrl = "",
  isLoading = false,
  keyword = "",
}) {
  const [failed, setFailed] = useState(false);

  const displayUrl = useMemo(() => {
    const candidates = [
      imageQuery,
      imageUrl,
      readImageSearchBlobPreview(),
      readImageSearchPreview(),
    ];
    for (const raw of candidates) {
      const resolved = resolveImageSearchDisplayUrl(raw);
      if (resolved) return resolved;
    }
    return "";
  }, [imageQuery, imageUrl]);

  useEffect(() => {
    setFailed(false);
  }, [displayUrl]);

  const altText = keyword
    ? `Image you searched for: ${keyword}`
    : "Image you searched for";

  return (
    <div className="products_list_image_search_banner products_list_image_search_banner--with-image mb-3">
      <figure
        className={`products_list_image_search_query${isLoading ? " is-loading" : ""}`}
        aria-label={altText}
      >
        {displayUrl && !failed ? (
          <img
            src={displayUrl}
            alt={altText}
            className="products_list_image_search_query__img"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="products_list_image_search_query__placeholder" aria-hidden={isLoading}>
            {isLoading ? "Analyzing image…" : "Image preview unavailable"}
          </div>
        )}
        {isLoading ? (
          <div className="products_list_image_search_query__overlay" aria-live="polite">
            <span className="products_list_image_search_query__spinner" aria-hidden />
            <span className="visually-hidden">Analyzing image…</span>
          </div>
        ) : null}
      </figure>
    </div>
  );
}
