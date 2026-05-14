import React, { useEffect, Suspense, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col } from "react-bootstrap";

import ROUTES from "../../helpers/routesHelper";
import { amountConversion, getProductImageUrl, smoothScrollToTop, logger } from "../../helpers/commonHelper";
import { apiGetHomeNewArrivalProducts } from "../../store/products/actions";

import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";

export default function NewArrivalProducts() {
  const dispatch = useDispatch();
  const { isLoading, items, total } = useSelector(
    (s) => s.products.homeNewArrivalProducts
  );
  const { items: recommendedItems } = useSelector(
    (s) => s.products.homeRecommendedProducts
  );
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);
  logger("NEW ARRIVAL PRODUCT SLIDER", items);
  const limit = 100;
  const navigate = useNavigate();
  const filteredItems = (items || []).filter((item) => {
    const name = (item?.name || "").toLowerCase().trim();
    return name && !name.includes("test");
  });
  const filteredRecommended = (recommendedItems || []).filter((item) => {
    const name = (item?.name || "").toLowerCase().trim();
    return name && !name.includes("test");
  });
  const displayItems = useMemo(() => {
    const seen = new Set();
    const merged = [];
    [...filteredRecommended, ...filteredItems].forEach((item) => {
      const key = item?._id || item?.id || item?.productId || item?.offerId;
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    return merged;
  }, [filteredRecommended, filteredItems]);
  const resolveTrustText = (item) => {
    const moq = item?.moq || item?.minimumOrderQuantity || item?.minOrderQuantity;
    const sold = item?.sold || item?.totalSold || item?.orderCount;
    if (moq && sold) return `MOQ ${moq} • ${sold} sold`;
    if (moq) return `MOQ ${moq}`;
    if (sold) return `${sold} sold`;
    return "";
  };
  const handleOpenProduct = (item) => {
    const fallbackOfferId = item?.offerId || item?.topIds || "";
    const resolvedId = item?._id || item?.id || item?.productId || fallbackOfferId;
    if (!resolvedId) return;
    smoothScrollToTop();
    const offerQuery = fallbackOfferId ? `?offerId=${encodeURIComponent(fallbackOfferId)}` : "";
    navigate(`${ROUTES.PRODUCT_DETAIL}/${encodeURIComponent(resolvedId)}${offerQuery}`);
  };

  useEffect(() => {
    if (!items?.length)
      dispatch(
        apiGetHomeNewArrivalProducts({
          limit: limit,
        })
      );
  }, [dispatch, items?.length]);

  const LoadingFallback = () => (
    <div className="discover_card px-3 h-100 w-100">
      <div className="card_top_head d-flex align-items-center justify-content-between">
        <h4>New Arrivals</h4>
      </div>
      <div className="card_white mt-3 w-100">
        <UXSkeleton type="product-grid" count={12} />
      </div>
    </div>
  );

  return (
    <>
      {isLoading ? (
        <Suspense fallback={<LoadingFallback />}>
          <LoadingFallback />
        </Suspense>
      ) : (
        <div className="discover_card home_feed_section_offset px-3 h-100 w-100">
          <div className="card_top_head d-flex align-items-center justify-content-center">
            <h4 className="home_section_title_line">New Arrivals</h4>
            <Link to={ROUTES.NEW_ARRIVALS_PRODUCT_LISTING} className="home_section_view_more">
              View More
            </Link>
          </div>

          <div className="card_white mt-3">
            <Row className="g-3 align-items-start">
              <Col md={12}>
                <div className="new_Arrivals new_Arrivals_many product_square_grid mt-3">
                  {displayItems.slice(0, 100).map((item, idx) => (
                    <div
                      className="new_arrival_img new_arrival_product_card cursor-pointer text-start"
                      key={item?._id || idx}
                      onClick={() => handleOpenProduct(item)}
                    >
                      <div className="new_arrival_media">
                        <img
                          src={getProductImageUrl(item, placeholder)}
                          alt={item?.name || "New arrival product"}
                          className="img-fluid"
                        />
                      </div>
                      <div className="home_product_card_body px-1 pt-2">
                        <p className="home_product_title mb-1">
                          {item?.name}
                        </p>
                        <p className="home_product_price mb-1">
                          {currentCurrency?.symbol} {amountConversion(item?.price, appConfig)}
                        </p>
                        <div className="home_product_footer">
                          {resolveTrustText(item) ? (
                            <p className="home_product_meta mb-0">{resolveTrustText(item)}</p>
                          ) : (
                            <img src="/verified.avif" alt="Verified" className="home_verified_badge" />
                          )}
                          <span className="home_product_cta">View details</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          </div>
        </div>
      )}
    </>
  );
}
