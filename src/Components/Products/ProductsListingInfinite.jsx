import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useTranslation } from "react-i18next";

import UXSkeleton from "../Common/UXSkeleton";
import CommingSoon from "../Common/CommingSoon";
import ProductCard from "./ProductCard";

import { smoothScrollToTop } from "../../helpers/commonHelper";

const VISUAL_MATCH_FLOOR = 0.48;

const isStrongVisualItem = (item) => {
  const pct = Number(item?.similarity_score || 0);
  return item?.match_type === "visual" && pct >= VISUAL_MATCH_FLOOR;
};

const visualMatchSort = (items = []) => {
  const visual = [];
  const rest = [];
  (items || []).forEach((item) => {
    if (isStrongVisualItem(item)) visual.push(item);
    else rest.push(item);
  });
  visual.sort((a, b) => Number(b?.similarity_score || 0) - Number(a?.similarity_score || 0));
  return [...visual, ...rest];
};

const ProductsListingInfinite = ({
  items,
  isLoading,
  isRefreshing = false,
  message = "",
  emptyMessage = "",
  hasMore,
  fetchRecords,
  gridClassName = "",
  showVisualMatch = false,
  skeletonCount = 8,
}) => {
  const { t } = useTranslation();
  const lastAutoFetchAtRef = useRef(0);
  const [showWeakMatches, setShowWeakMatches] = useState(false);

  const handleOpenProduct = useCallback(() => {
    smoothScrollToTop();
  }, []);

  useEffect(() => {
    setShowWeakMatches(false);
  }, [items]);

  useEffect(() => {
    if (!hasMore || isLoading || typeof fetchRecords !== "function") {
      return;
    }
    const fillShortPage = () => {
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      const needsMore = !items?.length || items.length < 24;
      const now = Date.now();
      if ((needsMore || docHeight <= viewHeight + 120) && now - lastAutoFetchAtRef.current > 650) {
        lastAutoFetchAtRef.current = now;
        fetchRecords();
      }
    };
    fillShortPage();
    window.addEventListener("resize", fillShortPage);
    return () => window.removeEventListener("resize", fillShortPage);
  }, [items?.length, hasMore, isLoading, fetchRecords]);

  const sortedItems = useMemo(
    () => (showVisualMatch ? visualMatchSort(items) : items),
    [items, showVisualMatch]
  );

  const { displayItems, hiddenWeakCount } = useMemo(() => {
    if (!showVisualMatch || showWeakMatches) {
      return { displayItems: sortedItems, hiddenWeakCount: 0 };
    }

    const strong = [];
    const weak = [];
    (sortedItems || []).forEach((item) => {
      if (isStrongVisualItem(item)) strong.push(item);
      else weak.push(item);
    });

    // No strong visual hits: show the full catalog/keyword result set (do not gate).
    if (!strong.length) {
      return { displayItems: sortedItems, hiddenWeakCount: 0 };
    }

    // Strong visual hits present: keep low-similarity fillers behind "Show more".
    return {
      displayItems: strong,
      hiddenWeakCount: weak.length,
    };
  }, [sortedItems, showVisualMatch, showWeakMatches]);

  const showInitialSkeleton = Boolean(isLoading) && !displayItems?.length && !items?.length;
  const isRefreshingSearch = Boolean(isRefreshing) && Boolean(items?.length);

  if (showInitialSkeleton) {
    return (
      <section className="products_card products_listing_square position-relative" aria-busy="true">
        <div className="products_list_searching_status products_list_searching_status--initial" role="status" aria-live="polite">
          <span className="products_list_searching_status__spinner" aria-hidden />
          <span>{t("search.searching")}</span>
        </div>
        <div className="home_discover_browse__skeleton products_list_browse__skeleton">
          <UXSkeleton type="product-grid" count={skeletonCount} />
        </div>
      </section>
    );
  }

  const emptyCopy = emptyMessage || message || t("search.noProductsFound");

  return (
    <section
      className={`products_card products_listing_square position-relative${isRefreshingSearch ? " is-searching" : ""}`}
      aria-busy={isLoading || undefined}
    >
      {isRefreshingSearch ? (
        <div className="products_list_searching_status" role="status" aria-live="polite">
          <span className="products_list_searching_status__spinner" aria-hidden />
          <span>{t("search.searching")}</span>
        </div>
      ) : null}
      <InfiniteScroll
        dataLength={displayItems?.length || 0}
        next={() => fetchRecords?.()}
        hasMore={Boolean(hasMore) && (showWeakMatches || !showVisualMatch || hiddenWeakCount === 0)}
        scrollThreshold={0.75}
        loader={
          items?.length > 0 && !isRefreshingSearch ? (
            <div
              className="px-0 uza-infinite-scroll products_list_browse__skeleton products_list_browse__skeleton--more"
              aria-busy="true"
            >
              <UXSkeleton type="product-grid" count={4} />
            </div>
          ) : null
        }
        endMessage=""
        className="px-0"
      >
        <div
          className={`new_Arrivals new_Arrivals_many product_square_grid products_infinite_grid${gridClassName ? ` ${gridClassName}` : ""}${isRefreshingSearch ? " is-searching-dim" : ""}`}
        >
          {displayItems?.length ? (
            displayItems.map((item, idx) => (
              <ProductCard
                key={item?._id || item?.offerId || idx}
                item={item}
                onOpen={handleOpenProduct}
                showVisualMatch={showVisualMatch}
              />
            ))
          ) : (
            <CommingSoon message={emptyCopy} />
          )}
        </div>
      </InfiniteScroll>
      {showVisualMatch && hiddenWeakCount > 0 ? (
        <div className="text-center py-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setShowWeakMatches(true)}
          >
            {t("search.imageSearchShowMore", { count: hiddenWeakCount })}
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default ProductsListingInfinite;
