import { useState } from "react";
import { useTranslation } from "react-i18next";
import TrackOrderModal from "../../Modals/TrackOrderModal";

export default function ItemTrackOrder() {
  const { t } = useTranslation();
  const [showTrackModal, setShowTrackModal] = useState(false);

  return (
    <li className="productmenu">
      <button
        type="button"
        className="categories-nav-trigger track-order-nav-btn"
        aria-label={t("nav.trackOrder")}
        onClick={() => setShowTrackModal(true)}
      >
        <span className="categories-nav-trigger__icon" aria-hidden>
          {trackOrderIcon}
        </span>
        <span className="categories-nav-trigger__label">{t("nav.trackOrder")}</span>
      </button>

      <TrackOrderModal show={showTrackModal} onHide={() => setShowTrackModal(false)} />
    </li>
  );
}

const trackOrderIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3.5 7h11.5v10.5H3.5V7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M15 10h3.2l2.3 3v4.5H15V10Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="7.2" cy="18.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="17.2" cy="18.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
