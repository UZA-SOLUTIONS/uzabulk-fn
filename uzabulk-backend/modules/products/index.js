const express = require('express');
const router = express.Router();
const controller = require('./controllers');
const { authorization, setPagination, exchangeCurrency } = require("../../middleware");
const { productValidate } = require("./middleware");
router.get('/searchAutocomplete', exchangeCurrency, controller.searchAutocomplete);
router.get('/top-ranking', setPagination, exchangeCurrency, controller.topRankingProducts);
router.get('/new-arrivals', setPagination, exchangeCurrency, controller.newArrivalProducts);
router.get('/savings-spotlight', setPagination, exchangeCurrency, controller.getSavingsSpotlight);
router.get('/list', setPagination, exchangeCurrency, controller.list);
router.get('/by-offer/:offerId', exchangeCurrency, controller.viewByOfferId);
router.get('/view/:_id', productValidate, exchangeCurrency, controller.view);
router.get('/guaranteed-products', setPagination, controller.adminSellerProducts);
router.get('/frequentlySearch', controller.frequentlySearch);


module.exports = router;