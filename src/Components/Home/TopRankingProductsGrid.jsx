import React, { useEffect } from "react";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { apiGetHomeTopRankingProducts } from "../../store/products/actions";
import ROUTES from "../../helpers/routesHelper";
import { amountConversion, buildProductDetailUrl, getProductImageUrl } from "../../helpers/commonHelper";
import placeholder from "../../assets/images/gurfive.jpg";
import TranslatedProductName from "../Common/TranslatedProductName";
import InCartBadge from "../Common/InCartBadge";

const TopRankingProductsGrid = ({ withContainer = true }) => {
  const dispatch = useDispatch();
  const { isLoading, items, message } = useSelector(
    (s) => s.products.homeTopRankingProducts
  );
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);

  useEffect(() => {
    if (items?.length) return undefined;
    const ac = new AbortController();
    dispatch(
      apiGetHomeTopRankingProducts({
        limit: 16,
        signal: ac.signal,
        suppressGlobalErrorToast: true,
      })
    );
    return () => ac.abort();
  }, [dispatch, items?.length]);

  const resolveTrustText = (item) => {
    const moq = item?.moq || item?.minimumOrderQuantity || item?.minOrderQuantity;
    const sold = item?.sold || item?.totalSold || item?.orderCount;
    if (moq && sold) return `MOQ ${moq} • ${sold} sold`;
    if (moq) return `MOQ ${moq}`;
    if (sold) return `${sold} sold`;
    return "";
  };

  const content = (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0 text-start">All Top Ranking Products</h4>
        <Link to={ROUTES.TOP_RANKING_PRODUCT_LISTING}>View More</Link>
      </div>

      <div className="new_Arrivals product_square_grid top_ranking_grid_compact mt-3">
        {(items || []).slice(0, 12).map((item) => {
          const productLink = buildProductDetailUrl(item) || "#";
          const resolvedId = Boolean(productLink && productLink !== "#");
          return (
            <Link
              key={item._id || item?.id || item?.offerId}
              to={productLink}
              target="_blank"
              rel="noopener noreferrer"
              className="new_arrival_img new_arrival_product_card top_ranking_card_compact cursor-pointer text-start"
              style={{
                textDecoration: "none",
                pointerEvents: resolvedId ? "auto" : "none",
                opacity: resolvedId ? 1 : 0.6,
              }}
            >
              <div className="new_arrival_media">
                <InCartBadge product={item} />
                <img
                  src={getProductImageUrl(item, placeholder)}
                  alt={item?.name || "Product"}
                  className="img-fluid"
                />
              </div>
              <div className="home_product_card_body px-1 pt-2">
                <TranslatedProductName product={item} className="home_product_title mb-1" as="p" />
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
            </Link>
          );
        })}
      </div>

      {!isLoading && !items?.length ? (
        <p className="text-start mt-3 mb-0">{message || "No top ranking products found."}</p>
      ) : null}
    </>
  );

  return (
    <section className="py-4 products_card products_card_compact">
      {withContainer ? <Container>{content}</Container> : content}
    </section>
  );
};

export default TopRankingProductsGrid;
