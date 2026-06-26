import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

import { apiGetCartCount } from "../../store/cart/actions";
import { apiGetProfile } from "../../store/auth/actions";
import { ICON_CART, ICON_USER_SECONDARY } from "../../assets/svg";
import { formatNumber } from "../../helpers/commonHelper";
import { getLanguageMeta, setSiteLanguage } from "../../helpers/languageHelper";
import { SUPPORTED_LANGUAGES } from "../../i18n";
import LoginPopup from "../LoginPopup";
import UserAccountAvatar from "./UserAccountAvatar";
import ROUTES from "../../helpers/routesHelper";

const AUTH_QUERY_SIGNIN = "signin";
const AUTH_QUERY_SIGNUP = "signup";

function authQueryToModalTab(authParam) {
  if (authParam === AUTH_QUERY_SIGNIN) return "signin";
  if (authParam === AUTH_QUERY_SIGNUP) return "signup";
  return null;
}

const ICON_GLOBE = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M3 12h18M12 3c2.8 3.2 2.8 14.8 0 18M12 3c-2.8 3.2-2.8 14.8 0 18"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

function LanguageSwitcher({ className = "" }) {
  const { i18n, t } = useTranslation();
  const [activeCode, setActiveCode] = useState(() => getLanguageMeta().code);

  useEffect(() => {
    const onLanguageChanged = (code) => {
      setActiveCode(code === "fr" ? "fr" : "en");
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => i18n.off("languageChanged", onLanguageChanged);
  }, [i18n]);

  const activeMeta = getLanguageMeta(activeCode);

  const handleSelect = (code) => {
    void setSiteLanguage(code);
  };

  return (
    <UncontrolledDropdown direction="down" className={className}>
      <DropdownToggle
        caret={false}
        className="navbar-mockup-lang-toggle"
        tag="button"
        type="button"
        aria-label={t("language.selectLanguage")}
      >
        <span className="navbar-mockup-lang-toggle__icon" aria-hidden>
          {ICON_GLOBE}
        </span>
        <span>{activeMeta.short}</span>
      </DropdownToggle>
      <DropdownMenu end className="navbar-mockup-lang-menu">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownItem
            key={lang.code}
            active={activeCode === lang.code}
            onClick={() => handleSelect(lang.code)}
          >
            {lang.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

export default function UserAuthCard({
  showCart = true,
  showAccount = true,
  signupButtonLabel,
  className = "",
  /** `mockupTop` / `mockupBottom`: split navbar per homepage mockup. */
  navbarPlacement = "legacy",
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLogin, user, profile } = useSelector((s) => s.auth);
  const cartItems = useSelector((s) => s.cart.count);
  const accountUser = profile || user;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("signin");
  const resolvedSignupLabel = signupButtonLabel || t("nav.getStarted");

  const isMockupBottom = navbarPlacement === "mockupBottom";
  const isMockupTop = navbarPlacement === "mockupTop";
  const runAuthQuerySync = !isMockupBottom;
  const runCartWarmup =
    isMockupTop || isMockupBottom || navbarPlacement === "legacy";

  useEffect(() => {
    if (!runCartWarmup || !isLogin) return;
    const timer = setTimeout(() => {
      dispatch(apiGetCartCount());
    }, 0);
    return () => clearTimeout(timer);
  }, [dispatch, isLogin, runCartWarmup]);

  useEffect(() => {
    if (!isLogin) return;
    dispatch(apiGetProfile());
  }, [dispatch, isLogin]);

  useEffect(() => {
    if (!runAuthQuerySync) return;
    const params = new URLSearchParams(location.search);
    const authParam = params.get("auth");
    const modalTab = authQueryToModalTab(authParam);
    if (!modalTab) return;

    if (isLogin) {
      params.delete("auth");
      const next = params.toString();
      navigate(
        { pathname: location.pathname, search: next ? `?${next}` : "" },
        { replace: true }
      );
      return;
    }

    setAuthModalTab(modalTab);
    setIsAuthModalOpen(true);
    params.delete("auth");
    const next = params.toString();
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : "" },
      { replace: true }
    );
  }, [isLogin, location.pathname, location.search, navigate, runAuthQuerySync]);

  const openAuthModal = (tab = "signin") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  if (isMockupTop) {
    return (
      <div className={`navbar-mockup-top-auth ${className}`}>
        {!isLogin ? (
          <>
            <button type="button" className="navbar-mockup-signin" onClick={() => openAuthModal("signin")}>
              {t("nav.signIn")}
            </button>
            <button
              type="button"
              className="navbar-mockup-get-started"
              onClick={() => openAuthModal("signup")}
            >
              {resolvedSignupLabel}
            </button>
            <LoginPopup
              show={isAuthModalOpen}
              initialTab={authModalTab}
              handleClose={() => setIsAuthModalOpen(false)}
            />
          </>
        ) : (
          <Link to={ROUTES.MY_ORDERS} className="navbar-mockup-account-link navbar-mockup-account-link--avatar" aria-label={t("nav.myAccount")}>
            <UserAccountAvatar user={accountUser} size={34} className="navbar-mockup-account-avatar" />
          </Link>
        )}
      </div>
    );
  }

  if (isMockupBottom) {
    const n = Number(cartItems) || 0;
    return (
      <div
        className={`navbar-mockup-bottom-tools user_card_below_header ${className}`}
      >
        <Link to={ROUTES.CART} className="navbar-mockup-cart" aria-label={t("nav.shoppingCart")}>
          <span className="navbar-mockup-cart-icon" aria-hidden>
            {ICON_CART}
          </span>
          {n > 0 ? (
            <span className="navbar-mockup-cart-badge">{n > 99 ? "99+" : String(n)}</span>
          ) : null}
        </Link>
        <span className="navbar-mockup-vrule" aria-hidden />
        <LanguageSwitcher />
      </div>
    );
  }

  return (
    <div className={`user_card ${className}`}>
      {showCart ? (
        <div className="align-itmes-center cardone_wallet d-flex">
          <Link to={ROUTES.CART} className="d-flex align-items-center">
            <span className="me-2">{ICON_CART}</span>
            <div className="card_content">
              <h5>{t("nav.cart")}</h5>
              {cartItems ? (
                <small className="text-theme-secondary">
                  {formatNumber(cartItems)} {cartItems > 1 ? t("nav.items") : t("nav.item")}
                </small>
              ) : null}
            </div>
          </Link>
        </div>
      ) : null}

      {showCart && showAccount ? <div className="dividerline_verticle"></div> : null}

      <span className="navbar-mockup-vrule d-none d-md-inline" aria-hidden />
      <LanguageSwitcher className="d-none d-md-inline-flex" />

      {showCart && showAccount ? <div className="dividerline_verticle d-none d-md-block"></div> : null}

      {showAccount ? (
        !isLogin ? (
          <div className="card_user align-items-center d-flex">
            <UncontrolledDropdown>
              <DropdownToggle className="bg-transparent border-0 p-0">
                <div className="d-flex align-items-center">
                  <span className="me-2">{ICON_USER_SECONDARY}</span>
                  <div className="card_content">
                    <h5>{t("nav.account")}</h5>
                  </div>
                </div>
              </DropdownToggle>
              <DropdownMenu end className="account-compact-menu">
                <DropdownItem tag="button" type="button" onClick={() => openAuthModal("signin")}>
                  {t("nav.signIn")}
                </DropdownItem>
                <DropdownItem tag="button" type="button" onClick={() => openAuthModal("signup")}>
                  {t("nav.signUp")}
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        ) : (
          <div className="card_user align-items-center d-flex">
            <UncontrolledDropdown>
              <DropdownToggle>
                <Link to={ROUTES.MY_ORDERS}>
                  <div className="d-flex align-items-center">
                    <UserAccountAvatar user={accountUser} size={36} className="me-2" />
                    <div className="card_content">
                      <h5>{t("nav.myAccount")}</h5>
                    </div>
                  </div>
                </Link>
              </DropdownToggle>
            </UncontrolledDropdown>
          </div>
        )
      ) : null}

      {!isLogin ? (
        <LoginPopup
          show={isAuthModalOpen}
          initialTab={authModalTab}
          handleClose={() => setIsAuthModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
