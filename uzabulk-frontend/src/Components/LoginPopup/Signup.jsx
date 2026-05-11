import React, { useState } from "react";
import { Button, FormGroup } from "reactstrap";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import MobileNumberField, { MobileError } from "../Common/MobileNumberField";
import PasswordField from "../Common/PasswordField";
import { apiRegister, apiVerifyEmail, apiVerifyMobile, apiVerifyOtp } from "../../store/auth/actions";

import { ICON_EMAIL_OTP, ICON_MOBILE_OTP, ICON_RELOAD, ICON_USER } from "../../assets/svg";
import ResendOtp from "../Common/ResendOtp";
import ButtonLoader from "../Common/ButtonLoader";

const Signup = ({ handleClose }) => {
  const dispatch = useDispatch();
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const initialValues = {
    email: "",
    password: "",
    confirmPassword: "",
    mobileNumber: "",
    countryCode: "",
    mobileOtp: "",
    emailOtp: "",
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email("Invalid email format")
      .required("Email is required"),
    password: Yup.string()
      .required("Password is required")
      .test(
        "len",
        "Password must be at least 6 characters",
        (val) => val && val.length >= 6
      )
      .test("number", "Password must contain at least 1 number", (val) =>
        /\d/.test(val)
      )
      .test("letter", "Password must contain at least 1 letter", (val) =>
        /[a-zA-Z]/.test(val)
      ),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm Password is required"),
    mobileNumber: Yup.string()
      .matches(/^\d+$/, "Mobile number must contain only digits")
      .min(10, "Mobile number must be at least 10 digits long")
      .required("Mobile number is required"),
    countryCode: Yup.string()
      .matches(
        /^\+\d+$/,
        "Country code must start with a '+' and contain only digits"
      )
      .required("Country code is required"),
    mobileOtp: Yup.string().required(),
    emailOtp: Yup.string().required(),
  });

  const sendOtp = (data, api, callback) => {
    dispatch(
      api({
        data,
        callback: (res) => {
          callback(true);
          toast.success(res.message);
        },
      })
    );
  };

  const verifyOtp = (data, callback) => {
    dispatch(
      apiVerifyOtp({
        data,
        callback: (res) => {
          callback(true);
          toast.success(res.message);
        },
      })
    );
  };

  const onSubmit = async (data, form) => {
    if (!emailVerified) {
      toast.error("Email is not verified");
      form.setSubmitting(false);
      return;
    }

    if (!mobileVerified) {
      toast.error("Mobile is not verified");
      form.setSubmitting(false);
      return;
    }

    try {
      await dispatch(apiRegister({ data })).unwrap();
      handleClose();
      toast.success("Account created. You are signed in.");
    } catch (e) {
      const msg = typeof e === "string" ? e : e?.message || "Registration failed";
      toast.error(msg);
    } finally {
      form.setSubmitting(false);
    }
  };

  return (
    <div className="login_auth">
      <h4 className="mb-4">USER SIGNUP</h4>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {(form) => {
          const sendToEmail = () => {
            sendOtp(
              {
                email: form.values.email,
              },
              apiVerifyEmail,
              setEmailOtpSent
            )
          }

          const sendToMobile = () => {
            sendOtp(
              {
                mobileNumber: form.values.mobileNumber,
                countryCode: form.values.countryCode,
              },
              apiVerifyMobile,
              setMobileOtpSent
            )
          }

          return (
            <Form>
              <FormGroup className="position-relative">
                {emailOtpSent ? (
                  <div className="postion-relative verify_input mb-3">
                    <div className="auth_icon">{ICON_USER}</div>
                    <div
                      className="retry-credentials"
                      onClick={() => {
                        form.setFieldValue("email", "");
                        setEmailOtpSent(false);
                        setEmailVerified(false);
                      }}
                    >
                      {ICON_RELOAD}
                    </div>
                    <p
                      style={{
                        width: "calc(100% - 50px)",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {form.values.email}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="d-flex align-items-center inputWithBtn">
                      <div className="position-relative inputWrp">
                        <Field
                          className="form-control send-otp-email"
                          name="email"
                          id="email"
                          placeholder="Email"
                        />
                        <div className="auth_icon">{usericon}</div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => sendToEmail()}
                        className="send-otp-btn"
                        disabled={!!form.errors?.email || !form.values.email}
                      >
                        Send OTP
                      </Button>
                    </div>
                    <ErrorMessage
                      name="email"
                      component="p"
                      className="text-danger"
                    />
                  </>
                )}
              </FormGroup>

              <FormGroup className="position-relative">
                {emailOtpSent && !emailVerified ? (
                  <>
                    <div className="d-flex align-items-center inputWithBtn">
                      <div className="position-relative inputWrp">
                        <Field
                          className="form-control send-otp-email"
                          name="emailOtp"
                          id="emailOtp"
                          placeholder="Enter Email OTP"
                        />
                        <div className="auth_icon">{ICON_EMAIL_OTP}</div>
                      </div>
                      <Button
                        type="button"
                        className="send-otp-btn"
                        onClick={() =>
                          verifyOtp(
                            {
                              otp: form.values.emailOtp,
                              email: form.values.email,
                              type: "email",
                            },
                            setEmailVerified
                          )
                        }
                        disabled={
                          !!form.errors?.emailOtp || !form.values.emailOtp
                        }
                      >
                        Verify OTP
                      </Button>
                    </div>
                    <ResendOtp callback={sendToEmail} />
                  </>
                ) : null}
              </FormGroup>

              <FormGroup className="position-relative">
                <div className="signupinput_phone mb-3">
                  {mobileOtpSent ? (
                    <>
                      <div className="postion-relative verify_input mb-3">
                        <div className="auth_icon">{usericon}</div>
                        <div
                          className="retry-credentials"
                          onClick={() => {
                            form.setFieldValue("mobileNumber", "");
                            form.setFieldValue("countryCode", "");
                            setMobileOtpSent(false);
                            setMobileVerified(false);
                          }}
                        >
                          {ICON_RELOAD}
                        </div>
                        <p>
                          {form.values.countryCode} {form.values.mobileNumber}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="d-flex align-items-center inputWithBtn iconWithText position-relative ps-5"
                        style={{
                          background: "var(--theme-color)",
                          height: "40px",
                          borderRadius: "15px 20px 20px 15px",
                        }}
                      >
                        <span
                          className="icn position-absolute"
                          style={{ left: 14 }}
                        >
                          {ICON_USER}
                        </span>
                        <MobileNumberField
                          className="send-otp-email"
                          callback={(code, number) => {
                            form.setFieldValue("mobileNumber", number);
                            form.setFieldValue("countryCode", code);
                          }}
                        />

                        <Button
                          type="button"
                          className="send-otp-btn"
                          style={{ opacity: 1 }}
                          onClick={() => sendToMobile()}
                          disabled={
                            (!!form.errors?.mobileNumber &&
                              form.values.mobileNumber.length < 10) ||
                            !form.values.mobileNumber
                          }
                        >
                          Send OTP
                        </Button>
                      </div>
                      <MobileError
                        value={form.values?.mobileNumber}
                      />
                    </>
                  )}
                </div>
              </FormGroup>

              <FormGroup className="position-relative">
                {mobileOtpSent && !mobileVerified ? (
                  <>
                    <div className="d-flex align-items-center inputWithBtn">
                      <div className="position-relative inputWrp">
                        <Field
                          className="form-control send-otp-email"
                          name="mobileOtp"
                          id="mobileOtp"
                          placeholder="Enter Mobile OTP"
                        />
                        <div className="auth_icon">{ICON_MOBILE_OTP}</div>
                      </div>
                      <Button
                        type="button"
                        className="send-otp-btn"
                        onClick={() =>
                          verifyOtp(
                            {
                              otp: form.values.mobileOtp,
                              mobileNumber: form.values.mobileNumber,
                              countryCode: form.values.countryCode,
                              type: "mobile",
                            },
                            setMobileVerified
                          )
                        }
                        disabled={
                          !!form.errors?.mobileOtp || !form.values.mobileOtp
                        }
                      >
                        Verify OTP
                      </Button>
                    </div>
                    <ResendOtp callback={sendToMobile} />
                  </>
                ) : null}
              </FormGroup>

              <PasswordField className="mb-3" />
              <PasswordField
                className="mb-3"
                name="confirmPassword"
                placeholder="Confirm Password"
              />

              <div className="mt-5">
                <Button
                  className="auth_btn"
                  type="submit"
                  disabled={!emailVerified || !mobileVerified || form.isSubmitting}
                >
                  {form.isSubmitting ? <ButtonLoader /> : "Register"}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default Signup;

// images
const usericon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
  >
    <path
      fill="#fff"
      d="M12 12q-1.65 0-2.825-1.175T8 8t1.175-2.825T12 4t2.825 1.175T16 8t-1.175 2.825T12 12m-8 8v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20z"
    />
  </svg>
);

const lockicon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
  >
    <path
      fill="#fff"
      d="M4 22V8h3V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h3v14zm8-5q.825 0 1.413-.587T14 15t-.587-1.412T12 13"
    />
  </svg>
);
