import { Col, Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import ChangeProfile from "./ChangeProfile";
import ChangeMobileNumber from "./ChangeMobileNumber";
import ChangeEmail from "./ChangeEmail";
import ProfileAddresses from "./ProfileAddresses";
import ProfileChangePassword from "./ProfileChangePassword";
import LoadingContent from "../../Components/Common/LoadingContent";
import NoRecordFound from "../../Components/Common/NoRecordFound";

import { APP_NAME } from "../../config/constants";
import { apiGetProfile } from "../../store/auth/actions";
import { clearUserProfile } from "../../store/auth/slice";

const TABS = [
  { id: "details", labelKey: "account.profile", fallback: "Profile" },
  { id: "addresses", labelKey: "account.myAddress", fallback: "Addresses" },
  { id: "password", labelKey: "account.changePassword", fallback: "Change Password" },
];

const ProfilePage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isLoading, profile } = useSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState("details");
  const [changeMobileNumber, setChangeMobileNumber] = useState(false);
  const [changeEmailAddress, setChangeEmailAddress] = useState(false);

  const changeMobile = () => {
    setChangeMobileNumber(true);
    setChangeEmailAddress(false);
  };

  const changeEmail = () => {
    setChangeMobileNumber(false);
    setChangeEmailAddress(true);
  };

  const changeProfile = () => {
    setChangeMobileNumber(false);
    setChangeEmailAddress(false);
  };

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setChangeMobileNumber(false);
    setChangeEmailAddress(false);
  };

  useEffect(() => {
    dispatch(apiGetProfile());

    return () => {
      dispatch(clearUserProfile());
    };
  }, [dispatch]);

  return (
    <section className="profile_view bg-white px-3 pt-4 pb-2 rounded">
      <Helmet>
        <title>{APP_NAME} | Profile</title>
      </Helmet>
      <Container>
        <Row>
          {profile ? (
            <>
              <Col lg="12" className="text-start mb-3">
                <h4>Profile</h4>
              </Col>

              <Col lg="12" className="mb-3">
                <div className="profile_tabs" role="tablist" aria-label="Profile sections">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`profile_tabs__btn${isActive ? " is-active" : ""}`}
                        onClick={() => switchTab(tab.id)}
                      >
                        {t(tab.labelKey, { defaultValue: tab.fallback })}
                      </button>
                    );
                  })}
                </div>
              </Col>

              <Col lg="12">
                {activeTab === "details" ? (
                  changeMobileNumber ? (
                    <ChangeMobileNumber changeProfile={changeProfile} />
                  ) : changeEmailAddress ? (
                    <ChangeEmail changeProfile={changeProfile} />
                  ) : (
                    <ChangeProfile
                      changeMobile={changeMobile}
                      changeEmail={changeEmail}
                    />
                  )
                ) : null}

                {activeTab === "addresses" ? <ProfileAddresses /> : null}

                {activeTab === "password" ? <ProfileChangePassword /> : null}
              </Col>
            </>
          ) : isLoading ? (
            <LoadingContent />
          ) : (
            <NoRecordFound />
          )}
        </Row>
      </Container>
    </section>
  );
};

export default ProfilePage;
