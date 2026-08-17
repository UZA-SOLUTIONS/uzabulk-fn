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
import { apiGetHomepageFeed } from "../../store/products/actions";

import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";
import InCartBadge from "../Common/InCartBadge";
import SupplierVerificationBadge from "../Products/SupplierVerificationBadge";
import TranslatedProductName from "../Common/TranslatedProductName";
import HomeHorizontalScrollRow from "./HomeHorizontalScrollRow";

const FOR_YOU_LIMIT = 12;

const isTestProduct = (item) => {
  const name = (item?.name || "").toLowerCase().trim();
  return !name || name.includes("test");
};

export default function HomepageForYou() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [feedRefresh, setFeedRefresh] = useState(() => getHomeFeedRefreshToken());
  const { isLoading, items } = useSelector((s) => s.products.homeRecommendedProducts);
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);

  const displayItems = useMemo(
    () => (items || []).filter((item) => !isTestProduct(item)).slice(0, FOR_YOU_LIMIT),
    [items]
  );

  useEffect(() => {
    const syncDayToken = () => setFeedRefresh(getHomeFeedRefreshToken());
    const intervalId = window.setInterval(syncDayToken, 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncDayToken();
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
      apiGetHomepageFeed({
        limit: FOR_YOU_LIMIT,
        refresh: feedRefresh,
        suppressGlobalErrorToast: true,
        signal: ac.signal,
      })
    );
    return () => ac.abort();
  }, [dispatch, feedRefresh]);

  const showRowSkeleton = isLoading && !displayItems.length;
  if (!showRowSkeleton && !displayItems.length) return null;

  return (
    <div className="home_feed_section_offset home_for_you_section w-100">
      <section
        className="home_new_arrivals_panel"
        aria-labelledby="home-for-you-title"
        aria-busy={showRowSkeleton}
      >
        <div className="home_new_arrivals_panel__head">
          <h2 id="home-for-you-title" className="home_new_arrivals_panel__title">
            {t("home.forYou")}
          </h2>
          <Link to={ROUTES.PRODUCT_LISTING} className="home_new_arrivals_panel__view_all">
            {t("home.viewAll")} <span aria-hidden>&gt;</span>
          </Link>
        </div>

        {showRowSkeleton ? (
          <div className="home_new_arrivals_panel__skeleton">
            <UXSkeleton count={6} />
          </div>
        ) : (
          <HomeHorizontalScrollRow className="home_new_arrivals_row" depKey={displayItems.length}>
            {displayItems.map((item, idx) => {
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
                      <SupplierVerificationBadge item={item} />
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
