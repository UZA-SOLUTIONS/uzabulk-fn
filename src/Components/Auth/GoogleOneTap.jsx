import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { apiGet, apiPost } from "../../helpers/apiHelper";
import { AUTH } from "../../helpers/urlHelper";
import { updateAuthInfo } from "../../helpers/authHelper";
import { getDeviceId } from "../../helpers/deviceHelper";
import { setAuthSession } from "../../store/auth/slice";
import ROUTES from "../../helpers/routesHelper";

const GSI_SCRIPT_ID = "google-gsi-client";
const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiLoadPromise = null;

const loadGsiScript = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("NO_WINDOW"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GSI_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GSI_LOAD_FAILED")));
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = GSI_SCRIPT_ID;
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiLoadPromise = null;
      reject(new Error("GSI_LOAD_FAILED"));
    };
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
};

const cancelOneTap = () => {
  try {
    window.google?.accounts?.id?.cancel?.();
  } catch (_) {
    /* ignore */
  }
};

/** Clear Google One Tap cooldown cookie so the prompt can show again each visit/session. */
const clearOneTapCooldown = () => {
  try {
    const expires = "Thu, 01 Jan 1970 00:00:01 GMT";
    const paths = ["/", window.location.pathname || "/"];
    paths.forEach((path) => {
      document.cookie = `g_state=;path=${path};expires=${expires}`;
      document.cookie = `g_state=;path=${path};expires=${expires};SameSite=None;Secure`;
    });
  } catch (_) {
    /* ignore */
  }
};

const isAuthModalOpen = () =>
  Boolean(document.querySelector(".modal.for_loginmod.show"));

/**
 * Google One Tap — shows "Continue as …" on the open site (no login modal).
 * Re-prompts on every page/session open by clearing Google's cooldown cookie.
 */
export default function GoogleOneTap() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const isLogin = useSelector((s) => s.auth.isLogin);
  const signingInRef = useRef(false);
  const initializedClientIdRef = useRef("");
  const promptInFlightRef = useRef(false);

  useEffect(() => {
    if (isLogin) {
      cancelOneTap();
      return undefined;
    }

    // OAuth redirect handler page — skip One Tap.
    if (location.pathname.startsWith(ROUTES.AUTH_GOOGLE_CALLBACK)) {
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;

    const handleCredential = async (response) => {
      if (signingInRef.current || cancelled) return;
      const credential = String(response?.credential || "").trim();
      if (!credential) return;

      signingInRef.current = true;
      cancelOneTap();
      try {
        const res = await apiPost(
          AUTH.GOOGLE_ONE_TAP,
          { credential, deviceId: getDeviceId() },
          { suppressGlobalErrorToast: true }
        );
        const pack = res?.data != null && typeof res.data === "object" ? res.data : res;
        const token = pack?.token;
        const user = pack?.user;
        if (res?.status !== "success" || !token || !user?._id) {
          throw new Error(res?.message || "GOOGLE_AUTH_FAILED");
        }

        updateAuthInfo(token, user);
        dispatch(setAuthSession({ token, user }));
        toast.success(t("auth.loginSuccess"));
      } catch (err) {
        console.error("Google One Tap login failed:", err);
        toast.error(err?.message || t("auth.googleAuthFailed"));
      } finally {
        signingInRef.current = false;
      }
    };

    const showPrompt = () => {
      if (cancelled || isLogin || signingInRef.current) return;
      if (isAuthModalOpen()) {
        cancelOneTap();
        return;
      }
      if (!window.google?.accounts?.id) return;
      if (promptInFlightRef.current) return;

      promptInFlightRef.current = true;
      clearOneTapCooldown();

      try {
        window.google.accounts.id.prompt((notification) => {
          promptInFlightRef.current = false;
          if (cancelled) return;

          const skipped =
            typeof notification?.isNotDisplayed === "function" && notification.isNotDisplayed()
            || typeof notification?.isSkippedMoment === "function" && notification.isSkippedMoment();

          // If Google still suppressed the prompt, clear cooldown and try once more.
          if (skipped && !isAuthModalOpen()) {
            clearOneTapCooldown();
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              if (cancelled || isAuthModalOpen() || isLogin) return;
              try {
                window.google?.accounts?.id?.prompt?.();
              } catch (_) {
                /* ignore */
              }
            }, 400);
          }
        });
      } catch (_) {
        promptInFlightRef.current = false;
      }
    };

    const run = async () => {
      try {
        const configRes = await apiGet(AUTH.GOOGLE_CLIENT_CONFIG, {
          suppressGlobalErrorToast: true,
        });
        const clientId = String(configRes?.data?.clientId || "").trim();
        if (!clientId || cancelled) return;

        await loadGsiScript();
        if (cancelled || !window.google?.accounts?.id) return;

        if (isAuthModalOpen()) {
          cancelOneTap();
          return;
        }

        // Re-initialize each run so callback stays fresh and prompt can reappear.
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: false,
          context: "signin",
          itp_support: true,
          // Keep FedCM off so g_state cooldown can be cleared and prompt can re-show.
          use_fedcm_for_prompt: false,
        });
        initializedClientIdRef.current = clientId;

        showPrompt();
      } catch (err) {
        // One Tap is optional — fail silently if Google/script/config unavailable.
        if (process.env.NODE_ENV === "development") {
          console.warn("[GoogleOneTap]", err?.message || err);
        }
      }
    };

    run();

    const onAuthModalOpen = () => {
      cancelOneTap();
      promptInFlightRef.current = false;
    };
    const onAuthModalClose = () => {
      // Re-show suggestion after login modal closes.
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        if (!cancelled && !isLogin) showPrompt();
      }, 300);
    };
    const onVisibility = () => {
      // Every time the tab/session becomes visible again, offer One Tap.
      if (document.visibilityState === "visible" && !isLogin && !isAuthModalOpen()) {
        showPrompt();
      }
    };

    window.addEventListener("uzabulk:auth-modal-open", onAuthModalOpen);
    window.addEventListener("uzabulk:auth-modal-close", onAuthModalClose);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      promptInFlightRef.current = false;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("uzabulk:auth-modal-open", onAuthModalOpen);
      window.removeEventListener("uzabulk:auth-modal-close", onAuthModalClose);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelOneTap();
    };
  }, [dispatch, isLogin, location.pathname, t]);

  return null;
}
