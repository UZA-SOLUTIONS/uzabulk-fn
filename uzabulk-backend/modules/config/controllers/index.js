"use strict";

const { defaultExchangeRate } = require("../../../config/db/constants");

exports.getStoreConfigurations = async (req, res) => {
  try {
    const data = await _model.StoreType.findOne(null, "commission");
    return res.success("SUCCESS", data);
  } catch (error) {
    console.error(error);
    res.error(error);
  }
};

// Get currencies for exchange rate.
exports.getCurrencies = async (req, res) => {
  try {
    let data = await _model.CurrencyExchangeRate.find({ status: "active" }, "-exchangeRate");

    if (!data?.length) {
      data = [defaultExchangeRate]
    }

    return res.success("SUCCESS", data);
  } catch (error) {
    console.error(error);
    res.error(error);
  }
};