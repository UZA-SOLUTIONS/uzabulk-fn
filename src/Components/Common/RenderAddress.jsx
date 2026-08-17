import React from "react";
import { useTranslation } from "react-i18next";
import { formatPinnedCoords, hasPinnedLocation } from "../../helpers/locationHelper";

export default function RenderAddress({ address, joinWith = ", ", className = "", style = { lineHeight: "1.7rem" } }) {
  const { t } = useTranslation();

  if (!address) return null;

  const pinned = hasPinnedLocation(address);
  const phone = `${address?.countryCode || ""} ${address?.mobileNumber || ""}`.trim();

  // GPS pins: show contact + lat/lng only (no OSM place names).
  if (pinned) {
    const contact = [address?.name, phone].filter(Boolean).join(joinWith);
    return (
      <>
        {contact ? (
          <p style={style} className={className}>
            {contact}
          </p>
        ) : null}
        <span className="address_pinned_chip">
          {t("address.pinnedLocation")}
          <span className="address_pinned_chip__coords">
            {formatPinnedCoords(address)}
          </span>
        </span>
      </>
    );
  }

  const parts = [
    address?.name,
    phone,
    address?.area,
    address?.houseNo,
    address?.landmark,
    address?.address,
  ].filter(Boolean);

  return (
    <p style={style} className={className}>
      {parts.join(joinWith)}
    </p>
  );
}
