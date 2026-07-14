import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import {
  amountConversion,
  buildProductDetailUrl,
  getProductImageUrl,
} from "../../helpers/commonHelper";
import placeholder from "../../assets/images/default_name.webp";
import SupplierVerificationBadge from "./SupplierVerificationBadge";
import useProductDisplayName from "../../hooks/useProductDisplayName";

export default function ProductCard({ item, onOpen }) {
  const { t } = useTranslation();
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);

  const moq = item?.moq || item?.minimumOrderQuantity || item?.minOrderQuantity;
  const sold = item?.sold || item?.totalSold || item?.orderCount || item?.sold_count;
  let trust = "";
  if (moq && sold) trust = t("product.moqSold", { moq, sold });
  else if (moq) trust = t("product.moqOnly", { moq });
  else if (sold) trust = t("product.soldOnly", { sold });

  const productLink = buildProductDetailUrl(item);
  const isOut =
    (!item?.manage_stock && item?.stock_status === "outofstock")
    || (item?.manage_stock && Number(item?.stock_quantity) === 0);

  const displayName = useProductDisplayName(item);
  const className = "new_arrival_img new_arrival_product_card cursor-pointer text-start";

  const content = (
    <>
      <div className="new_arrival_media position-relative">
        <img
          src={getProductImageUrl(item, placeholder)}
          alt={displayName || t("home.viewDetails")}
          className="img-fluid"
          loading="lazy"
        />
        {isOut ? (
          <span className="products_listing_stock_badge">{t("product.outOfStock")}</span>
        ) : null}
      </div>
      <div className="home_product_card_body px-1 pt-2">
        <p className="home_product_title mb-1">{displayName}</p>
        <p className="home_product_price mb-1">
          {currentCurrency?.symbol}{" "}
          {amountConversion(item?.price, appConfig)}
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
    </>
  );

  if (!productLink) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link
      to={productLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} text-decoration-none text-reset d-block`}
      onClick={() => onOpen?.(item)}
    >
      {content}
    </Link>
  );
}
