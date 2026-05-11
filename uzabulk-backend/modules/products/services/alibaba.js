const axios = require('axios');
const crypto = require('crypto');

const ALIBABA_BASE_APP_URL = env?.alibaba?.BASE_APP_URL || "http://gw.open.1688.com/openapi/";
const ALIBABA_APP_KEY = env?.alibaba?.APP_KEY || "";
const ALIBABA_APP_SECRET = env?.alibaba?.APP_SECRET || "";
const ALIBABA_AUTH_TOKEN = env?.alibaba?.AUTH_TOKEN || "";

const logGatewayAclHint = (body) => {
    const code = String(body?.error_code || body?.code || body?.result?.code || "");
    const msg = String(body?.error_message || body?.message || body?.result?.message || "");
    if (code.includes("APIACL") || /AppKey is not allowed/i.test(msg)) {
        console.warn(
            "[1688 Open API] ACL declined (gw.APIACLDecline): this AppKey cannot call this interface. " +
            "Use the numeric App Key from https://open.1688.com for an application that has the required APIs subscribed " +
            "(e.g. com.alibaba.fenxiao.crossborder / product.search.*). " +
            "An Alibaba Cloud application display name (e.g. official-api-mcp-server) is not the same as ALIBABA_APP_KEY unless that product explicitly gives you the 1688 app credentials."
        );
    }
};

const generateHmacSha1Signature = (data, secretKey) => {
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(data);
    return hmac.digest('hex').toUpperCase();
}

const generateApiSignature = (urlPath, params, secretKey) => {
    const paramString = Object.entries(params).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => `${key}${value}`).join('');
    const concatString = `${urlPath}${paramString}`;
    const signature = generateHmacSha1Signature(concatString, secretKey);
    const urlParams = new URLSearchParams(params);
    urlParams.append('_aop_signature', signature);
    return `${urlPath}?${urlParams.toString()}`;
}

const is1688Success = (result) =>
    result?.success === true || result?.success === "true" || result?.success === 1;

/**
 * Parse body for com.alibaba.product / alibaba.product.get (shape varies by gateway version).
 * @param {*} response — axios response
 * @returns {object | null}
 */
const extractAlibabaProductGet = (response) => {
    const data = response?.data;
    if (!data) return null;
    if (data.productInfo) return data.productInfo;
    const top = data.result;
    if (!top) return null;
    if (top.productInfo) return top.productInfo;
    if (is1688Success(top) && top.result?.productInfo) return top.result.productInfo;
    if (typeof top.result === "object" && top.result?.productInfo) return top.result.productInfo;
    return null;
};

/**
 * POST to signed URL (same param signing as GET). Many 1688 param2 APIs accept POST with query string.
 */
const makePostApiCall = async (urlPath, params, secretKey, extractFn) => {
    try {
        const signedPathAndQuery = generateApiSignature(urlPath, params, secretKey);
        const url = new URL(signedPathAndQuery, ALIBABA_BASE_APP_URL).toString();
        const response = await axios.post(url, null, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 60000,
        });
        const body = response?.data;
        logGatewayAclHint(body);
        const extracted = extractFn ? extractFn(response) : null;
        if (extracted) return extracted;
        const top = body?.result;
        if (top && !is1688Success(top)) {
            console.warn("1688 POST API unsuccessful:", top.code, top.message, top.errMsg);
            logGatewayAclHint(top);
        }
        return null;
    } catch (error) {
        console.error("Alibaba POST API error", error?.response?.data || error.message);
        logGatewayAclHint(error?.response?.data);
    }
    return null;
};

const makeApiCall = async (urlPath, params, secretKey) => {
    try {
        const signedUrl = generateApiSignature(urlPath, params, secretKey);
        const url = new URL(signedUrl, ALIBABA_BASE_APP_URL);
        const headers = { "Content-Type": "application/json" };
        const response = await axios.get(url.toString(), { headers });
        const body = response?.data;
        logGatewayAclHint(body);
        const top = body?.result;
        if (is1688Success(top)) {
            return top.result !== undefined ? top.result : top;
        }
        if (top && !is1688Success(top)) {
            console.warn("1688 API returned unsuccessful:", top.code, top.message);
            logGatewayAclHint(top);
        }
        return null;
    } catch (error) {
        console.error("API Call Error: Unsuccessful response", error?.response?.data || error);
        logGatewayAclHint(error?.response?.data);
    }
};

// Import Product Detail
const getProductDetail = async (productId) => {
    if (!ALIBABA_APP_KEY || !ALIBABA_APP_SECRET || !ALIBABA_AUTH_TOKEN) {
        console.error("Alibaba credentials are missing. Check ALIBABA_APP_KEY / ALIBABA_APP_SECRET / ALIBABA_AUTH_TOKEN");
        return null;
    }

    const urlPath = `param2/1/com.alibaba.fenxiao.crossborder/product.search.queryProductDetail/${ALIBABA_APP_KEY}`;
    const params = { "offerDetailParam": JSON.stringify({ "offerId": productId, "country": "en" }), "access_token": ALIBABA_AUTH_TOKEN };
    const secretKey = ALIBABA_APP_SECRET;

    return await makeApiCall(urlPath, params, secretKey);
};

/**
 * Multilingual image search — com.alibaba.fenxiao.crossborder / product.search.imageQuery
 * @see https://gw.open.1688.com/openapi/param2/1/com.alibaba.fenxiao.crossborder/product.search.imageQuery/
 * @param {{ imageAddress: string, beginPage?: number, pageSize?: number, country?: string }} opts
 * @returns {Promise<{ totalRecords?: number, totalPage?: number, currentPage?: number, pageSize?: number, data?: Array } | null>}
 */
const searchImageQuery = async ({
    imageAddress,
    beginPage = 1,
    pageSize = 32,
    country = "en",
}) => {
    if (!ALIBABA_APP_KEY || !ALIBABA_APP_SECRET || !ALIBABA_AUTH_TOKEN) {
        console.error("Alibaba credentials are missing for image search.");
        return null;
    }
    if (!imageAddress || typeof imageAddress !== "string") {
        return null;
    }

    const urlPath = `param2/1/com.alibaba.fenxiao.crossborder/product.search.imageQuery/${ALIBABA_APP_KEY}`;
    const offerQueryParam = JSON.stringify({
        beginPage: Number(beginPage) || 1,
        pageSize: Number(pageSize) || 32,
        country: String(country || "en").trim() || "en",
        imageAddress: imageAddress.trim(),
    });
    const params = {
        access_token: ALIBABA_AUTH_TOKEN,
        _aop_timestamp: Date.now().toString(),
        offerQueryParam,
    };

    return await makeApiCall(urlPath, params, ALIBABA_APP_SECRET);
};

/**
 * Search 1688 crossborder products by keyword and pagination.
 * Returns raw payload shape from gateway (expects .data array with offerId).
 */
const searchProductsQuery = async ({
    keyword = "",
    beginPage = 1,
    pageSize = 20,
    country = "en",
}) => {
    if (!ALIBABA_APP_KEY || !ALIBABA_APP_SECRET || !ALIBABA_AUTH_TOKEN) {
        console.error("Alibaba credentials are missing for product.search.query.");
        return null;
    }

    const urlPath = `param2/1/com.alibaba.fenxiao.crossborder/product.search.query/${ALIBABA_APP_KEY}`;
    const offerQueryParam = JSON.stringify({
        beginPage: Number(beginPage) || 1,
        pageSize: Number(pageSize) || 20,
        country: String(country || "en").trim() || "en",
        keyWord: String(keyword || "").trim(),
    });

    const params = {
        access_token: ALIBABA_AUTH_TOKEN,
        _aop_timestamp: Date.now().toString(),
        offerQueryParam,
    };

    return await makeApiCall(urlPath, params, ALIBABA_APP_SECRET);
};

/**
 * Open Platform — alibaba.product.get (product by 1688 product ID).
 * POST https://gw.open.1688.com/openapi/param2/1/com.alibaba.product/alibaba.product.get/${APPKEY}
 *
 * @param {string|number} productID — 1688 product / offer id (Long)
 * @param {{ webSite?: string, scene?: string }} [opts] — optional site / scene (e.g. scene "1688")
 * @returns {Promise<object | null>} productInfo (alibaba.product.ProductInfo) or null
 */
const getAlibabaProduct = async (productID, opts = {}) => {
    if (!ALIBABA_APP_KEY || !ALIBABA_APP_SECRET || !ALIBABA_AUTH_TOKEN) {
        console.error("Alibaba credentials are missing for alibaba.product.get.");
        return null;
    }
    const id = productID != null ? Number(productID) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }

    const urlPath = `param2/1/com.alibaba.product/alibaba.product.get/${ALIBABA_APP_KEY}`;
    const params = {
        access_token: ALIBABA_AUTH_TOKEN,
        _aop_timestamp: Date.now().toString(),
        productID: String(id),
    };
    if (opts.webSite != null && opts.webSite !== "") {
        params.webSite = String(opts.webSite);
    }
    if (opts.scene != null && opts.scene !== "") {
        params.scene = String(opts.scene);
    }

    return await makePostApiCall(urlPath, params, ALIBABA_APP_SECRET, extractAlibabaProductGet);
};

module.exports = { getProductDetail, searchImageQuery, getAlibabaProduct, searchProductsQuery };