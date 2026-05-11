import React, { useState } from "react";
import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import ProductSearch from "../../Components/Common/ProductSearch";
import ROUTES from "../../helpers/routesHelper";

const Homebanner = () => {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = (searchText || "").trim();
    if (!trimmed) return;
    navigate(`${ROUTES.PRODUCT_LISTING}?search=${encodeURIComponent(trimmed)}&skip=1`);
  };

  return (
    <section className="home_alibaba_hero position-relative">
      <Container>
        <div className="home_alibaba_hero_inner home_alibaba_hero_shell text-center">
          <div className="home_alibaba_welcome text-white mb-2">
            <h5 className="text-white mb-0 fw-semibold">Find wholesale products in seconds</h5>
          </div>
          <form className="home_alibaba_search position-relative" onSubmit={handleSubmit}>
            <ProductSearch
              defaultValue={searchText}
              placeholder="Search for products, brands, and more..."
              callback={({ search }) => setSearchText(search || "")}
            />
            <button type="submit" className="banner_search">
              Search
            </button>
          </form>
        </div>
      </Container>
    </section>
  );
};

export default Homebanner;
