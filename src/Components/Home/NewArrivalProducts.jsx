import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import {
  amountConversion,
  buildProductDetailUrl,
  getProductImageUrl,
  getHomeFeedRefreshToken,
} from "../../helpers/commonHelper";
import { apiGetHomeNewArrivalProducts } from "../../store/products/actions";

import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";
import InCartBadge from "../Common/InCartBadge";
import SupplierVerificationBadge from "../Products/SupplierVerificationBadge";
import TranslatedProductName from "../Common/TranslatedProductName";
import { getMainContentWidth } from "../../helpers/scrollRootHelper";
import HomeHorizontalScrollRow from "./HomeHorizontalScrollRow";

const HOME_HOT_DEALS_LIMIT = 12;

function hotDealsSkeletonSlotCount(viewportWidth) {
  const w = viewportWidth || 1200;
  const card = Math.min(204, Math.max(158, w * 0.38));
  const gap = 14;
  const visible = Math.ceil(w / (card + gap));
  return Math.min(24, Math.max(6, visible + 2));
}

function formatSoldCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

function resolveTrustLine(item, t) {
  const moq = item?.moq || item?.minimumOrderQuantity || item?.minOrderQuantity || item?.min_order_qty;
  const soldRaw = item?.sold_count ?? item?.sold ?? item?.totalSold ?? item?.orderCount;
  const soldLabel = formatSoldCount(soldRaw);
  if (moq && soldLabel) return `MOQ ${moq} • ${t("home.soldCount", { count: soldLabel })}`;
  if (soldLabel) return t("home.soldCount", { count: soldLabel });
  if (moq) return `MOQ ${moq}`;
  return "";
}

const isTestProduct = (item) => {
  const name = (item?.name || "").toLowerCase().trim();
  return !name || name.includes("test");
};

const HOT_ICON = (
  <img
    className="home_hot_deals_icon"
    src="/fire.gif"
    alt=""
    width={22}
    height={22}
    decoding="async"
  />
);

export default function NewArrivalProducts() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [skeletonSlots, setSkeletonSlots] = useState(() =>
    typeof window !== "undefined" ? hotDealsSkeletonSlotCount(getMainContentWidth()) : 12
  );
  const [feedRefresh, setFeedRefresh] = useState(() => getHomeFeedRefreshToken());
  const { isLoading, items } = useSelector((s) => s.products.homeNewArrivalProducts);
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);

  const fetchLimit = HOME_HOT_DEALS_LIMIT;

  const displayItems = useMemo(
    () => (items || []).filter((item) => !isTestProduct(item)).slice(0, fetchLimit),
    [items, fetchLimit]
  );

  useEffect(() => {
    const updateSlots = () => setSkeletonSlots(hotDealsSkeletonSlotCount(getMainContentWidth()));
    updateSlots();

    const shell = document.querySelector(".app-layout-shell");
    const ro =
      shell && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSlots) : null;
    ro?.observe(shell);

    window.addEventListener("resize", updateSlots);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateSlots);
    };
  }, []);

  useEffect(() => {
    const refreshHotDeals = () => {
      setFeedRefresh(getHomeFeedRefreshToken());
    };

    // Keep Hot Deals in sync with live sold_count as it changes.
    const intervalId = window.setInterval(refreshHotDeals, 3 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshHotDeals();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    dispatch(
      apiGetHomeNewArrivalProducts({
        limit: HOME_HOT_DEALS_LIMIT,
        refresh: feedRefresh,
        homeFeed: true,
        suppressGlobalErrorToast: true,
        signal: ac.signal,
      })
    );
    return () => ac.abort();
  }, [dispatch, feedRefresh]);

  const showRowSkeleton = isLoading && !displayItems.length;
  const showEmpty = !isLoading && !displayItems.length;

  if (showEmpty) {
    return null;
  }

  return (
    <div className="home_feed_section_offset home_new_arrivals_section w-100">
      <section
        className="home_new_arrivals_panel"
        aria-labelledby="home-hot-deals-title"
        aria-busy={showRowSkeleton}
      >
        <div className="home_new_arrivals_panel__head">
          <h2 id="home-hot-deals-title" className="home_new_arrivals_panel__title home_hot_deals_title">
            {t("home.hotDeals")}
            <span className="home_hot_deals_title__icon" aria-hidden>
              {HOT_ICON}
            </span>
          </h2>
          <Link to={ROUTES.NEW_ARRIVALS_PRODUCT_LISTING} className="home_new_arrivals_panel__view_all">
            {t("home.viewAll")} <span aria-hidden>&gt;</span>
          </Link>
        </div>

        {showRowSkeleton ? (
          <div className="home_new_arrivals_panel__skeleton">
            <UXSkeleton count={skeletonSlots} />
          </div>
        ) : (
          <HomeHorizontalScrollRow className="home_new_arrivals_row" depKey={displayItems.length}>
            {displayItems.map((item, idx) => {
              const trust = resolveTrustLine(item, t);
              const productLink = buildProductDetailUrl(item) || ROUTES.PRODUCT_LISTING;
              return (
                <Link
                  key={item?._id || item?.id || idx}
                  to={productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="new_arrival_img new_arrival_product_card text-start text-decoration-none d-block text-reset"
                >
                  <div className="new_arrival_media">
                    <InCartBadge product={item} />
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
                      {trust ? (
                        <p className="home_product_meta mb-0">{trust}</p>
                      ) : (
                        <SupplierVerificationBadge item={item} />
                      )}
                      <span className="home_product_cta">{t("home.viewDetails")}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </HomeHorizontalScrollRow>
        )}
      </section>
    </div>
  );
}
