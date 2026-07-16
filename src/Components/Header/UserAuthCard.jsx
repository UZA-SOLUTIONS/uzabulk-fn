import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const ICON_CHEVRON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_LANGUAGE = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M3 12h18M12 3c2.8 3.2 2.8 14.8 0 18M12 3c-2.8 3.2-2.8 14.8 0 18"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

function LanguageSwitcher({ className = "" }) {
  const { i18n, t } = useTranslation();
  const [activeCode, setActiveCode] = useState(() => getLanguageMeta().code);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const onLanguageChanged = (code) => {
      setActiveCode(code === "fr" ? "fr" : "en");
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => i18n.off("languageChanged", onLanguageChanged);
  }, [i18n]);

  useLayoutEffect(() => {
    if (!open || !toggleRef.current) {
      setMenuStyle(null);
      return undefined;
    }

    const syncMenuPosition = () => {
      const rect = toggleRef.current.getBoundingClientRect();
      const gutter = 8;
      const estimatedWidth = 168;
      const left = Math.min(
        Math.max(gutter, rect.right - estimatedWidth),
        window.innerWidth - estimatedWidth - gutter
      );
      setMenuStyle({
        position: "fixed",
        top: Math.round(rect.bottom + 8),
        left: Math.round(left),
        right: "auto",
        minWidth: Math.max(estimatedWidth, Math.round(rect.width)),
        zIndex: 10050,
      });
    };

    syncMenuPosition();
    window.addEventListener("resize", syncMenuPosition);
    window.addEventListener("scroll", syncMenuPosition, true);
    return () => {
      window.removeEventListener("resize", syncMenuPosition);
      window.removeEventListener("scroll", syncMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeMeta = getLanguageMeta(activeCode);

  const handleSelect = (code) => {
    void setSiteLanguage(code);
    setOpen(false);
  };

  const menu = open && menuStyle ? (
    <ul
      ref={menuRef}
      className="navbar-lang-dd__menu navbar-lang-dd__menu--portal"
      role="listbox"
      aria-label={t("language.selectLanguage")}
      style={menuStyle}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = activeCode === lang.code;
        return (
          <li key={lang.code} role="none">
            <button
              type="button"
              role="option"
              aria-selected={isActive}
              className={`navbar-lang-dd__option${isActive ? " is-active" : ""}`}
              onClick={() => handleSelect(lang.code)}
            >
              <span className="navbar-lang-dd__option-badge" aria-hidden>
                {lang.short}
              </span>
              <span className="navbar-lang-dd__option-copy">
                <span className="navbar-lang-dd__option-name">{lang.native || lang.label}</span>
              </span>
              {isActive ? (
                <span className="navbar-lang-dd__check" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5l5 5L19 7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`navbar-lang-dd${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        ref={toggleRef}
        type="button"
        className="navbar-lang-dd__toggle"
        aria-label={t("language.selectLanguage")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="navbar-lang-dd__icon" aria-hidden>
          {ICON_LANGUAGE}
        </span>
        <span className="navbar-lang-dd__label">{activeMeta.native || activeMeta.label}</span>
        <span className={`navbar-lang-dd__chevron${open ? " is-open" : ""}`} aria-hidden>
          {ICON_CHEVRON}
        </span>
      </button>

      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
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

  const goToCart = (event) => {
    if (isLogin) return;
    event.preventDefault();
    if (isMockupBottom) {
      const params = new URLSearchParams(location.search);
      params.set("auth", "signin");
      navigate({ pathname: location.pathname, search: `?${params.toString()}` });
      return;
    }
    openAuthModal("signin");
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
        <Link
          to={ROUTES.CART}
          className="navbar-mockup-cart navbar-mockup-cart--with-label d-none d-md-inline-flex"
          aria-label={t("nav.shoppingCart")}
          onClick={goToCart}
        >
          <span className="navbar-mockup-cart-icon" aria-hidden>
            {ICON_CART}
            {n > 0 ? (
              <span className="navbar-mockup-cart-badge">{n > 99 ? "99+" : String(n)}</span>
            ) : null}
          </span>
          <span className="navbar-mockup-cart-label">{t("nav.cart")}</span>
        </Link>
        <span className="navbar-mockup-vrule d-none d-md-inline" aria-hidden>|</span>
        <LanguageSwitcher />
      </div>
    );
  }

  return (
    <div className={`user_card ${className}`}>
      {showCart ? (
        <div className="align-itmes-center cardone_wallet d-flex">
          <Link to={ROUTES.CART} className="d-flex align-items-center" onClick={goToCart}>
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
