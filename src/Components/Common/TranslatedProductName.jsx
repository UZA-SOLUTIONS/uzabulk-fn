import React from "react";

import useProductDisplayName from "../../hooks/useProductDisplayName";

export default function TranslatedProductName({
  product,
  name,
  id,
  className = "",
  as: Tag = "span",
  children,
  ...rest
}) {
  const item = product
    ? { ...product, name: String(product?.name || name || children || "").trim() }
    : { name: String(name || children || "").trim(), _id: id, id };
  const displayName = useProductDisplayName(item);

  return (
    <Tag className={className} {...rest}>
      {displayName}
    </Tag>
  );
}
