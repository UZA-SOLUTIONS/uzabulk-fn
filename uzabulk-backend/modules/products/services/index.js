const Product = require('../../../models/productsTable');
let list = (query, { limit, skip, order, orderBy, search }) => {
    if (search) {
        query.name = { $regex: new RegExp(search, 'i') };
    };
    return Product.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ [orderBy]: order })
        .select(projection)
        .populate({ path: "featured_image", select: "link -_id" })
        .populate({ path: "variations", select: "-meta_data", options: { lean: true } })
        .lean()
};

let getTopRankingProducts = (query, { limit, skip, search }) => {
    if (search) {
        query.name = { $regex: new RegExp(search, 'i') };
    };
    return Product.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ average_rating: -1 })
        .select(projection)
        .populate({ path: "featured_image", select: "link -_id" })
        .populate({ path: "variations", select: "-meta_data", options: { lean: true } })
        .lean()
};
let getNewArrivalsProducts = (query, { limit, skip, search }) => {
    if (search) {
        query.name = { $regex: new RegExp(search, 'i') };
    };
    return Product.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 })
        .select(projection)
        .populate({ path: "featured_image", select: "link -_id" })
        .populate({ path: "variations", select: "-meta_data", options: { lean: true } })
        .lean()
};
let getSavingsSpotlight = (query, { limit, skip, search }) => {
    if (search) {
        query.name = { $regex: new RegExp(search, 'i') };
    };
    return Product.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ price: 1 })
        .select(projection)
        .populate({ path: "featured_image", select: "link -_id" })
        .populate({ path: "variations", select: "-meta_data", options: { lean: true } })
        .lean()
};
let view = (query) => {
    return Product.findOne(query)
        .populate({
            path: "vendor",
            select: "name profileImage",
            populate: {
                path: "profileImage",
                select: "link -_id"
            }
        })
        .populate({ path: "variations", select: "-meta_data", options: { lean: true } })
        .select({ ...projection, type: 1, attributes: 1, variations: 1, sold_count: 1 })
        .lean()
}

let countData = async (query) => {
    return Product.countDocuments(query);
}
let getAllProducts = (query) => {
    return Product.find(query)
        .select(projection)
        .lean()
};

let projection = {
    "name": 1,
    "price": 1,
    "bestSeller": 1,
    "compare_price": 1,
    "images": 1,
    "featured_image": 1,
    "average_rating": 1,
    "rating_count": 1,
    "short_description": 1,
    "description": 1,
    "manage_stock": 1,
    "stock_quantity": 1,
    "stock_status": 1,
    "isFeatured": 1,
    "date_created_utc": 1,
    featureAttribute: 1,
    offerId: 1,
}
module.exports = {
    list,
    countData,
    view,
    getNewArrivalsProducts,
    getTopRankingProducts,
    getSavingsSpotlight,
    getAllProducts
}