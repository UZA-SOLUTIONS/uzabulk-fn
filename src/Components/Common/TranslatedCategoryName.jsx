import React from "react";
import { useTranslation } from "react-i18next";

import useCategoryDisplayName from "../../hooks/useCategoryDisplayName";

export default function TranslatedCategoryName({
  category,
  className = "",
  as: Tag = "span",
  fallback,
  children,
  ...rest
}) {
  const { t } = useTranslation();
  const displayName = useCategoryDisplayName(category);

  return (
    <Tag className={className} {...rest}>
      {displayName || fallback || children || t("home.categoryFallback")}
    </Tag>
  );
}
