import React from "react";
import { useTranslation } from "react-i18next";

import useCartProductKeys from "../../hooks/useCartProductKeys";
import { getProductDedupeKey } from "../../helpers/commonHelper";

/** Shows an "In cart" badge when the product is already in the user's cart. */
export default function InCartBadge({ product, className = "" }) {
  const { t } = useTranslation();
  const { keys } = useCartProductKeys();
  const key = getProductDedupeKey(product);
  if (!key || !keys.has(key)) return null;

  return (
    <span className={`home_in_cart_badge${className ? ` ${className}` : ""}`}>
      {t("home.cartBadge")}
    </span>
  );
}
