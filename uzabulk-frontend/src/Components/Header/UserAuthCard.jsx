import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";

import { apiGetCartCount } from "../../store/cart/actions";
import { ICON_CART, ICON_USER_SECONDARY } from "../../assets/svg";
import { formatNumber } from "../../helpers/commonHelper";
import LoginPopup from "../LoginPopup";

export default function UserAuthCard({
  showCart = true,
  showAccount = true,
  showMerchantSignup = true,
  className = "",
}) {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLogin } = useSelector((s) => s.auth);
  const cartItems = useSelector(s => s.cart.count);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("signin");

  useEffect(() => {
    if (!isLogin) return;
    const t = setTimeout(() => {
      dispatch(apiGetCartCount());
    }, 0);
    return () => clearTimeout(t);
  }, [dispatch, isLogin]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authParam = params.get("auth");
    if (authParam !== "signin" && authParam !== "signup") return;

    if (isLogin) {
      params.delete("auth");
      const next = params.toString();
      navigate(
        { pathname: location.pathname, search: next ? `?${next}` : "" },
        { replace: true }
      );
      return;
    }

    setAuthModalTab(authParam);
    setIsAuthModalOpen(true);
    params.delete("auth");
    const next = params.toString();
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : "" },
      { replace: true }
    );
  }, [isLogin, location.pathname, location.search, navigate]);

  const openAuthModal = (tab = "signin") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <div className={`user_card ${className}`}>
      {showCart ? (
        <div className="align-itmes-center cardone_wallet d-flex">
          <Link to="/cart" className="d-flex align-items-center">
            <span className="me-2">{ICON_CART}</span>
            <div className="card_content">
              <h5>Cart</h5>
              {cartItems ? <small className="text-theme-secondary">{formatNumber(cartItems)} Item{cartItems > 1 ? 's' : ''}</small> : null}
            </div>
          </Link>
        </div>
      ) : null}

      {showCart && showAccount ? <div className="dividerline_verticle"></div> : null}

      {showAccount ? (
        !isLogin ? (
          <div className="card_user align-items-center d-flex">
            <UncontrolledDropdown>
              <DropdownToggle className="bg-transparent border-0 p-0">
                <div className="d-flex align-items-center">
                  <span className="me-2">{ICON_USER_SECONDARY}</span>
                  <div className="card_content">
                    <h5>Account</h5>
                  </div>
                </div>
              </DropdownToggle>
              <DropdownMenu end className="account-compact-menu">
                <DropdownItem
                  tag="button"
                  type="button"
                  onClick={() => openAuthModal("signin")}
                >
                  Sign in
                </DropdownItem>
                <DropdownItem
                  tag="button"
                  type="button"
                  onClick={() => openAuthModal("signup")}
                >
                  Sign up
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        ) : (
          <div className="card_user align-items-center d-flex">
            <UncontrolledDropdown>
              <DropdownToggle>
                <Link to="/my-orders">
                  <div className="d-flex align-items-center">
                    <span className="me-2">{ICON_USER_SECONDARY}</span>
                    <div className="card_content">
                      <h5>My Account</h5>
                    </div>
                  </div>
                </Link>
              </DropdownToggle>

              {/* <DropdownMenu>
          <Link to={ROUTES.PROFILE}>Profile</Link>
          <Link to={ROUTES.CHANGE_PASSWORD}>Change Password</Link>
          <Link to={ROUTES.MY_ORDERS}>My orders</Link>
          <Link to={ROUTES.ORDER_ADDRESS}>Address</Link>

          <Button
            className="logout-button"
            onClick={() => {
              dispatch(apiLogout());
            }}
          >
            Logout
          </Button>
        </DropdownMenu> */}
            </UncontrolledDropdown>
          </div>
        )
      ) : null}

      {showMerchantSignup && !isLogin && (showCart || showAccount) ? <div className="dividerline_verticle"></div> : null}

      {showMerchantSignup && !isLogin ? (
        <div className="merchant_signup_wrap d-flex align-items-center">
          <button
            type="button"
            className="merchant-signup-btn merchant-signup-btn-trigger"
            onClick={() => openAuthModal("signup")}
          >
            Merchant Signup
          </button>
        </div>
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