import React from "react";
import { useTranslation } from "react-i18next";
import { getDeviceId } from "../../helpers/deviceHelper";

const getApiRoot = () =>
  (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:1302"))
    .replace(/\/+$/, "");

/** Redirects browser to Passport Google OAuth on the API. */
export default function GoogleContinueButton({ className = "" }) {
  const { t } = useTranslation();

  const handleClick = () => {
    const apiRoot = getApiRoot();
    const deviceId = encodeURIComponent(getDeviceId() || "");
    const url = `${apiRoot}/api/v1/users/auth/google?deviceId=${deviceId}`;
    window.location.assign(url);
  };

  return (
    <button
      type="button"
      className={`auth-google-btn${className ? ` ${className}` : ""}`}
      onClick={handleClick}
    >
      <span className="auth-google-btn__icon" aria-hidden>
        {GOOGLE_G}
      </span>
      <span>{t("auth.continueWithGoogle")}</span>
    </button>
  );
}

const GOOGLE_G = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.3 4 24 4 16.1 4 9.2 8.5 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.1 39.5 16 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.2-.1-2.3-.4-3.5z" />
  </svg>
);
