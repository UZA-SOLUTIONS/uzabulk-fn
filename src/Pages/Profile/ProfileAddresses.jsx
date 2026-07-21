import React, { useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import LoadingContent from "../../Components/Common/LoadingContent";
import NoRecordFound from "../../Components/Common/NoRecordFound";
import DeletePopup from "../../Components/Modals/DeletePopup";
import RenderAddress from "../../Components/Common/RenderAddress";

import ROUTES from "../../helpers/routesHelper";
import { apiDeleteAddress, apiGetAddresses, apiMakeDefaultAddress } from "../../store/address/actions";
import { ICON_ADDRESS_HOME, ICON_BUILDING, ICON_LOCATION } from "../../assets/svg";

/** Address list/manage block embedded on the Profile page. */
export default function ProfileAddresses() {
  const dispatch = useDispatch();
  const { isLoading, items } = useSelector((s) => s.address.addresses);
  const [deleteId, setDeleteId] = useState(null);
  const [deletePopup, setDeletePopup] = useState(false);

  const fetchRecords = () => {
    dispatch(
      apiGetAddresses({
        limit: 100,
        skip: 1,
      })
    );
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="profile_section text-start">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h5 className="mb-0">Addresses</h5>
        <Link to={ROUTES.CREATE_ADDRESS} className="profile_section__link">
          + Add Address
        </Link>
      </div>

      <DeletePopup
        show={deletePopup}
        onhide={() => setDeletePopup(false)}
        onDelete={() => {
          dispatch(
            apiDeleteAddress({
              id: deleteId,
              callback: () => {
                setDeletePopup(false);
                fetchRecords();
              },
            })
          );
        }}
      />

      <Row>
        {items?.length ? (
          items.map((address) => (
            <Col lg={6} md={6} sm={12} className="text-start mb-3" key={address._id}>
              <div className="wrap_box_address position-relative">
                <h5 className="text-capitalize">
                  {address?.addressType === "home"
                    ? ICON_ADDRESS_HOME
                    : address?.addressType === "office"
                      ? ICON_BUILDING
                      : ICON_LOCATION}{" "}
                  {address?.addressType}
                  {address?.default ? (
                    <span className="profile_address_default ms-2">Default</span>
                  ) : null}
                </h5>

                <RenderAddress address={address} />

                <div className="d-flex align-items-center mt-3 gap-2 flex-wrap">
                  <Link
                    to={`${ROUTES.CREATE_ADDRESS}/${address._id}`}
                    className="d-inline-block"
                  >
                    Edit
                  </Link>
                  <span>|</span>
                  <Button
                    className="d-inline-block"
                    onClick={() => {
                      setDeleteId(address._id);
                      setDeletePopup(true);
                    }}
                  >
                    Delete
                  </Button>
                  {address?.default === false ? (
                    <>
                      <span>|</span>
                      <span
                        className="d-inline-block cursor-pointer"
                        style={{ whiteSpace: "nowrap" }}
                        onClick={() => {
                          dispatch(apiMakeDefaultAddress({ id: address._id }));
                        }}
                      >
                        Make default
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </Col>
          ))
        ) : isLoading ? (
          <Col>
            <LoadingContent />
          </Col>
        ) : (
          <Col>
            <NoRecordFound />
          </Col>
        )}
      </Row>
    </div>
  );
}
