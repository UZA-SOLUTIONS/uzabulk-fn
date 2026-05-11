const productIndex = require("./indexes/productIndex");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function () {
    const elasticBaseUrl = String(env?.ELASTIC_SEARCH?.BASE_URL || "").trim();
    if (!elasticBaseUrl) {
        console.log("Elastic search disabled: no ELASTIC_SEARCH.BASE_URL configured.");
        return;
    }

    console.log("Elastic search...");

    await productIndex.init();
    // await productIndex.sync();

}
