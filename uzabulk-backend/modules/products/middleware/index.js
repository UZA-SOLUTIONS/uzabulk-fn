const productValidate = async (req, res, next) => {
    try {

        let { _id } = req.params;

        let product = await _model.Product.findOne({ _id, status: "active" })
            .select("_id offerId last_updated")
            .lean();

        if (!product) return res.error("INVALID_PRODUCT_ID");

        req.product = product;

        return next();

    } catch (error) { res.error(error) }
};

module.exports = { productValidate };