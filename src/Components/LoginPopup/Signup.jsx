import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, FormGroup } from "reactstrap";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import MobileNumberField, { MobileError } from "../Common/MobileNumberField";
import PasswordField from "../Common/PasswordField";
import { apiRegister, apiVerifyEmail, apiVerifyOtp } from "../../store/auth/actions";

import { ICON_EMAIL_OTP, ICON_RELOAD, ICON_USER } from "../../assets/svg";
import ResendOtp from "../Common/ResendOtp";
import ButtonLoader from "../Common/ButtonLoader";
import GoogleContinueButton from "./GoogleContinueButton";
import ROUTES from "../../helpers/routesHelper";

const Signup = ({ handleClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  /** Formik can drop `emailOtp` when the field is hidden; backend still needs it on register. */
  const verifiedEmailOtpRef = useRef("");

  const initialValues = {
    email: "",
    password: "",
    confirmPassword: "",
    mobileNumber: "",
    countryCode: "+250",
    emailOtp: "",
  };

  const toastAuthError = (error) => {
    const raw =
      typeof error === "string"
        ? error
        : error?.message || error?.payload || t("auth.registerFailed");
    const msg = String(raw);
    if (/535|BadCredentials|Username and Password not accepted|gsmtp|EAUTH/i.test(msg)) {
      toast.error(t("auth.emailSendFailed"));
      return;
    }
    toast.error(msg);
  };

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .email(t("auth.validEmail"))
          .required(t("auth.emailRequired")),
        password: Yup.string()
          .required(t("auth.passwordRequired"))
          .min(6, t("auth.passwordHint"))
          .test("number", t("auth.passwordHint"), (val) => /\d/.test(val || ""))
          .test("letter", t("auth.passwordHint"), (val) => /[a-zA-Z]/.test(val || "")),
        confirmPassword: Yup.string()
          .required(t("auth.confirmPasswordRequired"))
          .oneOf([Yup.ref("password")], t("auth.passwordsMustMatch")),
        mobileNumber: Yup.string()
          .matches(/^\d+$/, t("auth.phoneInvalid"))
          .min(8, t("auth.phoneInvalid"))
          .max(15, t("auth.phoneInvalid"))
          .required(t("auth.phoneRequired")),
        countryCode: Yup.string()
          .matches(/^\+\d+$/, t("auth.phoneRequired"))
          .required(t("auth.phoneRequired")),
        emailOtp:
          emailOtpSent && !emailVerified
            ? Yup.string().required(t("auth.emailOtpRequired"))
            : Yup.string().nullable().notRequired(),
      }),
    [emailOtpSent, emailVerified, t]
  );

  const sendOtp = async (data, api, callback) => {
    setSendingEmailOtp(true);
    try {
      const res = await dispatch(
        api({
          data,
          callback: () => {},
        })
      ).unwrap();
      callback(true);
      toast.success(res?.message || t("auth.otpSent"));
    } catch (error) {
      toastAuthError(error);
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const verifyOtp = async (data, callback) => {
    setVerifyingEmailOtp(true);
    try {
      const res = await dispatch(
        apiVerifyOtp({
          data,
          callback: () => {},
        })
      ).unwrap();
      callback(true);
      toast.success(res?.message || t("auth.codeVerified"));
    } catch (error) {
      toastAuthError(error);
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const onSubmit = async (data, form) => {
    if (!emailVerified) {
      toast.error(t("auth.emailNotVerified"));
      form.setSubmitting(false);
      return;
    }

    const payload = {
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      emailOtp: String(data.emailOtp || verifiedEmailOtpRef.current || "").trim(),
      mobileNumber: data.mobileNumber,
      countryCode: data.countryCode,
    };

    try {
      await dispatch(apiRegister({ data: payload })).unwrap();
      handleClose();
      toast.success(t("auth.accountCreated"));
    } catch (e) {
      const msg = typeof e === "string" ? e : e?.message || t("auth.registerFailed");
      toast.error(msg);
    } finally {
      form.setSubmitting(false);
    }
  };

  return (
    <div className="login_auth">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        validateOnBlur
        validateOnChange={false}
      >
        {(form) => {
          const sendToEmail = async () => {
            const email = String(form.values.email || "").trim();
            const errors = await form.validateForm({ ...form.values, email });
            if (errors.email) {
              form.setFieldTouched("email", true, false);
              form.setFieldError("email", errors.email);
              return;
            }
            void sendOtp({ email }, apiVerifyEmail, setEmailOtpSent);
          };

          const emailInvalid =
            Boolean(form.errors.email) &&
            (Boolean(form.touched.email) || form.submitCount > 0);
          const canSendOtp = Boolean(String(form.values.email || "").trim());

          return (
            <Form className="auth-form" noValidate>
              <FormGroup className="position-relative mb-3">
                {emailOtpSent ? (
                  <div className="verify_input auth-verify-chip mb-0">
                    <div className="auth_icon">{ICON_USER}</div>
                    <button
                      type="button"
                      className="retry-credentials"
                      aria-label={t("auth.changeEmail")}
                      onClick={() => {
                        form.setFieldValue("email", "");
                        form.setFieldValue("emailOtp", "");
                        verifiedEmailOtpRef.current = "";
                        setEmailOtpSent(false);
                        setEmailVerified(false);
                      }}
                    >
                      {ICON_RELOAD}
                    </button>
                    <p className="auth-verify-chip__email">{form.values.email}</p>
                    {emailVerified ? (
                      <span className="auth-verify-chip__badge">{t("auth.verified")}</span>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className={`auth-otp-combo${emailInvalid ? " is-invalid" : ""}`}>
                      <span className="auth-otp-combo__icon" aria-hidden>
                        {usericon}
                      </span>
                      <Field
                        className="form-control auth-otp-combo__input"
                        name="email"
                        id="email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder={t("auth.email")}
                      />
                      <button
                        type="button"
                        onClick={() => void sendToEmail()}
                        className="auth-otp-combo__action"
                        disabled={!canSendOtp || sendingEmailOtp}
                      >
                        {sendingEmailOtp ? (
                          <>
                            <ButtonLoader size={14} />
                            <span className="ms-1">{t("auth.sendingCode")}</span>
                          </>
                        ) : (
                          t("auth.verifyEmail")
                        )}
                      </button>
                    </div>
                    {emailInvalid ? (
                      <small className="auth-field-error">{form.errors.email}</small>
                    ) : (
                      <small className="auth-field-hint">{t("auth.verifyEmailHint")}</small>
                    )}
                  </>
                )}
              </FormGroup>

              {emailOtpSent && !emailVerified ? (
                <FormGroup className="position-relative mb-3">
                  <div className="auth-otp-combo">
                    <span className="auth-otp-combo__icon" aria-hidden>
                      {ICON_EMAIL_OTP}
                    </span>
                    <Field
                      className="form-control auth-otp-combo__input"
                      name="emailOtp"
                      id="emailOtp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={t("auth.emailOtp")}
                    />
                    <button
                      type="button"
                      className="auth-otp-combo__action"
                      onClick={() => {
                        const otpSnap = String(form.values.emailOtp || "").trim();
                        if (!otpSnap) {
                          form.setFieldTouched("emailOtp", true, false);
                          form.setFieldError("emailOtp", t("auth.emailOtpRequired"));
                          return;
                        }
                        void verifyOtp(
                          {
                            otp: otpSnap,
                            email: form.values.email,
                            type: "email",
                          },
                          () => {
                            verifiedEmailOtpRef.current = otpSnap;
                            form.setFieldValue("emailOtp", otpSnap);
                            setEmailVerified(true);
                          }
                        );
                      }}
                      disabled={
                        verifyingEmailOtp || !String(form.values.emailOtp || "").trim()
                      }
                    >
                      {verifyingEmailOtp ? (
                        <>
                          <ButtonLoader size={14} />
                          <span className="ms-1">{t("auth.verifying")}</span>
                        </>
                      ) : (
                        t("auth.verifyOtp")
                      )}
                    </button>
                  </div>
                  <ResendOtp callback={() => void sendToEmail()} />
                </FormGroup>
              ) : null}

              <FormGroup className="mb-3 signupinput_phone auth-phone-field">
                <MobileNumberField
                  country="rw"
                  inputClass="form-control login-auth-phone-input"
                  placeholder={t("auth.phoneNumber")}
                  callback={(code, number) => {
                    form.setFieldValue("mobileNumber", number, false);
                    form.setFieldValue("countryCode", code, false);
                  }}
                />
                {(form.touched.mobileNumber || form.submitCount > 0) && form.errors.mobileNumber ? (
                  <small className="auth-field-error">{form.errors.mobileNumber}</small>
                ) : (
                  <MobileError value={form.values?.mobileNumber} />
                )}
              </FormGroup>

              <PasswordField
                className="mb-3"
                autoComplete="new-password"
                hint={t("auth.passwordHint")}
              />
              <PasswordField
                className="mb-3"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder={t("auth.confirmPassword")}
                liveMatchAgainst="password"
                liveMatchMessage={t("auth.passwordsMustMatch")}
              />

              <div className="auth-form-actions">
                <Button
                  className="auth_btn"
                  type="submit"
                  disabled={form.isSubmitting}
                >
                  {form.isSubmitting ? (
                    <>
                      <ButtonLoader />
                      <span className="ms-2">{t("auth.creatingAccount")}</span>
                    </>
                  ) : (
                    t("auth.createAccount")
                  )}
                </Button>
                {!emailVerified && form.submitCount > 0 ? (
                  <small className="auth-field-hint auth-form-actions__hint">
                    {t("auth.completeEmailVerify")}
                  </small>
                ) : null}
              </div>

              <p className="auth-terms">
                {t("auth.termsAgreePrefix")}{" "}
                <Link to={ROUTES.T_AND_C} onClick={handleClose}>
                  {t("nav.termsConditions")}
                </Link>{" "}
                {t("auth.termsAgreeAnd")}{" "}
                <Link to={ROUTES.PRIVACY_POLICY} onClick={handleClose}>
                  {t("nav.privacyPolicy")}
                </Link>
                .
              </p>

              <div className="auth-social-divider" aria-hidden>
                <span>{t("auth.or")}</span>
              </div>

              <GoogleContinueButton />
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default Signup;

const usericon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      fill="currentColor"
      d="M12 12q-1.65 0-2.825-1.175T8 8t1.175-2.825T12 4t2.825 1.175T16 8t-1.175 2.825T12 12m-8 8v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20z"
    />
  </svg>
);
