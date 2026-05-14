const _ = require("lodash")
const { getProductDetail } = require('../services/alibaba');
const { bulkInsert } = require("../../../elasticsearch/indexes/productIndex");
const STORE_TYPE_ID = "660e3c271095513081ed2223";

const firstFiniteNumber = (values = []) => {
    for (const value of values) {
        if (value === undefined || value === null || value === "") continue;
        const numericText = typeof value === "string" ? value.match(/-?\d+(\.\d+)?/)?.[0] : value;
        const numberValue = Number(numericText);
        if (Number.isFinite(numberValue)) return numberValue;
    }
    return null;
};

const normalizeRatingValue = (value) => {
    const rating = firstFiniteNumber([value]);
    if (rating === null || rating <= 0) return null;
    if (rating > 10 && rating <= 100) return Number((rating / 20).toFixed(1));
    if (rating > 5 && rating <= 10) return Number((rating / 2).toFixed(1));
    return Number(Math.min(rating, 5).toFixed(1));
};

const getSupplierRatingStats = (productDetails = {}) => {
    const rating = normalizeRatingValue(firstFiniteNumber([
        productDetails.tradeScore,
        productDetails.score,
        productDetails.rating,
        productDetails.averageRating,
        productDetails.average_rating,
        productDetails.productRating,
        productDetails.productScore,
        productDetails?.statistics?.rating,
        productDetails?.statistics?.averageRating,
        productDetails?.reviewInfo?.averageRating,
        productDetails?.reviewInfo?.rating,
        productDetails?.sellerData?.score,
    ]));

    const count = firstFiniteNumber([
        productDetails.ratingCount,
        productDetails.rating_count,
        productDetails.reviewCount,
        productDetails.reviewsCount,
        productDetails.evaluationCount,
        productDetails.productReviewCount,
        productDetails?.statistics?.ratingCount,
        productDetails?.statistics?.reviewCount,
        productDetails?.reviewInfo?.ratingCount,
        productDetails?.reviewInfo?.reviewCount,
    ]);

    return {
        average_rating: rating,
        rating_count: count !== null && count > 0 ? Math.floor(count) : 0,
    };
};

const getLocalReviewRatingStats = async (productId) => {
    if (!productId || !_model?.productReview?.aggregate) {
        return { average_rating: null, rating_count: 0 };
    }

    const [stats] = await _model.productReview.aggregate([
        {
            $match: {
                product_id: String(productId),
                status: "approved",
                rating: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: "$product_id",
                average_rating: { $avg: "$rating" },
                rating_count: { $sum: 1 },
            },
        },
    ]);

    return {
        average_rating: normalizeRatingValue(stats?.average_rating),
        rating_count: Number(stats?.rating_count) || 0,
    };
};

const resolveProductRatingStats = (supplierStats, localStats) => {
    if (supplierStats?.average_rating !== null && supplierStats?.average_rating !== undefined) {
        return {
            average_rating: supplierStats.average_rating,
            rating_count: supplierStats.rating_count || 0,
        };
    }

    return {
        average_rating: localStats?.average_rating || 0,
        rating_count: localStats?.rating_count || 0,
    };
};

const updateProductDetails = async (product, productDetails) => {
    try {
        let productObject = {};
        console.log("Product Processing to fetch latest - ", product.offerId);

        if (productDetails && productDetails.status == "published") {

            const { topCategoryId = "", secondCategoryId, thirdCategoryId, status, productSkuInfos, subjectTrans, offerId, description, productSaleInfo, productImage, soldOut, productAttribute, mainVideo, detailVideo, sellerOpenId, productShippingInfo } = productDetails;
            const price_tiers = transformPriceRange(productSaleInfo?.priceRangeList || [])

            const [categories, variations, localRatingStats] = await Promise.all([
                _model.Category.getExternalCategory([topCategoryId, secondCategoryId, thirdCategoryId]),
                transformAndInsertProductSKUs(product.vendor, productSkuInfos),
                getLocalReviewRatingStats(product._id)
            ]);
            const ratingStats = resolveProductRatingStats(
                getSupplierRatingStats(productDetails),
                localRatingStats
            );

            productObject = {
                status: status === "published" ? "active" : "inactive",
                categories: categories.map(i => i._id),
                topCategoryId: categories[0]?._id,
                secondCategoryId: categories[1]?._id,
                thirdCategoryId: categories[2]?._id,
                attributes: variations.attributes,
                variations: variations.variations,

                // update basic details
                externalProduct: product._id,
                offerId: offerId,
                storeType: "660e3c271095513081ed2223",
                vendor: "6625f5426b433d206e538ec2",
                name: subjectTrans || "",
                type: productSkuInfos?.length ? "variable" : "simple",
                isFeatured: "no",
                short_description: "",
                description: description || "",
                sku: "", // Consider adding SKU logic if needed
                price: price_tiers[0]?.price,
                compare_price: 0,
                manage_stock: Boolean(productSaleInfo.amountOnSale),
                bestSeller: "yes",
                stock_quantity: productSaleInfo.amountOnSale,
                pricingType: productSaleInfo?.unitInfo?.transUnit,
                stock_status: "instock",
                featured_image: productImage?.images[0],
                images: productImage?.images,
                average_rating: ratingStats.average_rating,
                rating_count: ratingStats.rating_count,
                sold_count: soldOut,
                shippingCharge: 0,
                price_tiers,
                featureAttribute: productAttribute,
                productVideos: {
                    main: mainVideo,
                    detail: detailVideo
                },
                adminSold: true,
                external: true,
                sellerOpenId,
                productShippingInfo,
                last_updated: new Date()
            };

        } else productObject = { deleted_at: new Date(), status: "active", last_updated: new Date() };

        const updateProduct = await _model.Product.findOneAndUpdate({ _id: product._id }, productObject, { new: true });
        await bulkInsert([updateProduct]);
        console.log("Product Updated Completed");

    } catch (error) { console.error(`Error processing product ${product._id}:`, error); };
};

const transformAndInsertProductSKUs = async (vendor, productSkuInfos) => {
    if (!productSkuInfos) {
        return { variations: [], attributes: [] };
    }

    const variationAttributes = {};
    const variationIds = [];
    const attributes = {};

    const skuPromises = productSkuInfos.map(async (skuInfo) => {
        const productVariationAttributes = [];

        const attrPromises = skuInfo.skuAttributes.map(async (attr) => {
            let attribute = attributes[attr.attributeId] ||
                await _model.Attribute.findOneAndUpdate(
                    { externalAttrId: attr.attributeId, name: attr.attributeNameTrans, vendor },
                    { externalAttrId: attr.attributeId, storeType: STORE_TYPE_ID, vendor, name: attr.attributeNameTrans, status: "active" },
                    { new: true, upsert: true }
                );

            attributes[attr.attributeId] = attribute;

            const term = await _model.AttributeTerm.findOneAndUpdate(
                { attribute: attribute._id, name: attr.valueTrans },
                { vendor, image: attr.skuImageUrl, attribute: attribute._id, name: attr.valueTrans, status: "active" },
                { new: true, upsert: true }
            );

            if (!variationAttributes[attribute._id]) {
                variationAttributes[attribute._id] = { _id: attribute._id, name: attr.attributeNameTrans, terms: [] };
            }

            if (!variationAttributes[attribute._id].terms.find(termItem => termItem._id.equals(term._id))) {
                variationAttributes[attribute._id].terms.push({ _id: term._id, name: attr.valueTrans, image: attr.skuImageUrl });
            }

            productVariationAttributes.push({ _id: term._id, name: attr.valueTrans });
        });

        await Promise.all(attrPromises);

        const productVariation = {
            specId: skuInfo.specId,
            skuId: skuInfo.skuId,
            description: skuInfo.description,
            image: skuInfo.image,
            sku: skuInfo.sku,
            price: skuInfo.consignPrice,
            compare_price: skuInfo.consignPrice,
            manage_stock: true,
            stock_quantity: skuInfo.amountOnSale,
            stock_status: skuInfo.amountOnSale ? "instock" : "outofstock",
            attributes: productVariationAttributes
        };

        const newProductVariation = await _model.productVariation.findOneAndUpdate(
            { skuId: skuInfo.skuId },
            productVariation,
            { new: true, upsert: true }
        );

        variationIds.push(newProductVariation._id);
    });

    await Promise.all(skuPromises);

    return {
        variations: variationIds,
        attributes: Object.values(variationAttributes)
    };
}

function transformPriceRange(priceRangeList) {
    if (_.isEmpty(priceRangeList)) return [];

    const sortedPriceRangeList = _.sortBy(priceRangeList, 'startQuantity');

    return _.map(sortedPriceRangeList, range => ({
        minQty: range.minQuantity,
        maxQty: range.maxQuantity,
        price: range.price,
        startQuantity: range.startQuantity
    }));
}

module.exports = { updateProductDetails };