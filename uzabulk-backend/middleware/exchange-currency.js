const { defaultExchangeRate } = require("../config/db/constants");

module.exports = async (req, res, next) => {
    try {
        const currencyCode = req.get('Accept-Currency') || defaultExchangeRate.symbol;
        const exchangeRate = await _model.CurrencyExchangeRate.findOne({ code: currencyCode }).exec();

        req.exchangeRate = exchangeRate || defaultExchangeRate;

    }
    catch (error) {
        console.log("Exchange middleware error", error.message);
        req.exchangeRate = defaultExchangeRate;
    }
    next();
}