import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, FormGroup, Label } from "reactstrap";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { getCredentials, removeCredentials, saveCredentials } from "../../helpers/authHelper";
import { apiLogin } from "../../store/auth/actions";

import { ICON_USER } from "../../assets/svg";
import PasswordField from "../Common/PasswordField";
import ROUTES from "../../helpers/routesHelper";
import ButtonLoader from "../Common/ButtonLoader";
import GoogleContinueButton from "./GoogleContinueButton";

const Signin = ({ handleClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isAuthLoading = useSelector((s) => s.auth.isLoading);
  const [initialValues, setInitialValues] = useState({
    password: "",
    email: "",
    rememberMe: true,
  });

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .email(t("auth.validEmail"))
          .required(t("auth.emailRequired")),
        password: Yup.string().required(t("auth.passwordRequired")),
      }),
    [t]
  );

  const onSubmit = async (data, form) => {
    try {
      await dispatch(
        apiLogin({
          data: {
            password: data.password,
            email: data.email,
          },
        })
      ).unwrap();
      if (data.rememberMe) {
        saveCredentials(data);
      } else {
        removeCredentials();
      }
      handleClose();
      toast.success(t("auth.loginSuccess"));
    } catch (e) {
      const msg = typeof e === "string" ? e : e?.message || t("auth.loginFailed");
      toast.error(msg);
    } finally {
      form.setSubmitting(false);
    }
  };

  useEffect(() => {
    const credentials = getCredentials();
    if (credentials) {
      setInitialValues((s) => ({ ...s, ...credentials, rememberMe: true }));
    }
  }, []);

  return (
    <div className="auth_login_form position-relative">
      <div className="login_auth">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
          enableReinitialize
          validateOnBlur
          validateOnChange={false}
        >
          {(form) => {
            const busy = form.isSubmitting || isAuthLoading;
            const emailInvalid =
              Boolean(form.errors.email) &&
              (Boolean(form.touched.email) || form.submitCount > 0);

            return (
              <Form className="auth-form" noValidate>
                <FormGroup className="mb-3 auth-field-group">
                  <div className={`auth-field${emailInvalid ? " is-invalid" : ""}`}>
                    <span className="auth-field__icon" aria-hidden>
                      {ICON_USER}
                    </span>
                    <Field
                      type="email"
                      name="email"
                      autoComplete="email"
                      autoFocus
                      inputMode="email"
                      className="form-control auth-field__input"
                      placeholder={t("auth.email")}
                    />
                  </div>
                  {emailInvalid ? (
                    <small className="auth-field-error">{form.errors.email}</small>
                  ) : null}
                </FormGroup>

                <PasswordField className="mb-3" />

                <div className="remember_me auth-form-meta d-flex align-items-center justify-content-between gap-2">
                  <FormGroup check className="mb-0">
                    <Label check className="auth-remember-label">
                      <Field
                        type="checkbox"
                        name="rememberMe"
                        className="form-check-input"
                      />
                      {t("auth.rememberMe")}
                    </Label>
                  </FormGroup>

                  <div className="forgot_pasword">
                    <Link to={ROUTES.FORGOT} onClick={handleClose}>
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                </div>

                <div className="auth-form-actions">
                  <Button className="auth_btn" type="submit" disabled={busy}>
                    {busy ? (
                      <>
                        <ButtonLoader />
                        <span className="ms-2">{t("auth.signingIn")}</span>
                      </>
                    ) : (
                      t("nav.signIn")
                    )}
                  </Button>
                </div>

                <div className="auth-social-divider" aria-hidden>
                  <span>{t("auth.or")}</span>
                </div>

                <GoogleContinueButton />
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
};

export default Signin;
