import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { apiGet } from "../../helpers/apiHelper";
import { PROFILE } from "../../helpers/urlHelper";
import { updateAuthInfo } from "../../helpers/authHelper";
import { setAuthSession } from "../../store/auth/slice";
import ROUTES from "../../helpers/routesHelper";

/**
 * Handles redirect from Google OAuth callback (?token= or ?error=).
 */
export default function GoogleAuthCallback() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const error = searchParams.get("error");
      const token = searchParams.get("token");

      if (error || !token) {
        if (!cancelled) {
          setStatus("error");
          toast.error(t("auth.googleAuthFailed"));
          navigate(`${ROUTES.HOME}?auth=signin`, { replace: true });
        }
        return;
      }

      try {
        updateAuthInfo(token, {});
        const res = await apiGet(PROFILE.GET);
        const user = res?.data || null;
        if (!user || typeof user !== "object" || !user._id) {
          throw new Error("PROFILE_FAILED");
        }
        updateAuthInfo(token, user);
        dispatch(setAuthSession({ token, user }));
        if (!cancelled) {
          setStatus("ok");
          toast.success(t("auth.loginSuccess"));
          navigate(ROUTES.HOME, { replace: true });
        }
      } catch (err) {
        console.error("Google auth callback failed:", err);
        if (!cancelled) {
          setStatus("error");
          toast.error(t("auth.googleAuthFailed"));
          navigate(`${ROUTES.HOME}?auth=signin`, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, searchParams, t]);

  return (
    <div className="google-auth-callback" role="status" aria-live="polite">
      <p className="mb-0">
        {status === "error" ? t("auth.googleAuthFailed") : t("auth.googleSigningIn")}
      </p>
    </div>
  );
}
