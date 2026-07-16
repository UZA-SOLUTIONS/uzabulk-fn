import React from "react";

export default function UXSkeleton({ type = "product-grid", count = 8 }) {
  if (type === "hero-banner") {
    return (
      <div className="ux-skeleton ux-skeleton-hero">
        <div className="ux-skeleton-hero-card shimmer" />
      </div>
    );
  }

  if (type === "category-circles") {
    return (
      <div className="ux-skeleton ux-skeleton-circles">
        {Array.from({ length: count }).map((_, idx) => (
          <div className="ux-skeleton-circle-item" key={`circle-${idx}`}>
            <span className="ux-skeleton-circle shimmer" />
            <span className="ux-skeleton-line short shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "source-by-category") {
    return (
      <div className="ux-skeleton ux-skeleton-source-cats" aria-hidden>
        <div className="ux-skeleton-source-cats__track">
          {Array.from({ length: count }).map((_, idx) => (
            <div className="ux-skeleton-source-cat-card" key={`source-cat-${idx}`}>
              <span className="ux-skeleton-source-cat-card__line shimmer" />
              <span className="ux-skeleton-source-cat-card__line ux-skeleton-source-cat-card__line--short shimmer" />
              <span className="ux-skeleton-source-cat-card__media shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "product-detail") {
    return (
      <div className="ux-skeleton ux-skeleton-pdp" aria-busy="true" aria-hidden>
        <div className="ux-skeleton-pdp__main">
          <div className="ux-skeleton-pdp__gallery">
            <span className="ux-skeleton-line ux-skeleton-pdp__title shimmer" />
            <span className="ux-skeleton-line mid shimmer" />
            <span className="ux-skeleton-pdp__media shimmer" />
          </div>
          <div className="ux-skeleton-pdp__buybox">
            <span className="ux-skeleton-line ux-skeleton-pdp__price shimmer" />
            <span className="ux-skeleton-pdp__rule shimmer" />
            <div className="ux-skeleton-pdp__chips">
              <span className="ux-skeleton-pdp__chip shimmer" />
              <span className="ux-skeleton-pdp__chip shimmer" />
              <span className="ux-skeleton-pdp__chip shimmer" />
              <span className="ux-skeleton-pdp__chip shimmer" />
            </div>
            <div className="ux-skeleton-pdp__actions">
              <span className="ux-skeleton-pdp__qty shimmer" />
              <span className="ux-skeleton-pdp__cta shimmer" />
              <span className="ux-skeleton-pdp__chat shimmer" />
            </div>
          </div>
        </div>
        <div className="ux-skeleton-pdp__tabs">
          <span className="ux-skeleton-pdp__tab shimmer" />
          <span className="ux-skeleton-pdp__tab shimmer" />
          <span className="ux-skeleton-line shimmer" />
          <span className="ux-skeleton-line mid shimmer" />
          <span className="ux-skeleton-line short shimmer" />
        </div>
        <div className="ux-skeleton-pdp__similar">
          <span className="ux-skeleton-line mid shimmer" />
          <div className="ux-skeleton-grid ux-skeleton-pdp__similar-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div className="ux-skeleton-card" key={`pdp-similar-${idx}`}>
                <span className="ux-skeleton-media shimmer" />
                <span className="ux-skeleton-line shimmer" />
                <span className="ux-skeleton-line short shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ux-skeleton ux-skeleton-grid">
      {Array.from({ length: count }).map((_, idx) => (
        <div className="ux-skeleton-card" key={`card-${idx}`}>
          <span className="ux-skeleton-media shimmer" />
          <span className="ux-skeleton-line shimmer" />
          <span className="ux-skeleton-line mid shimmer" />
          <span className="ux-skeleton-line short shimmer" />
        </div>
      ))}
    </div>
  );
}
