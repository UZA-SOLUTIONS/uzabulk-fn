import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { apiGet } from "../../helpers/apiHelper";
import {
  amountConversion,
  getProductImageUrl,
  openProductDetail,
} from "../../helpers/commonHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";
import TranslatedProductName from "../Common/TranslatedProductName";
import HomeHorizontalScrollRow from "../Home/HomeHorizontalScrollRow";

function sameProductId(a, b) {
  const left = String(a || "").trim();
  const right = String(b || "").trim();
  return Boolean(left && right && left === right);
}

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

export default function SimilarProductsRow({
  productId,
  categoryId = "",
  excludeProductId = "",
  items: presetItems = null,
  title,
  limit = 8,
  className = "",
  /** When true and no categoryId, fall back to similar/recommendations APIs. Ignored when categoryId is set. */
  usePersonalized = true,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);
  const resolvedTitle = title || t("product.youMayAlsoLike");
  const [items, setItems] = useState(Array.isArray(presetItems) ? presetItems : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(presetItems) && presetItems.length) {
      setItems(presetItems.slice(0, limit));
      setLoading(false);
      return undefined;
    }

    const category = String(categoryId || "").trim();
    const excludeId = String(excludeProductId || productId || "").trim();

    // Product page: catalog list by category (same as home category filter). No AI.
    if (category || !usePersonalized) {
      let cancelled = false;
      setLoading(true);

      (async () => {
        try {
          let batch = [];
          if (category) {
            const res = await apiGet(PRODUCTS.LIST, {
              category,
              limit: Math.max(limit + 4, 12),
              skip: 1,
              suppressGlobalErrorToast: true,
            });
            if (cancelled) return;
            batch = pickListItems(res).filter(
              (item) => !sameProductId(item?._id || item?.id, excludeId)
            );
          }

          // Category may be empty in ES (products often only have topCategoryId).
          if (!batch.length) {
            const fallback = await apiGet(PRODUCTS.LIST, {
              limit: Math.max(limit + 4, 12),
              skip: 1,
              homeBrowse: true,
              suppressGlobalErrorToast: true,
            });
            if (cancelled) return;
            batch = pickListItems(fallback).filter(
              (item) => !sameProductId(item?._id || item?.id, excludeId)
            );
          }

          setItems(batch.slice(0, limit));
        } catch {
          if (!cancelled) setItems([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    if (!productId) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const personalizedUrl = `${PRODUCTS.RECOMMENDATIONS.SIMILAR}/${productId}`;
        const legacyUrl = `${PRODUCTS.SIMILAR}/${productId}`;
        let next = [];
        for (const url of [personalizedUrl, legacyUrl]) {
          try {
            const res = await apiGet(url, {
              limit,
              suppressGlobalErrorToast: true,
            });
            if (cancelled) return;
            if (res?.status === "success" && Array.isArray(res.data) && res.data.length) {
              next = res.data
                .filter((item) => !sameProductId(item?._id || item?.id, excludeId))
                .slice(0, limit);
              break;
            }
          } catch {
            // try next endpoint
          }
        }
        if (!cancelled) setItems(next);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, categoryId, excludeProductId, limit, presetItems, usePersonalized]);

  const openProduct = (item) => {
    openProductDetail(navigate, item, {
      redirectUrl: btoa(window.location.href),
    });
  };

  if (!presetItems && !productId && !categoryId) return null;
  if (!loading && !items.length) return null;

  return (
    <section
      className={`similar_products_row ${className}`.trim()}
      aria-label={resolvedTitle}
    >
      <div className="similar_products_row__head">
        <h3 className="similar_products_row__title">{resolvedTitle}</h3>
      </div>

      {loading ? (
        <UXSkeleton count={4} />
      ) : (
        <HomeHorizontalScrollRow
          className="similar_products_row__track"
          depKey={items.length}
        >
          {items.map((item, idx) => {
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
                <img
                  src={getProductImageUrl(item, placeholder)}
                  alt={item?.name || "Similar product"}
                  loading="lazy"
                />
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
        </HomeHorizontalScrollRow>
      )}
    </section>
  );
}
