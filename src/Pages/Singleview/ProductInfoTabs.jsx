import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import FeatureAttributes from "./FeatureAttributes";
import ProductDescriptionGallery, {
  splitProductDescriptionHtml,
} from "./ProductDescriptionGallery";

export default function ProductInfoTabs({
  detail,
  displayDetail,
  descriptionHtml = "",
}) {
  const { t } = useTranslation();
  const { textHtml, images } = useMemo(
    () => splitProductDescriptionHtml(descriptionHtml),
    [descriptionHtml]
  );

  const hasDescription = Boolean(textHtml?.trim() || images.length);
  const hasAttributes = Boolean(
    (displayDetail?.featureAttribute || detail?.featureAttribute)?.length
  );

  const [activeTab, setActiveTab] = useState("attributes");

  useEffect(() => {
    if (hasAttributes) setActiveTab("attributes");
    else if (hasDescription) setActiveTab("description");
  }, [detail?._id, hasDescription, hasAttributes]);

  if (!hasDescription && !hasAttributes) return null;

  const showTabs = hasDescription && hasAttributes;
  const panel = showTabs ? activeTab : hasAttributes ? "attributes" : "description";

  return (
    <section className="product-info-tabs w-100">
      {showTabs ? (
        <div className="product-info-tabs__nav" role="tablist" aria-label={t("product.details")}>
          <button
            type="button"
            role="tab"
            id="product-tab-attributes"
            aria-selected={panel === "attributes"}
            aria-controls="product-panel-attributes"
            className={`product-info-tabs__tab${panel === "attributes" ? " is-active" : ""}`}
            onClick={() => setActiveTab("attributes")}
          >
            {t("product.attributes")}
          </button>
          <button
            type="button"
            role="tab"
            id="product-tab-description"
            aria-selected={panel === "description"}
            aria-controls="product-panel-description"
            className={`product-info-tabs__tab${panel === "description" ? " is-active" : ""}`}
            onClick={() => setActiveTab("description")}
          >
            {t("product.description")}
          </button>
        </div>
      ) : null}

      {panel === "attributes" && hasAttributes ? (
        <div
          id="product-panel-attributes"
          role="tabpanel"
          aria-labelledby={showTabs ? "product-tab-attributes" : undefined}
          className="product-info-tabs__panel"
        >
          <FeatureAttributes
            detail={detail}
            displayDetail={displayDetail}
            hideTitle={showTabs}
            hideDivider
          />
        </div>
      ) : null}

      {panel === "description" && hasDescription ? (
        <div
          id="product-panel-description"
          role="tabpanel"
          aria-labelledby={showTabs ? "product-tab-description" : undefined}
          className="product-info-tabs__panel product_description"
        >
          {!showTabs ? (
            <h3 className="product-info-tabs__solo-title">{t("product.description")}</h3>
          ) : null}
          {images.length ? (
            <ProductDescriptionGallery images={images} />
          ) : null}
          {textHtml?.trim() ? (
            <div
              className="uza-product-description"
              dangerouslySetInnerHTML={{ __html: textHtml }}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
