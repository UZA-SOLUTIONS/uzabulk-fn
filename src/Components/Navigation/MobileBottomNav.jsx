import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { apiGetCartCount } from "../../store/cart/actions";

const ICON_SHOP = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M4 9.5L5.2 4.8A1.5 1.5 0 0 1 6.66 3.7h10.68a1.5 1.5 0 0 1 1.46 1.1L20 9.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9.5h16v9.2A1.8 1.8 0 0 1 18.2 20.5H5.8A1.8 1.8 0 0 1 4 18.7V9.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M9 13.5v3M15 13.5v3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const ICON_CATEGORY = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const ICON_CART = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3.5 5h1.6l1.1 11.2a1.6 1.6 0 0 0 1.6 1.4h9.3a1.6 1.6 0 0 0 1.6-1.35L20 8.2H7"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="20" r="1.25" fill="currentColor" />
    <circle cx="17" cy="20" r="1.25" fill="currentColor" />
  </svg>
);

const ICON_ME = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const ACCOUNT_PATH_PREFIXES = [
  ROUTES.PROFILE,
  ROUTES.MY_ORDERS,
  ROUTES.ORDER_DETAIL,
  ROUTES.ORDER_ADDRESS,
  ROUTES.CREATE_ADDRESS,
  ROUTES.CHANGE_PASSWORD,
];

function isAccountPath(pathname = "") {
  return ACCOUNT_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLogin } = useSelector((s) => s.auth);
  const cartCount = Number(useSelector((s) => s.cart.count)) || 0;
  const pathname = location.pathname;

  useEffect(() => {
    if (!isLogin) return;
    const timer = setTimeout(() => {
      dispatch(apiGetCartCount());
    }, 0);
    return () => clearTimeout(timer);
  }, [dispatch, isLogin]);

  const isShopActive = pathname === ROUTES.HOME;
  const isCategoryActive =
    pathname === ROUTES.CATEGORIES || pathname === ROUTES.PRODUCT_LISTING;
  const isCartActive = pathname === ROUTES.CART || pathname === ROUTES.CHECKOUT;
  const isMeActive = isAccountPath(pathname);

  const goToAccount = (event) => {
    event.preventDefault();
    if (isLogin) {
      navigate(ROUTES.MY_ORDERS);
      return;
    }
    navigate(`${ROUTES.HOME}?auth=signin`);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label={t("nav.mobileNav")}>
      <Link
        to={ROUTES.HOME}
        className={`mobile-bottom-nav__item${isShopActive ? " is-active" : ""}`}
        aria-current={isShopActive ? "page" : undefined}
      >
        <span className="mobile-bottom-nav__icon">{ICON_SHOP}</span>
        <span className="mobile-bottom-nav__label">{t("nav.shop")}</span>
      </Link>

      <Link
        to={ROUTES.CATEGORIES}
        className={`mobile-bottom-nav__item${isCategoryActive ? " is-active" : ""}`}
        aria-current={isCategoryActive ? "page" : undefined}
      >
        <span className="mobile-bottom-nav__icon">{ICON_CATEGORY}</span>
        <span className="mobile-bottom-nav__label">{t("nav.category")}</span>
      </Link>

      <Link
        to={ROUTES.CART}
        className={`mobile-bottom-nav__item${isCartActive ? " is-active" : ""}`}
        aria-current={isCartActive ? "page" : undefined}
      >
        <span className="mobile-bottom-nav__icon mobile-bottom-nav__icon--cart">
          {ICON_CART}
          {cartCount > 0 ? (
            <span className="mobile-bottom-nav__badge">
              {cartCount > 99 ? "99+" : String(cartCount)}
            </span>
          ) : null}
        </span>
        <span className="mobile-bottom-nav__label">{t("nav.cart")}</span>
      </Link>

      <a
        href={isLogin ? ROUTES.MY_ORDERS : `${ROUTES.HOME}?auth=signin`}
        className={`mobile-bottom-nav__item${isMeActive ? " is-active" : ""}`}
        aria-current={isMeActive ? "page" : undefined}
        onClick={goToAccount}
      >
        <span className="mobile-bottom-nav__icon">{ICON_ME}</span>
        <span className="mobile-bottom-nav__label">{t("nav.me")}</span>
      </a>
    </nav>
  );
};

export default MobileBottomNav;
