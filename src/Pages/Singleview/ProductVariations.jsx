import { useDispatch } from "react-redux";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { onChangeVariation } from "../../helpers/cartHelper";
import { formatNumber, logger } from "../../helpers/commonHelper";

import { useTranslation } from "react-i18next";

export function ProductVariations({ detail, displayDetail, setShow, handlerAddToCart }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const viewDetail = displayDetail || detail;

  logger('attributes', detail.attributes);
  logger('variations', detail.variations);

  return (
    <>
      <div className="variants">
        <div className="variants_title">
          <h6>{t("product.variations")}</h6>
        </div>

        <div className="total_variation d-flex align-items-center gap-2">
          <p className="w-75 text-truncate">
            {t("product.totalOptions")}{" "}
            {detail?.attributes?.map((attribute, attrIndex) => {
              const viewAttr = viewDetail?.attributes?.[attrIndex] || attribute;
              return `${formatNumber(attribute?.terms?.length)} ${viewAttr.name}; `;
            })}
          </p>
        </div>

        <ul className="p-0">
          {detail?.attributes?.map((attribute, index) => {
            const viewAttr = viewDetail?.attributes?.[index] || attribute;
            return (
              <li key={index}>
                <div className="divone my-3">
                  <p className="m-0">
                    <strong>
                      {index + 1}. {viewAttr.name}({formatNumber(attribute?.terms?.length)}):
                    </strong>{" "}
                    {attribute.terms?.map((term, idx) => {
                      if (term?.active) return viewAttr.terms?.[idx]?.name || term.name;
                      return null;
                    })}
                  </p>

                  <div className="six_color d-flex flex-wrap align-items-center gap-1">
                    {attribute.terms?.map((term, idx) => {
                      const viewTerm = viewAttr.terms?.[idx] || term;
                      return (
                        <div
                          className="six_color d-flex align-items-center gap-1 cursor-pointer"
                          key={idx}
                        >
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id={`tooltip-${idx}`}>{viewTerm.name}</Tooltip>}
                          >
                            <div
                              className={
                                "ram_col d-flex align-items-center justify-content-center px-2 " +
                                (term?.active ? "active" : "")
                              }
                              onClick={() => {
                                onChangeVariation({
                                  dispatch,
                                  detail,
                                  termIndex: idx,
                                  attributeIndex: index,
                                });
                              }}
                            >
                              <p className="m-0 text-truncate">{viewTerm.name}</p>
                            </div>
                          </OverlayTrigger>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

    </>
  );
}
