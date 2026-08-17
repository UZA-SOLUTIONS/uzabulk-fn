import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../helpers/apiHelper";
import {
  amountConversion,
  getProductImageUrl,
  openProductDetail,
} from "../../helpers/commonHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import ROUTES from "../../helpers/routesHelper";
import placeholder from "../../assets/images/default_name.webp";
import TranslatedProductName from "../Common/TranslatedProductName";

const ROW_GAP_PX = 14;

function pickListItems(res) {
  if (res?.status !== "success") return [];
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function resolveMoq(item) {
  const moq =
    item?.moq
    || item?.minimumOrderQuantity
    || item?.minOrderQuantity
    || item?.min_order_qty;
  const n = Number(moq);
  return Number.isFinite(n) && n > 0 ? n : moq || "";
}

function resolveSold(item) {
  const sold = item?.sold || item?.totalSold || item?.orderCount || item?.sold_count;
  const n = Number(sold);
  return Number.isFinite(n) && n > 0 ? n : sold || "";
}

function isExcluded(item, excludeIds) {
  const id = String(item?._id || item?.id || "").trim();
  return Boolean(id && excludeIds.has(id));
}

function uniqueById(list, excludeIds, limit) {
  const seen = new Set(excludeIds);
  const next = [];
  (list || []).forEach((item) => {
    const id = String(item?._id || item?.id || "").trim();
    if (!id || seen.has(id) || next.length >= limit) return;
    seen.add(id);
    next.push(item);
  });
  return next;
}

async function fetchCatalogBatch({ category, excludeIds, limit, skip = 1 }) {
  const requestLimit = Math.max(limit + 8, 20);
  let batch = [];
  if (category) {
    const res = await apiGet(PRODUCTS.LIST, {
      category,
      limit: requestLimit,
      skip,
      suppressGlobalErrorToast: true,
    });
    batch = pickListItems(res).filter((item) => !isExcluded(item, excludeIds));
  }
  if (batch.length < limit) {
    const fallback = await apiGet(PRODUCTS.LIST, {
      limit: requestLimit,
      skip,
      homeBrowse: true,
      suppressGlobalErrorToast: true,
    });
    batch = uniqueById(
      [...batch, ...pickListItems(fallback)],
      excludeIds,
      limit
    );
  }
  return batch.slice(0, limit);
}

function SimilarRowSkeleton({ count = 6 }) {
  return (
    <div className="similar_products_row__skeleton" aria-hidden>
      {Array.from({ length: count }).map((_, idx) => (
        <div className="similar_products_row__skeleton-card" key={`similar-skel-${idx}`}>
          <span className="similar_products_row__skeleton-media shimmer" />
          <span className="similar_products_row__skeleton-line shimmer" />
          <span className="similar_products_row__skeleton-line similar_products_row__skeleton-line--short shimmer" />
        </div>
      ))}
    </div>
  );
}

function buildCategoryListingUrl(categoryId, categoryName = "") {
  const id = String(categoryId || "").trim();
  if (!id) return ROUTES.PRODUCT_LISTING;
  const params = new URLSearchParams({ skip: "1", category: id });
  const name = String(categoryName || "").trim();
  if (name) params.set("name", name);
  return `${ROUTES.PRODUCT_LISTING}?${params.toString()}`;
}

function countCardsThatFit(trackEl) {
  if (!trackEl) return 0;
  const card = trackEl.querySelector(".similar_products_row__card");
  if (!card) return 0;
  const cardWidth = card.getBoundingClientRect().width;
  if (!(cardWidth > 0)) return 0;
  const available = trackEl.clientWidth;
  return Math.max(1, Math.floor((available + ROW_GAP_PX) / (cardWidth + ROW_GAP_PX)));
}

export default function SimilarProductsRow({
  productId,
  categoryId = "",
  categoryName = "",
  excludeProductId = "",
  /** Extra product ids to omit (e.g. already shown in the row above). */
  excludeProductIds = null,
  items: presetItems = null,
  title,
  /** When false, only the product track renders (shared heading lives on the first row). */
  showTitle = true,
  limit = 8,
  /** Catalog page for PRODUCTS.LIST (1 = first page, 2 = next page, etc.). */
  listSkip = 1,
  className = "",
  usePersonalized = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);
  const resolvedTitle = title || t("product.youMayAlsoLike");
  const [items, setItems] = useState(Array.isArray(presetItems) ? presetItems : []);
  const [loading, setLoading] = useState(false);
  const [fitCount, setFitCount] = useState(null);
  const categoryListingUrl = categoryId
    ? buildCategoryListingUrl(categoryId, categoryName)
    : "";

  const excludeKey = [
    excludeProductId,
    productId,
    ...(Array.isArray(excludeProductIds) ? excludeProductIds : []),
  ]
    .map((id) => String(id || "").trim())
    .filter(Boolean)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .join(",");

  useEffect(() => {
    if (Array.isArray(presetItems) && presetItems.length) {
      setItems(presetItems.slice(0, limit));
      setLoading(false);
      return undefined;
    }

    const category = String(categoryId || "").trim();
    const excludeIds = new Set(
      String(excludeKey || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    );
    const skip = Math.max(1, Number(listSkip) || 1);

    if (!category && usePersonalized) {
      setItems([]);
      return undefined;
    }

    if (!category && !productId) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const batch = await fetchCatalogBatch({
          category,
          excludeIds,
          limit,
          skip,
        });
        if (!cancelled) setItems(batch);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    productId,
    categoryId,
    excludeKey,
    limit,
    listSkip,
    presetItems,
    usePersonalized,
  ]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !items.length) {
      setFitCount(null);
      return undefined;
    }

    const measure = () => {
      const n = countCardsThatFit(track);
      if (n > 0) setFitCount(n);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(track);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  const openProduct = (item) => {
    openProductDetail(navigate, item, {
      redirectUrl: btoa(window.location.href),
    });
  };

  if (!presetItems && !productId && !categoryId) return null;
  if (!loading && !items.length) return null;

  const visibleItems =
    fitCount == null ? items : items.slice(0, Math.min(fitCount, items.length));

  return (
    <section
      className={`similar_products_row ${className}`.trim()}
      aria-label={resolvedTitle}
    >
      {showTitle ? (
        <div className="similar_products_row__head">
          <h3 className="similar_products_row__title">{resolvedTitle}</h3>
          {categoryListingUrl ? (
            <Link to={categoryListingUrl} className="similar_products_row__show_more">
              {t("product.showMore")}
            </Link>
          ) : null}
        </div>
      ) : null}

      {loading && !items.length ? (
        <SimilarRowSkeleton count={6} />
      ) : (
        <div ref={trackRef} className="similar_products_row__track">
          {visibleItems.map((item, idx) => {
            const moq = resolveMoq(item);
            const sold = resolveSold(item);
            let meta = "";
            if (moq && sold) meta = t("product.moqSold", { moq, sold });
            else if (moq) meta = t("product.moqOnly", { moq });
            else if (sold) meta = t("product.soldOnly", { sold });

            return (
              <button
                key={item?._id || item?.offerId || idx}
                type="button"
                className="similar_products_row__card"
                onClick={() => openProduct(item)}
              >
                <span className="similar_products_row__card-media">
                  <img
                    src={getProductImageUrl(item, placeholder)}
                    alt={item?.name || "Similar product"}
                    loading="lazy"
                  />
                </span>
                <span className="similar_products_row__name">
                  <TranslatedProductName product={item} />
                </span>
                <span className="similar_products_row__price">
                  {currentCurrency?.symbol}{" "}
                  {amountConversion(item?.price, appConfig)}
                </span>
                <span className="similar_products_row__footer">
                  {meta ? (
                    <span className="similar_products_row__meta">{meta}</span>
                  ) : (
                    <span className="similar_products_row__meta" aria-hidden="true" />
                  )}
                  <span className="similar_products_row__cta">
                    {t("home.viewDetails")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
