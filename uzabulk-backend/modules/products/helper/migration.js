const _ = require("lodash")
const { getProductDetail } = require('../services/alibaba');
const { bulkInsert } = require("../../../elasticsearch/indexes/productIndex");
const STORE_TYPE_ID = "660e3c271095513081ed2223";

const updateProductDetails = async (product, productDetails) => {
    try {
        let productObject = {};
        console.log("Product Processing to fetch latest - ", product.offerId);

        if (productDetails && productDetails.status == "published") {

            const { topCategoryId = "", secondCategoryId, thirdCategoryId, status, productSkuInfos, subjectTrans, offerId, description, productSaleInfo, productImage, tradeScore, soldOut, productAttribute, mainVideo, detailVideo, sellerOpenId, productShippingInfo } = productDetails;
            const price_tiers = transformPriceRange(productSaleInfo?.priceRangeList || [])

            const [categories, variations] = await Promise.all([
                _model.Category.getExternalCategory([topCategoryId, secondCategoryId, thirdCategoryId]),
                transformAndInsertProductSKUs(product.vendor, productSkuInfos)
            ]);

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
                average_rating: isNaN(tradeScore) ? 0 : parseInt(tradeScore),
                rating_count: 0,
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