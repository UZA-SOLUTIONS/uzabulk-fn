import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LogoutPopup from "../../Components/Modals/LogoutPopup";
import UserAccountAvatar from "../../Components/Header/UserAccountAvatar";
import ROUTES from "../../helpers/routesHelper";

import { apiLogout } from "../../store/auth/actions";
import { setCouponCode } from "../../store/cart/slice";

const pathStartsWith = (pathname, base) =>
  pathname === base || pathname.startsWith(`${base}/`);

const Accountaside = () => {
  const { t } = useTranslation();
  const { user, isLoading } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { id = "" } = useParams();

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const handleLogout = () => {
    setShowLogoutPopup(false);
    dispatch(setCouponCode());
    dispatch(apiLogout());
  };

  const displayName = String(user?.name || user?.hintName || "").trim() || t("nav.myAccount");
  const email = String(user?.email || "").trim();
  const phone = [user?.countryCode, user?.mobileNumber].filter(Boolean).join(" ").trim();

  const isOrdersActive =
    pathname === ROUTES.MY_ORDERS
    || pathStartsWith(pathname, ROUTES.ORDER_DETAIL)
    || pathname === `${ROUTES.ORDER_DETAIL}/${id}`;
  const isProfileActive =
    pathname === ROUTES.PROFILE
    || pathname === ROUTES.ORDER_ADDRESS
    || pathname === ROUTES.CHANGE_PASSWORD
    || pathStartsWith(pathname, ROUTES.CREATE_ADDRESS);

  return (
    <div className="sider_sidebar">
      <div className="account_sidebar_header">
        <div className="account_sidebar_header__top">
          <UserAccountAvatar user={user} size={96} className="account_sidebar_avatar" />
          <div className="account_sidebar_header__name_wrap">
            <h5 className="account_sidebar_header__name">{displayName}</h5>
            {email ? (
              <p className="account_sidebar_header__meta account_sidebar_header__email">{email}</p>
            ) : null}
            {phone ? (
              <p className="account_sidebar_header__meta account_sidebar_header__phone">
                {phonecicon}
                <span>{phone}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="account_sidebar_nav">
        <li>
          <Link
            to={ROUTES.PROFILE}
            className={isProfileActive ? "active" : ""}
          >
            {t("account.profile")}
          </Link>
        </li>

        <li>
          <Link
            to={ROUTES.MY_ORDERS}
            className={isOrdersActive ? "active" : ""}
          >
            {t("account.myOrders")}
          </Link>
        </li>

        <li>
          <Link
            to="#"
            className="account_sidebar_nav__logout"
            onClick={(event) => {
              event.preventDefault();
              setShowLogoutPopup(true);
            }}
          >
            {t("account.logout")}
          </Link>
          <LogoutPopup
            show={showLogoutPopup}
            onhide={() => setShowLogoutPopup(false)}
            onLogout={handleLogout}
            isLoggingOut={isLoading}
          />
        </li>
      </ul>
    </div>
  );
};

export default Accountaside;

const phonecicon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      fill="currentColor"
      d="M19.95 21q-3.125 0-6.175-1.362t-5.55-3.863t-3.862-5.55T3 4.05q0-.45.3-.75t.75-.3H8.1q.35 0 .625.238t.325.562l.65 3.5q.05.4-.025.675T9.4 8.45L6.975 10.9q.5.925 1.187 1.787t1.513 1.663q.775.775 1.625 1.438T13.1 17l2.35-2.35q.225-.225.588-.337t.712-.063l3.45.7q.35.1.575.363T21 15.9v4.05q0 .45-.3.75t-.75.3"
    />
  </svg>
);
