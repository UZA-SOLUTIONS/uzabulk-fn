import { ErrorMessage, Field, Form, Formik } from "formik";
import { useEffect, useRef, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import MobileNumberField from "../../Components/Common/MobileNumberField";
import {
  buildGpsAddressFields,
  formatPinnedCoords,
  getCurrentPosition,
  parseCoord,
} from "../../helpers/locationHelper";
import { apiAddAddress, apiGetAddress, apiUpdateAddress } from "../../store/address/actions";
import { clearAddressDetails } from "../../store/address/slice";
import LocationPickerMap from "./LocationPickerMap";

const emptyValues = {
  area: "",
  name: "",
  countryCode: "+250",
  mobileNumber: "",
  houseNo: "",
  landmark: "",
  address: "",
  lattitude: "",
  longitude: "",
  addressType: "home",
  default: true,
};

const AddAddress = ({ callback, id = null }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { detail } = useSelector((s) => s.address.addressDetail);
  const profile = useSelector((s) => s.auth.profile || s.auth.user);
  const [searchParams] = useSearchParams();
  const autoLocate = searchParams.get("fromLocation") === "1";
  const autoLocateStarted = useRef(false);
  const autoSaveStarted = useRef(false);

  const [mobileNumber, setMobileNumber] = useState("");
  const [locating, setLocating] = useState(false);
  const [initialValues, setInitialValues] = useState(emptyValues);
  const formRef = useRef(null);

  const validationSchema = Yup.object().shape({
    area: Yup.string().required(t("address.areaRequired")),
    name: Yup.string().required(t("address.nameRequired")),
    houseNo: Yup.string().required(t("address.houseNoRequired")),
    landmark: Yup.string().required(t("address.landmarkRequired")),
    address: Yup.string().required(t("address.addressRequired")),
    lattitude: Yup.number().transform((value, original) => (original === "" ? undefined : value)).optional(),
    longitude: Yup.number().transform((value, original) => (original === "" ? undefined : value)).optional(),
    mobileNumber: Yup.string()
      .required(t("address.mobileRequired"))
      .matches(/^\d{8,15}$/, t("address.mobileInvalid")),
    countryCode: Yup.string().matches(
      /^\+\d+$/,
      t("address.countryCodeInvalid")
    ),
    addressType: Yup.string().oneOf(["home", "office", "other"]).required(),
  });

  useEffect(() => {
    if (id) {
      dispatch(apiGetAddress(id));
      return;
    }
    if (profile) {
      const code = profile?.countryCode || "+250";
      const mobile = profile?.mobileNumber || "";
      setInitialValues((prev) => ({
        ...prev,
        name: profile?.name || prev.name || "",
        countryCode: code,
        mobileNumber: mobile,
      }));
      if (code || mobile) setMobileNumber(`${code}${mobile}`);
    }
  }, [id, dispatch, profile]);

  useEffect(() => {
    if (detail) {
      setInitialValues({
        area: detail?.area || "",
        name: detail?.name || "",
        countryCode: detail?.countryCode || "+250",
        mobileNumber: detail?.mobileNumber || "",
        houseNo: detail?.houseNo || "",
        landmark: detail?.landmark || "",
        address: detail?.address || "",
        lattitude: parseCoord(detail?.lattitude) ?? "",
        longitude: parseCoord(detail?.longitude) ?? "",
        addressType: detail?.addressType || "home",
        default: Boolean(detail?.default),
      });
      setMobileNumber(`${detail?.countryCode || ""}${detail?.mobileNumber || ""}`);
    }
  }, [detail]);

  useEffect(() => {
    return () => {
      dispatch(clearAddressDetails());
    };
  }, [dispatch]);

  const applyGpsFields = (form, lattitude, longitude) => {
    const gps = buildGpsAddressFields(lattitude, longitude);
    if (!gps || !form) return null;
    form.setFieldValue("lattitude", gps.lattitude);
    form.setFieldValue("longitude", gps.longitude);
    form.setFieldValue("area", gps.area);
    form.setFieldValue("address", gps.address);
    form.setFieldValue("houseNo", gps.houseNo);
    form.setFieldValue("landmark", gps.landmark);
    return gps;
  };

  const saveGpsAddress = (gps, extras = {}) => {
    const name = String(extras.name || profile?.name || "").trim();
    const countryCode = String(extras.countryCode || profile?.countryCode || "+250").trim();
    const mobile = String(extras.mobileNumber || profile?.mobileNumber || "").trim();

    if (!name || !mobile) {
      toast.error(t("address.profileRequiredForGps"));
      return;
    }

    const payload = {
      name,
      countryCode,
      mobileNumber: mobile,
      area: gps.area,
      address: gps.address,
      houseNo: gps.houseNo,
      landmark: gps.landmark,
      lattitude: gps.lattitude,
      longitude: gps.longitude,
      addressType: extras.addressType || "home",
      default: extras.default !== false,
    };

    dispatch(
      apiAddAddress({
        data: payload,
        callback: (res) => {
          toast.success(res?.message || t("address.added"));
          callback?.(res);
        },
      })
    );
  };

  const pinCurrentLocation = async (form, { autoSave = false } = {}) => {
    const helpers = form || formRef.current;
    if (!helpers) {
      toast.error(t("address.geoFailed"));
      return;
    }
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const gps = applyGpsFields(helpers, pos.lattitude, pos.longitude);
      if (!gps) {
        toast.error(t("address.geoFailed"));
        return;
      }
      if (autoSave) {
        saveGpsAddress(gps, helpers.values);
      } else {
        toast.success(t("address.locationPinnedCoords"));
      }
    } catch (error) {
      const code = error?.message;
      if (code === "GEO_DENIED") toast.error(t("address.geoDenied"));
      else if (code === "GEO_UNAVAILABLE") toast.error(t("address.geoUnavailable"));
      else toast.error(t("address.geoFailed"));
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!autoLocate || id || autoLocateStarted.current) return undefined;
    let cancelled = false;
    let attempts = 0;

    const tryPinAndSave = async () => {
      if (cancelled) return;
      const name = String(profile?.name || "").trim();
      const mobile = String(profile?.mobileNumber || "").trim();
      if (!formRef.current || !name || !mobile) {
        attempts += 1;
        if (attempts < 40) window.setTimeout(tryPinAndSave, 150);
        else if (!name || !mobile) toast.error(t("address.profileRequiredForGps"));
        return;
      }
      if (autoSaveStarted.current) return;
      autoLocateStarted.current = true;
      autoSaveStarted.current = true;
      await pinCurrentLocation(formRef.current, { autoSave: true });
    };

    const timer = window.setTimeout(tryPinAndSave, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate, id, profile]);

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(data, { resetForm, setSubmitting }) => {
        const payload = { ...data };
        const lat = parseCoord(data.lattitude);
        const lng = parseCoord(data.longitude);
        delete payload.lattitude;
        delete payload.longitude;
        if (lat != null) payload.lattitude = lat;
        if (lng != null) payload.longitude = lng;
        // Keep stored text as coordinates when this is a GPS pin.
        if (lat != null && lng != null) {
          const gps = buildGpsAddressFields(lat, lng);
          payload.area = gps.area;
          payload.address = gps.address;
          if (!String(payload.houseNo || "").trim()) payload.houseNo = gps.houseNo;
          if (!String(payload.landmark || "").trim()) payload.landmark = gps.landmark;
        }

        if (id) {
          dispatch(
            apiUpdateAddress({
              data: payload,
              id,
              callback: (res) => {
                toast.success(res?.message || t("address.updated"));
                resetForm();
                callback(res);
              },
            })
          ).finally(() => setSubmitting(false));
        } else {
          dispatch(
            apiAddAddress({
              data: payload,
              callback: (res) => {
                toast.success(res?.message || t("address.added"));
                resetForm();
                callback(res);
              },
            })
          ).finally(() => setSubmitting(false));
        }
      }}
      validationSchema={validationSchema}
      enableReinitialize={true}
      innerRef={formRef}
    >
      {(form) => {
        const lat = parseCoord(form.values.lattitude);
        const lng = parseCoord(form.values.longitude);
        const pinned = lat != null && lng != null;

        return (
          <div className="text-start">
            <Form>
              <Row>
                <Col xs={12} className="my-2">
                  <div className="address_location_picker">
                    <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
                      <p className="mb-0 address_location_picker__label">
                        {t("address.currentLocationHint")}
                      </p>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="address_location_picker__btn"
                        disabled={locating}
                        onClick={() => pinCurrentLocation(form, { autoSave: false })}
                      >
                        {locating ? t("address.locating") : t("address.useMyCurrentLocation")}
                      </Button>
                    </div>
                    {pinned ? (
                      <>
                        <LocationPickerMap lattitude={lat} longitude={lng} />
                        <p className="address_location_picker__coords mb-0 mt-2">
                          {t("address.pinned", {
                            coords: formatPinnedCoords({ lattitude: lat, longitude: lng }),
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted small mb-0">{t("address.mapPlaceholder")}</p>
                    )}
                  </div>
                </Col>
                <Col md={6} className="my-2">
                  <label htmlFor="name" className="required">{t("address.name")}</label>
                  <Field name="name" id="name" className="form-control" />
                  <ErrorMessage name="name" className="text-danger" component="p" />
                </Col>
                <Col md={6} className="my-2">
                  <div className="position-relative signupinput_phone">
                    <label htmlFor="altMobileNumber" className="required">{t("address.mobile")}</label>
                    <MobileNumberField
                      className="border rounded bg-white"
                      defaultValue={mobileNumber}
                      country="rw"
                      callback={(code, number) => {
                        form.setFieldValue("countryCode", code);
                        form.setFieldValue("mobileNumber", number);
                        form.setFieldTouched("mobileNumber", true, false);
                      }}
                    />
                    <ErrorMessage name="mobileNumber" className="text-danger" component="p" />
                  </div>
                </Col>
                {pinned ? (
                  <Col xs={12} className="my-2">
                    <label>{t("address.coordinates")}</label>
                    <input
                      type="text"
                      className="form-control"
                      readOnly
                      value={formatPinnedCoords({ lattitude: lat, longitude: lng })}
                    />
                    <p className="text-muted small mb-0 mt-1">{t("address.coordsOnlyHint")}</p>
                  </Col>
                ) : (
                  <>
                    <Col md={6} className="my-2">
                      <label htmlFor="area" className="required">{t("address.area")}</label>
                      <Field name="area" id="area" className="form-control" />
                      <ErrorMessage name="area" className="text-danger" component="p" />
                    </Col>
                    <Col md={6} className="my-2">
                      <label htmlFor="houseNo" className="required">{t("address.houseNo")}</label>
                      <Field name="houseNo" id="houseNo" className="form-control" />
                      <ErrorMessage name="houseNo" className="text-danger" component="p" />
                    </Col>
                    <Col md={6} className="my-2">
                      <label htmlFor="landmark" className="required">{t("address.landmark")}</label>
                      <Field name="landmark" id="landmark" className="form-control" />
                      <ErrorMessage name="landmark" className="text-danger" component="p" />
                    </Col>
                    <Col md={6} className="my-2">
                      <label htmlFor="address" className="required">{t("address.line")}</label>
                      <Field name="address" id="address" className="form-control" />
                      <ErrorMessage name="address" className="text-danger" component="p" />
                    </Col>
                  </>
                )}
                <Col md={6} className="my-2">
                  <label htmlFor="addressType">{t("address.type")}</label>
                  <div className="addresstype d-flex align-items-center gap-4">
                    <div>
                      <label htmlFor="addressType-home" className="d-flex align-items-center">
                        <span className="me-2">{t("address.home")}</span>
                        <Field type="radio" name="addressType" id="addressType-home" value="home" />
                      </label>
                    </div>
                    <div>
                      <label htmlFor="addressType-office" className="d-flex align-items-center">
                        <span className="me-2">{t("address.office")}</span>
                        <Field type="radio" name="addressType" id="addressType-office" value="office" />
                      </label>
                    </div>
                    <div>
                      <label htmlFor="addressType-other" className="d-flex align-items-center">
                        <span className="me-2">{t("address.other")}</span>
                        <Field type="radio" name="addressType" id="addressType-other" value="other" />
                      </label>
                    </div>
                  </div>
                  <ErrorMessage name="addressType" className="text-danger" component="p" />
                </Col>
                <Col md={6} className="my-2">
                  <div className="default_house d-flex align-items-center">
                    <label htmlFor="default" className="d-flex align-items-center mb-0">
                      {t("address.default")}
                      <span className="ms-2">
                        <Field type="checkbox" name="default" id="default" />
                      </span>
                    </label>
                  </div>
                  <ErrorMessage name="default" className="text-danger" component="p" />
                </Col>
                <Col md={4} className="my-2 pt-4">
                  <Button type="submit" className="track_order w-100" disabled={form.isSubmitting || locating}>
                    {t("address.save")}
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>
        );
      }}
    </Formik>
  );
};

export default AddAddress;
