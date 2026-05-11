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
