const Product = require('../services');
const { processVariations } = require("../../../utils");
const { isValidObjectId } = require('../../../validators/validator');
const { priceExchange } = require('../../../helpers/helper');
const productIndex = require('../../../elasticsearch/indexes/productIndex');
const esProductService = require('../services/esProductService');
const { getProductDetail, searchImageQuery } = require('../services/alibaba');
const { searchGoogleImageKeywords } = require('../services/googleImageSearch');
const { searchLocalImage, searchLocalImageLive } = require('../services/localImageSearch');
const { updateProductDetails } = require('../helper/migration');

const looksLikeObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeSearchText = (value = "") => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

const filterItemsBySearchTokens = (items = [], search = "") => {
    const normalizedQuery = normalizeSearchText(search);
    if (!normalizedQuery) return items;

    const tokens = normalizedQuery.split(" ").filter(Boolean);
    if (!tokens.length) return items;

    return items.filter((item) => {
        const haystack = normalizeSearchText(
            [
                item?.name,
                item?.sku,
                item?.slug,
                item?.short_description,
                item?.description,
            ]
                .filter(Boolean)
                .join(" ")
        );
        return tokens.every((token) => haystack.includes(token));
    });
};

/** ES `productIndex.search` returns `{ items, total }`; older paths may still return a bare array. */
const unwrapEsSearchResult = (result) => {
    if (Array.isArray(result)) {
        return { items: result, total: 0 };
    }
    const items = result?.items || [];
    const total = typeof result?.total === "number" ? result.total : 0;
    return { items, total };
};

const getMongoListQuery = ({ category, fieldName, fieldValue, search } = {}) => {
    const query = { status: "active" };

    if (category && isValidObjectId(category)) {
        query.categories = category;
    }
    if (fieldName && fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== "") {
        query[fieldName] = fieldValue;
    }
    if (search && String(search).trim()) {
        const tokens = String(search)
            .trim()
            .split(/\s+/)
            .map((token) => escapeRegex(token))
            .filter(Boolean);
        if (tokens.length) {
            query.$and = tokens.map((token) => ({
                name: { $regex: new RegExp(token, "i") },
            }));
        }
    }

    return query;
};

const normalizeFeaturedImageLink = (items = []) => items.map((item) => {
    if (item?.featured_image?.link) {
        return { ...item, featured_image: item.featured_image.link };
    }
    return item;
});

const resolveActiveCatalogItems = async (items = []) => {
    if (!Array.isArray(items) || !items.length) return [];

    const mongoIds = [];
    const offerIds = [];

    items.forEach((item) => {
        const mongoId = String(item?._id || "").trim();
        const offerId = String(item?.offerId || "").trim();
        if (looksLikeObjectId(mongoId)) {
            mongoIds.push(mongoId);
        }
        if (offerId) {
            offerIds.push(offerId);
        }
    });

    if (!mongoIds.length && !offerIds.length) return [];

    const orQuery = [];
    if (mongoIds.length) {
        orQuery.push({ _id: { $in: [...new Set(mongoIds)] } });
    }
    if (offerIds.length) {
        orQuery.push({ offerId: { $in: [...new Set(offerIds)] } });
    }

    const activeProducts = await _model.Product.find({
        status: "active",
        $or: orQuery,
    })
        .select("_id offerId")
        .lean();

    if (!activeProducts.length) return [];

    const byId = new Map();
    const byOfferId = new Map();
    activeProducts.forEach((product) => {
        const id = String(product._id);
        byId.set(id, product);
        if (product.offerId) {
            byOfferId.set(String(product.offerId), product);
        }
    });

    const usedIds = new Set();
    const resolved = [];

    items.forEach((item) => {
        const currentId = String(item?._id || "").trim();
        const currentOfferId = String(item?.offerId || "").trim();

        let matched = null;
        if (looksLikeObjectId(currentId) && byId.has(currentId)) {
            matched = byId.get(currentId);
        } else if (currentOfferId && byOfferId.has(currentOfferId)) {
            matched = byOfferId.get(currentOfferId);
        }

        if (!matched) return;

        const resolvedId = String(matched._id);
        if (usedIds.has(resolvedId)) return;
        usedIds.add(resolvedId);

        resolved.push({
            ...item,
            _id: resolvedId,
            offerId: item?.offerId || matched?.offerId || "",
        });
    });

    return resolved;
};

const imageProjection = {
    name: 1,
    price: 1,
    bestSeller: 1,
    compare_price: 1,
    images: 1,
    featured_image: 1,
    average_rating: 1,
    rating_count: 1,
    short_description: 1,
    description: 1,
    manage_stock: 1,
    stock_quantity: 1,
    stock_status: 1,
    isFeatured: 1,
    date_created_utc: 1,
    featureAttribute: 1,
    offerId: 1,
};

const mapProductsByOfferOrder = async (offerIds = []) => {
    const uniq = [...new Set(
        (offerIds || []).map((id) => String(id || "").trim()).filter(Boolean)
    )];
    if (!uniq.length) return [];

    const found = await _model.Product.find({
        status: "active",
        offerId: { $in: uniq },
    })
        .select(imageProjection)
        .populate({ path: "featured_image", select: "link -_id" })
        .populate({ path: "variations", select: "-meta_data", options: { lean: true } })
        .lean();

    const byOffer = new Map(found.map((p) => [String(p.offerId), p]));
    const items = [];
    uniq.forEach((id) => {
        const p = byOffer.get(id);
        if (!p) return;
        const img = p.featured_image;
        items.push(
            img && typeof img === "object" && img.link
                ? { ...p, featured_image: img.link }
                : { ...p }
        );
    });
    return items;
};

module.exports = {
    topRankingProductsOld: async (req, res) => {
        try {

            let query = { status: "active", };//isFeatured: true

            let items = await Product.getTopRankingProducts(query, req.paginationOptions);
            let total = await Product.countData(query);

            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    newArrivalProductsOld: async (req, res) => {
        try {

            let query = { status: "active" };

            let items = await Product.getNewArrivalsProducts(query, req.paginationOptions);
            let total = await Product.countData(query);

            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            res.error(error)
        }
    },
    getSavingsSpotlightOld: async (req, res) => {
        try {

            let query = { status: "active" };

            let items = await Product.getSavingsSpotlight(query, req.paginationOptions);
            let total = await Product.countData(query);

            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            res.error(error)
        }
    },
    searchAutocomplete: async (req, res) => {
        try {
            const { search = "", category } = req.query;
            const limit = Math.max(1, Math.min(parseInt(req.query?.limit, 10) || 10, 20));
            const skip = Math.max(0, parseInt(req.query?.skip, 10) || 0);

            if (!search)
                return res.success("RECORD_FOUND", []);

            let items = [];
            try {
                const { items: esItems } = unwrapEsSearchResult(
                    await esProductService.list({
                        limit,
                        skip,
                        search,
                        category,
                    })
                );
                items = esItems;
            } catch (error) {
                const mongoQuery = getMongoListQuery({ category, search });
                items = await Product.getNewArrivalsProducts(mongoQuery, { limit, skip });
                items = normalizeFeaturedImageLink(items);
                items = filterItemsBySearchTokens(items, search);
            }

            return res.success("RECORD_FOUND", items);

        } catch (error) {
            console.error(error);
            res.error(error);
        }
    },
    topRankingProducts: async (req, res) => {
        try {

            const { skip, limit } = req.paginationOptions;
            let items = [];
            let total = 0;

            try {
                const { items: rawItems, total: esTotal } = unwrapEsSearchResult(
                    await esProductService.filter({
                        limit,
                        skip,
                        sort: {
                            average_rating: {
                                order: "desc"
                            }
                        }
                    })
                );
                items = await resolveActiveCatalogItems(rawItems);
                total = esTotal;
            } catch (error) {
                const mongoQuery = { status: "active" };
                items = await Product.getTopRankingProducts(mongoQuery, req.paginationOptions);
                total = await Product.countData(mongoQuery);
                items = normalizeFeaturedImageLink(items);
            }

            await priceExchange(items, req.exchangeRate);
            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    newArrivalProducts: async (req, res) => {
        try {

            const { skip, limit } = req.paginationOptions;
            const { search, category } = req.query;
            let items = [];
            let total = 0;

            try {
                const { items: rawItems, total: esTotal } = unwrapEsSearchResult(
                    await esProductService.filter({
                        limit,
                        skip,
                        search,
                        category,
                        sort: {
                            date_created_utc: {
                                order: "desc"
                            }
                        }
                    })
                );
                items = await resolveActiveCatalogItems(rawItems);
                total = esTotal;
            } catch (error) {
                const mongoQuery = getMongoListQuery({ category, search });
                items = await Product.getNewArrivalsProducts(mongoQuery, req.paginationOptions);
                total = await Product.countData(mongoQuery);
                items = normalizeFeaturedImageLink(items);
            }

            await priceExchange(items, req.exchangeRate);
            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            res.error(error)
        }
    },
    getSavingsSpotlight: async (req, res) => {
        try {
            const { skip, limit } = req.paginationOptions;
            const { search, category } = req.query;
            let items = [];
            let total = 0;

            try {
                const { items: rawItems, total: esTotal } = unwrapEsSearchResult(
                    await esProductService.filter({
                        limit,
                        skip,
                        search,
                        category,
                        sort: {
                            price: {
                                order: "desc"
                            }
                        }
                    })
                );
                items = await resolveActiveCatalogItems(rawItems);
                total = esTotal;
            } catch (error) {
                const mongoQuery = getMongoListQuery({ category, search });
                items = await Product.getSavingsSpotlight(mongoQuery, req.paginationOptions);
                total = await Product.countData(mongoQuery);
                items = normalizeFeaturedImageLink(items);
            }

            await priceExchange(items, req.exchangeRate);
            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            res.error(error)
        }
    },
    viewOld: async (req, res) => {
        try {
            let { _id } = req.params;
            let query = { _id, status: "active" };

            let item = await Product.view(query);

            if (!item) {
                return res.error("INVALID_PRODUCT_ID");
            };

            item = processVariations(item);

            return res.success(item);

        } catch (error) {
            console.log(error)
            res.error(error)
        }
    },
    /** Resolve catalog Mongo _id from 1688 offerId (numeric string stored on Product.offerId). */
    viewByOfferId: async (req, res) => {
        try {
            const raw = String(req.params.offerId || "").trim();
            if (!raw || raw.length > 32 || !/^\d+$/.test(raw)) {
                return res.error("INVALID_PRODUCT_ID");
            }
            const offerIdCandidates = [raw];
            const noLeadingZeros = raw.replace(/^0+(?=\d)/, "");
            if (noLeadingZeros && noLeadingZeros !== raw) {
                offerIdCandidates.push(noLeadingZeros);
            }
            const product = await _model.Product.findOne({
                status: "active",
                offerId: { $in: [...new Set(offerIdCandidates)] },
            })
                .select("_id")
                .lean();
            if (!product?._id) {
                return res.error("INVALID_PRODUCT_ID");
            }
            return res.success({ _id: String(product._id) });
        } catch (error) {
            console.error(error);
            res.error(error);
        }
    },
    view: async (req, res) => {
        try {
            let { _id } = req.params;
            let query = { _id, status: "active" };

            if (req.product?.offerId) {

                const currentDate = new Date()
                const parsed_updated_date = new Date(req.product.last_updated || new Date())
                const time_difference = (currentDate - parsed_updated_date) / (1000 * 60 * 60)

                if (!req.product.last_updated || time_difference >= 24) {

                    const productDetails = await getProductDetail(req.product.offerId);

                    // If live sync fails (ACL/token/network), keep serving cached DB detail.
                    // Only mark out of stock when supplier explicitly returns non-published status.
                    if (productDetails && productDetails?.status && productDetails?.status !== "published") {
                        module.exports.productArchived(_id);
                        return res.success("PRODUCT_OUT_OF_STOCK", null, { outOfStock: true });
                    };

                    if (!productDetails) {
                        console.warn(`Alibaba product sync unavailable for offerId=${req.product.offerId}. Serving cached product detail.`);
                    } else if (productDetails?.status == "published") {
                        await updateProductDetails(req.product, productDetails);
                    }

                }
            };

            let item = await Product.view(query);

            if (!item) {
                return res.error("INVALID_PRODUCT_ID");
            };

            item = processVariations(item);

            await priceExchange(item, req.exchangeRate);
            return res.success(item);

        } catch (error) {
            console.log(error)
            res.error(error)
        }
    },
    adminSellerProducts: async (req, res) => {
        try {

            let query = { status: "active", adminSold: true };
            let { category } = req.query;

            if (category) {
                if (!isValidObjectId(category)) {
                    return res.error("INVALID_CATEGORY_ID");
                }
                query.categories = category;
            } else {
                query.isFeatured = true;
            };

            let items = await Product.list(query, req.paginationOptions);
            let total = await Product.countData(query);

            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    listOld: async (req, res) => {
        try {

            let query = { status: "active" };
            let { category, fieldName, fieldValue } = req.query;

            if (category) {
                if (!isValidObjectId(category)) {
                    return res.error("INVALID_CATEGORY_ID");
                }
                query.categories = category;
            }

            if (fieldName && fieldValue) {
                query[fieldName] = fieldValue;
            }

            let items = await Product.list(query, req.paginationOptions);
            let total = await Product.countData(query);

            return res.success(req.nextPageOptions(items, total));

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    list: async (req, res) => {
        try {
            const { category, fieldName, fieldValue, search, image, country } = req.query;
            const { limit, skip } = req.paginationOptions;
            const imageUrl = typeof image === "string" ? image.trim() : "";

            if (imageUrl) {
                const googleImageSearch = await searchGoogleImageKeywords({
                    imageAddress: imageUrl,
                });

                if (googleImageSearch?.primaryKeyword) {
                    const googleSearchQuery = {
                        category,
                        fieldName,
                        fieldValue,
                        search: googleImageSearch.primaryKeyword,
                        limit,
                        skip,
                    };

                    let googleRawItems = unwrapEsSearchResult(
                        await esProductService.list(googleSearchQuery)
                    ).items;

                    // If first keyword is too narrow, enrich from additional keywords.
                    if (googleRawItems.length < limit && Array.isArray(googleImageSearch.keywords)) {
                        const seen = new Set(googleRawItems.map((item) => String(item?._id || item?.offerId || "")));
                        for (const keyword of googleImageSearch.keywords.slice(1, 4)) {
                            if (!keyword) continue;
                            const { items: extra } = unwrapEsSearchResult(
                                await esProductService.list({
                                    ...googleSearchQuery,
                                    search: keyword,
                                    skip: 1,
                                    limit,
                                })
                            );
                            extra.forEach((item) => {
                                const key = String(item?._id || item?.offerId || "");
                                if (!key || seen.has(key)) return;
                                seen.add(key);
                                googleRawItems.push(item);
                            });
                            if (googleRawItems.length >= limit) break;
                        }
                    }

                    let items = await resolveActiveCatalogItems(googleRawItems);
                    items = items.slice(0, limit);

                    const categoryData = category ? await _model.Category.findById(category) : null;
                    await priceExchange(items, req.exchangeRate);

                    return res.success(req.nextPageOptions(items, items.length ? 500 : 0, {
                        category: categoryData,
                        imageSearch: true,
                        imageSearchProvider: "google",
                        imageSearchKeyword: googleImageSearch.primaryKeyword,
                        imageSearchKeywords: googleImageSearch.keywords,
                    }));
                }

                const localImageSearch = await searchLocalImage({
                    imageAddress: imageUrl,
                    limit,
                });
                if (localImageSearch?.offerIds?.length) {
                    const items = await mapProductsByOfferOrder(localImageSearch.offerIds);
                    const categoryData = category ? await _model.Category.findById(category) : null;
                    await priceExchange(items, req.exchangeRate);
                    return res.success(req.nextPageOptions(items.slice(0, limit), items.length, {
                        category: categoryData,
                        imageSearch: true,
                        imageSearchProvider: "local",
                    }));
                }

                // If prebuilt index is unavailable, run live local matching on a small candidate set.
                const liveCandidates = await _model.Product.find({ status: "active" })
                    .select("offerId name featured_image")
                    .populate({ path: "featured_image", select: "link -_id" })
                    .sort({ date_created_utc: -1 })
                    .limit(120)
                    .lean();
                const localLive = await searchLocalImageLive({
                    imageAddress: imageUrl,
                    limit,
                    candidates: liveCandidates.map((p) => ({
                        offerId: p?.offerId,
                        name: p?.name,
                        imageUrl: typeof p?.featured_image === "string" ? p.featured_image : p?.featured_image?.link,
                    })),
                });
                if (localLive?.offerIds?.length) {
                    const items = await mapProductsByOfferOrder(localLive.offerIds);
                    const categoryData = category ? await _model.Category.findById(category) : null;
                    await priceExchange(items, req.exchangeRate);
                    return res.success(req.nextPageOptions(items.slice(0, limit), items.length, {
                        category: categoryData,
                        imageSearch: true,
                        imageSearchProvider: "local",
                    }));
                }

                const beginPage = Math.floor(skip / limit) + 1;
                const imageCountry =
                    typeof country === "string" && country.trim() ? country.trim() : "en";

                const alibabaResult = await searchImageQuery({
                    imageAddress: imageUrl,
                    beginPage,
                    pageSize: limit,
                    country: imageCountry,
                });

                const rows = Array.isArray(alibabaResult?.data) ? alibabaResult.data : [];
                const offerIds = rows
                    .map((r) => String(r?.offerId ?? "").trim())
                    .filter(Boolean);
                let items = await mapProductsByOfferOrder(offerIds);

                const totalRecords =
                    typeof alibabaResult?.totalRecords === "number"
                        ? alibabaResult.totalRecords
                        : items.length;

                await priceExchange(items, req.exchangeRate);
                const categoryData = category ? await _model.Category.findById(category) : null;

                const pageNum = Number(req.query.skip) || 1;
                const total = totalRecords || 0;
                const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
                const hasMore = totalPages > 0 ? pageNum < totalPages : false;

                return res.success({
                    items,
                    total,
                    skip: pageNum,
                    limit,
                    totalPages: totalPages || 0,
                    hasMore,
                    others: { category: categoryData, imageSearch: true, imageSearchProvider: "alibaba" },
                });
            }

            let items = [];
            let total = 0;
            let rawEsItems = [];
            let esTotalHits = 0;
            let usedElasticsearch = false;

            try {
                const esPayload = unwrapEsSearchResult(
                    await esProductService.list({
                        category, fieldName, fieldValue, search,
                        limit, skip,
                    })
                );
                rawEsItems = esPayload.items;
                esTotalHits = esPayload.total;
                items = await resolveActiveCatalogItems(rawEsItems);
                total = esTotalHits;
                usedElasticsearch = true;
            } catch (error) {
                const mongoQuery = getMongoListQuery({ category, fieldName, fieldValue, search });
                items = await Product.list(mongoQuery, req.paginationOptions);
                total = await Product.countData(mongoQuery);
                items = normalizeFeaturedImageLink(items);
            }
            items = filterItemsBySearchTokens(items, search);

            const categoryData = category ? await _model.Category.findById(category) : null;

            await priceExchange(items, req.exchangeRate);
            const listExtras = { category: categoryData };
            if (usedElasticsearch) {
                listExtras.hasMore =
                    rawEsItems.length === limit && skip + rawEsItems.length < esTotalHits;
            }
            return res.success(req.nextPageOptions(items, total, listExtras));

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    productArchived: async (productId) => {
        try {
            const updatedProduct = await _model.Product.findByIdAndUpdate(
                productId,
                { status: "archived" },
                { new: true, lean: true }
            );
            await productIndex.set(updatedProduct);

        } catch (error) {
            console.error("productArchived", error)

        }

    },
    frequentlySearch: async (req, res) => {
        try {
            if (!global._model?.FrequentlySearch?.get) {
                return res.success("RECORD_FOUND", []);
            }
            const _data = await _model.FrequentlySearch.get();

            return res.success("RECORD_FOUND", _data);

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
};

