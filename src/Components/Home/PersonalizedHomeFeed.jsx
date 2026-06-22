import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ROUTES from "../../helpers/routesHelper";
import {
  amountConversion,
  buildProductDetailUrl,
  buildProductDetailUrlFromResolved,
  getProductImageUrl,
  resolveCatalogProductId,
} from "../../helpers/commonHelper";

import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";
import SupplierVerificationBadge from "../Products/SupplierVerificationBadge";

const DISPLAY_LIMIT = 12;

function resolveTrustLine(item) {
  const moq = item?.moq || item?.minimumOrderQuantity || item?.minOrderQuantity;
  const sold = item?.sold || item?.totalSold || item?.orderCount;
  if (moq && sold) return `MOQ ${moq} • ${sold} sold`;
  if (moq) return `MOQ ${moq}`;
  if (sold) return `${sold} sold`;
  return "";
}

export default function PersonalizedHomeFeed() {
  const navigate = useNavigate();
  const { isLoading, items } = useSelector((s) => s.products.homeRecommendedProducts);
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);

  const displayItems = useMemo(
    () => (items || []).slice(0, DISPLAY_LIMIT),
    [items]
  );

  const showSkeleton = isLoading && !displayItems.length;
  if (!showSkeleton && !displayItems.length) {
    return null;
  }

  return (
    <div className="home_feed_section_offset px-3 w-100">
      <section
        className="home_new_arrivals_panel home_personalized_feed"
        aria-labelledby="home-picked-for-you-title"
        aria-busy={showSkeleton}
      >
        <div className="home_new_arrivals_panel__head">
          <h2 id="home-picked-for-you-title" className="home_new_arrivals_panel__title">
            Picked for you
          </h2>
          <Link to={ROUTES.PRODUCT_LISTING} className="home_new_arrivals_panel__view_all">
            Browse more <span aria-hidden>&gt;</span>
          </Link>
        </div>

        {showSkeleton ? (
          <div className="home_new_arrivals_panel__skeleton">
            <UXSkeleton count={6} />
          </div>
        ) : (
          <div className="home_new_arrivals_row">
            {displayItems.map((item, idx) => {
              const trust = resolveTrustLine(item);
              return (
                <Link
                  key={item?._id || item?.id || idx}
                  to={ROUTES.PRODUCT_LISTING}
                  className="new_arrival_img new_arrival_product_card text-start text-decoration-none d-block text-reset"
                  onClick={async (e) => {
                    e.preventDefault();
                    const resolved = await resolveCatalogProductId(item);
                    const path = resolved
                      ? buildProductDetailUrlFromResolved(resolved)
                      : buildProductDetailUrl(item);
                    if (path) navigate(path);
                  }}
                >
                  <div className="new_arrival_media">
                    <img
                      src={getProductImageUrl(item, placeholder)}
                      alt={item?.name || "Product"}
                      className="img-fluid"
                      loading="lazy"
                    />
                  </div>
                  <div className="home_product_card_body px-1 pt-2">
                    <p className="home_product_title mb-1">{item?.name}</p>
                    <p className="home_product_price mb-1">
                      {currentCurrency?.symbol} {amountConversion(item?.price, appConfig)}
                    </p>
                    <div className="home_product_footer">
                      {trust ? (
                        <p className="home_product_meta mb-0">{trust}</p>
                      ) : (
                        <SupplierVerificationBadge item={item} />
                      )}
                      <span className="home_product_cta">View details</span>
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
