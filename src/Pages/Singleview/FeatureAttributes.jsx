import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "react-bootstrap";

import useProductDetailTranslation from "../../hooks/useProductDetailTranslation";
import {
  resolveFeatureAttributeLabel,
  resolveFeatureAttributeValue,
  resolveProductDetailId,
} from "../../helpers/productDetailTranslationHelper";

export default function FeatureAttributes({
  detail,
  displayDetail: displayDetailProp,
  hideTitle = false,
  hideDivider = false,
}) {
  const { t } = useTranslation();
  const [viewMore, setViewMore] = useState(false);
  const translatedDetail = useProductDetailTranslation(detail);
  const displayDetail = displayDetailProp || translatedDetail || detail;
  const productId = resolveProductDetailId(detail);
  const details = displayDetail?.featureAttribute || detail?.featureAttribute;

  if (!details?.length) return null;

  const toggleViewMore = () => {
    setViewMore((s) => !s);
  };

  return (
    <>
      <Row className={`text-start product_attribute${hideTitle ? " product_attribute--embedded" : ""}`}>
        {!hideTitle ? (
          <Col lg="12">
            <h3>{t("product.attributes")}</h3>
          </Col>
        ) : null}
        <Col lg="12">
          <ul className="d-flex flex-wrap text-decoration-none ps-0 mb-0">
            {details.map((attr, key) => {
              if (!viewMore && key > 9) return null;

              const label = resolveFeatureAttributeLabel(attr, productId, key);
              const value = resolveFeatureAttributeValue(attr, productId, key);

              return (
                <li key={key} className="d-flex w-50">
                  <span className="w-50 py-2 px-3 border bg-body-tertiary">{label}</span>
                  <span className="w-50 py-2 px-3 border">{value}</span>
                </li>
              );
            })}
          </ul>
        </Col>

        {!viewMore && details.length > 10 ? (
          <Col lg="12" className="my-2">
            <p
              className="cursor-pointer fw-semibold text-decoration-underline mt-3"
              onClick={toggleViewMore}
            >
              {t("product.showMore")}
            </p>
          </Col>
        ) : null}
      </Row>
      {!hideDivider ? <hr className="my-5" /> : null}
    </>
  );
}
