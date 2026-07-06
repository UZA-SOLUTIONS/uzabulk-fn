import React, { useCallback, useEffect, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import LoadingContent from "../../Components/Common/LoadingContent";
import CommingSoon from "../Common/CommingSoon";
import ProductCard from "./ProductCard";

import { smoothScrollToTop } from "../../helpers/commonHelper";

const visualMatchSort = (items = []) => {
  const visual = [];
  const rest = [];
  (items || []).forEach((item) => {
    const pct = Number(item?.similarity_score || 0);
    if (pct >= 0.38) visual.push(item);
    else rest.push(item);
  });
  visual.sort((a, b) => Number(b?.similarity_score || 0) - Number(a?.similarity_score || 0));
  return [...visual, ...rest];
};

const ProductsListingInfinite = ({
  items,
  isLoading,
  message = "",
  hasMore,
  fetchRecords,
  gridClassName = "",
  showVisualMatch = false,
}) => {
  const lastAutoFetchAtRef = useRef(0);

  const handleOpenProduct = useCallback(() => {
    smoothScrollToTop();
  }, []);

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

  const displayItems = showVisualMatch ? visualMatchSort(items) : items;

  return (
    <section className="products_card products_listing_square position-relative">
      <InfiniteScroll
        dataLength={displayItems?.length || 0}
        next={() => fetchRecords?.()}
        hasMore={Boolean(hasMore)}
        scrollThreshold={0.75}
        loader={
          items?.length > 0 ? (
            <div className="px-0 uza-infinite-scroll">
              <LoadingContent />
            </div>
          ) : null
        }
        endMessage=""
        className="px-0"
      >
        <div
          className={`new_Arrivals new_Arrivals_many product_square_grid products_infinite_grid${gridClassName ? ` ${gridClassName}` : ""}`}
        >
          {displayItems?.length ? (
            displayItems.map((item, idx) => (
              <ProductCard
                key={item?._id || item?.offerId || idx}
                item={item}
                onOpen={handleOpenProduct}
              />
            ))
          ) : isLoading ? (
            <div className="products_list_initial_loader">
              <LoadingContent />
            </div>
          ) : (
            <CommingSoon message={message || "No products found"} />
          )}
        </div>
      </InfiniteScroll>
    </section>
  );
};

export default ProductsListingInfinite;
