import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import { apiDelete, apiGet } from "../../helpers/apiHelper";
import {
  amountConversion,
  buildProductDetailUrl,
  getProductImageUrl,
  normalizeHomeCatalogProducts,
} from "../../helpers/commonHelper";
import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";
import SupplierVerificationBadge from "../Products/SupplierVerificationBadge";
import TranslatedProductName from "../Common/TranslatedProductName";
import useFrenchTranslationPrefetch from "../../hooks/useFrenchTranslationPrefetch";

function rowSkeletonSlotCount(viewportWidth) {
  const w = viewportWidth || 1200;
  const card = Math.min(204, Math.max(158, w * 0.38));
  const gap = 14;
  const visible = Math.ceil(w / (card + gap));
  return Math.min(16, Math.max(4, visible + 1));
}

const isTestProduct = (item) => {
  const name = (item?.name || "").toLowerCase().trim();
  return !name || name.includes("test");
};

export default function RecentlyViewedProducts() {
  const { t } = useTranslation();
  const isLogin = useSelector((s) => s.auth.isLogin);
  const userId = useSelector((s) => s.auth.user?._id || s.auth.user?.id || "");
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [skeletonSlots, setSkeletonSlots] = useState(() =>
    typeof window !== "undefined" ? rowSkeletonSlotCount(window.innerWidth) : 8
  );

  const fetchLimit = useMemo(
    () => Math.min(16, Math.max(6, skeletonSlots)),
    [skeletonSlots]
  );

  const displayItems = useMemo(
    () => normalizeHomeCatalogProducts(items).filter((item) => !isTestProduct(item)).slice(0, fetchLimit),
    [items, fetchLimit]
  );

  useFrenchTranslationPrefetch(displayItems);

  const loadRecentlyViewed = useCallback(async (signal) => {
    setIsLoading(true);
    try {
      const res = await apiGet(PRODUCTS.RECOMMENDATIONS.RECENTLY_VIEWED, {
        limit: fetchLimit,
        suppressGlobalErrorToast: true,
        signal,
      });
      if (signal?.aborted) return;
      if (res?.status === "success") {
        const batch = Array.isArray(res.data?.items) ? res.data.items : [];
        setItems(batch);
      } else {
        setItems([]);
      }
    } catch (e) {
      if (signal?.aborted || e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
      setItems([]);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [fetchLimit]);

  useEffect(() => {
    const onResize = () => setSkeletonSlots(rowSkeletonSlotCount(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isLogin || !userId) {
      setItems([]);
      return undefined;
    }

    const ac = new AbortController();
    void loadRecentlyViewed(ac.signal);
    return () => ac.abort();
  }, [isLogin, userId, loadRecentlyViewed]);

  const handleClearHistory = useCallback(async () => {
    if (!isLogin || !userId || isClearing) return;
    setIsClearing(true);
    try {
      await apiDelete(PRODUCTS.RECOMMENDATIONS.RECENTLY_VIEWED, {
        suppressGlobalErrorToast: true,
      });
      setItems([]);
    } catch {
      /* ignore */
    } finally {
      setIsClearing(false);
    }
  }, [isLogin, userId, isClearing]);

  if (!isLogin || !userId) return null;

  const showRowSkeleton = isLoading && !displayItems.length;
  const showEmpty = !isLoading && !displayItems.length;

  if (showEmpty) return null;

  return (
    <div className="home_feed_section_offset home_recently_viewed_section px-3 w-100">
      <section
        className="home_new_arrivals_panel home_recently_viewed_panel"
        aria-labelledby="home-recently-viewed-title"
        aria-busy={showRowSkeleton || isClearing}
      >
        <div className="home_new_arrivals_panel__head home_recently_viewed_panel__head">
          <div className="home_recently_viewed_panel__titles">
            <h2 id="home-recently-viewed-title" className="home_new_arrivals_panel__title">
              {t("home.recentlyViewed")}
            </h2>
            <span className="home_recently_viewed_panel__hint">{t("home.recentlyViewedHint")}</span>
          </div>
          <button
            type="button"
            className="home_recently_viewed_clear_btn"
            onClick={handleClearHistory}
            disabled={isClearing || isLoading}
          >
            {t("home.clearRecentlyViewed")}
          </button>
        </div>

        {showRowSkeleton ? (
          <div className="home_new_arrivals_panel__skeleton">
            <UXSkeleton count={skeletonSlots} />
          </div>
        ) : (
          <div className="home_new_arrivals_row home_recently_viewed_row">
            {displayItems.map((item, idx) => {
              const productLink = buildProductDetailUrl(item) || ROUTES.PRODUCT_LISTING;
              return (
                <Link
                  key={item?._id || item?.id || idx}
                  to={productLink}
                  className="new_arrival_img new_arrival_product_card home_recently_viewed_card text-start text-decoration-none d-block text-reset"
                >
                  <div className="new_arrival_media">
                    <span className="home_recently_viewed_badge">{t("home.recentBadge")}</span>
                    <img
                      src={getProductImageUrl(item, placeholder)}
                      alt={item?.name || "Product"}
                      className="img-fluid"
                      loading="lazy"
                    />
                  </div>
                  <div className="home_product_card_body px-1 pt-2">
                    <TranslatedProductName product={item} className="home_product_title mb-1" as="p" />
                    <p className="home_product_price mb-1">
                      {currentCurrency?.symbol} {amountConversion(item?.price, appConfig)}
                    </p>
                    <div className="home_product_footer">
                      <SupplierVerificationBadge item={item} />
                      <span className="home_product_cta">{t("home.viewDetails")}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
