import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveImageSearchPreviewSource } from "../../helpers/imageSearchHelper";

/**
 * Shows the query image with a scan animation while image search runs.
 */
export default function ImageScanningPanel({
  imageUrl = "",
  compact = false,
  className = "",
}) {
  const { t } = useTranslation();
  const [imgFailed, setImgFailed] = useState(false);

  const displayUrl = imageUrl || resolveImageSearchPreviewSource();

  useEffect(() => {
    setImgFailed(false);
  }, [displayUrl]);

  return (
    <div
      className={`image-scan-panel${compact ? " image-scan-panel--compact" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("search.scanningImage")}
      data-testid="image-scanning-panel"
    >
      <div className="image-scan-panel__media">
        {displayUrl && !imgFailed ? (
          <img
            src={displayUrl}
            alt=""
            className="image-scan-panel__img"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="image-scan-panel__placeholder" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
              <path d="M3 16l5-4 4 3 3-2 6 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div className="image-scan-panel__scan" aria-hidden>
          <span className="image-scan-panel__beam" />
        </div>
        <div className="image-scan-panel__grid" aria-hidden />
      </div>
    </div>
  );
}
