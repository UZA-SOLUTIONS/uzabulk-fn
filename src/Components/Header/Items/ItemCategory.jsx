import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ROUTES from "../../../helpers/routesHelper";

export default function ItemCategory() {
  const { t } = useTranslation();
  return (
    <li className="productmenu">
      <Link
        to={ROUTES.CONTACT_US}
        className="categories-nav-trigger"
        aria-label={t("nav.help")}
      >
        <span className="categories-nav-trigger__icon" aria-hidden>
          {helpIcon}
        </span>
        <span className="categories-nav-trigger__label">{t("nav.help")}</span>
      </Link>
    </li>
  );
}

const helpIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M9.6 9.2a2.5 2.5 0 0 1 4.85.8c0 1.5-2.2 2.1-2.2 3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);
