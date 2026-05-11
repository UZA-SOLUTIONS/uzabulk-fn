import React from "react";
import { Row, Col } from "react-bootstrap";

import NewArrivalProducts from "../../Components/Home/NewArrivalProducts";
import BestDealsDiscover from "../../Components/Home/BestDealsDiscover";
import OftenPurchasedCategories from "../../Components/Home/OftenPurchasedCategories";
import CategoryCircleSlider from "../../Components/Home/CategoryCircleSlider";

const Discover = () => {
  return (
    <>
      <Row className="g-3 align-items-stretch">
        <Col lg={12}>
          <div className="discover_group_block px-3 w-100">
            <CategoryCircleSlider />
            <OftenPurchasedCategories />
          </div>
        </Col>
      </Row>
      <Row className="g-3 align-items-stretch">
        <Col lg={12} md={12} className="d-flex">
          <NewArrivalProducts />
        </Col>
      </Row>

      <Row className="g-3 align-items-stretch">
        <Col lg={12} md={12} className="d-flex">
          <BestDealsDiscover />
        </Col>
      </Row>
    </>
  );
};

export default Discover;
