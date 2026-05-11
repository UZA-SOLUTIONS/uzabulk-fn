const esClient = require("../esConfig");
const esHelper = require("../esHelper");
const _ = require('lodash');

const INDEX_NAME = 'products';

const indexMapping = {
    mappings: {
        properties: {
            name: { type: 'text' },
            status: { type: 'keyword' },
            isFeatured: { type: 'boolean' },
            bestSeller: { type: 'boolean' },
            price: { type: 'float' },
            average_rating: { type: 'float' },
            date_created_utc: { type: 'date' },
            categories: { type: 'keyword' },
            price_tiers: {
                type: "nested",
                properties: {
                    startQuantity: { type: "integer", index: false },
                    price: { type: "double", index: false }
                }
            },
            featured_image: { type: "keyword", index: false }
        }
    }
};
module.exports = {
    init: async () => {
        if (await esHelper.indexExists(INDEX_NAME)) {
            console.log(`Index '${INDEX_NAME}' already exists. Checking for updates...`);
            // await esHelper.updateMapping(INDEX_NAME, indexMapping);
        } else {
            console.log(`Index '${INDEX_NAME}' does not exist. Creating index...`);
            await esHelper.createIndex(INDEX_NAME, indexMapping);
        }
    },

    sync: async () => {
        const changeStream = _model.Product.watch();

        changeStream.on('change', async (change) => {
            const { operationType, documentKey, fullDocument } = change;

            if (operationType === 'insert' || operationType === 'update' || operationType === 'replace') {
                // Index or update the document in Elasticsearch
                await module.exports.set({ ...fullDocument, _id: documentKey._id });
                console.log(`Document with ID ${documentKey._id} indexed/updated.`);
            } else if (operationType === 'delete') {
                // Remove document from Elasticsearch
                await esClient.delete({
                    index: 'products',
                    id: documentKey._id.toString()
                });
                console.log(`Document with ID ${documentKey._id} deleted.`);
            }
        });
    },

    set: async (document) => {
        await esClient.index({
            index: 'products',
            id: document._id.toString(),
            body: {
                name: document?.name,
                status: document?.status,
                isFeatured: document?.isFeatured,
                bestSeller: document?.bestSeller,
                price: document?.price,
                average_rating: document?.average_rating,
                date_created_utc: document?.date_created_utc,
                categories: document?.categories,
                price_tiers: document?.price_tiers,
                featured_image: document?.featured_image,
            }
        });
    },

    search: async (query = null, options = { limit: 10, skip: 0 }) => {
        try {
            const from = Number.parseInt(options?.skip, 10);
            const size = Number.parseInt(options?.limit, 10);
            const data = await esClient.search({
                index: 'products',
                sort: options?.sort,
                from: Number.isFinite(from) && from >= 0 ? from : 0,
                size: Number.isFinite(size) && size > 0 ? size : 10,
                track_total_hits: true,
                body: query ? { query } : undefined,
            });

            const totalRaw = data?.hits?.total;
            const total =
                typeof totalRaw === "object" && totalRaw !== null && "value" in totalRaw
                    ? Number(totalRaw.value) || 0
                    : Number(totalRaw) || 0;
            const items = _.map(data?.hits?.hits, (hit) => ({ ...hit._source, _id: hit._id }));
            return { items, total };
        } catch (error) {
            if (!String(env?.ELASTIC_SEARCH?.BASE_URL || "").trim()) {
                throw new Error('Search failed');
            }
            console.error('Elasticsearch search error:', error); // Log the error for debugging
            throw new Error('Search failed'); // Rethrow a user-friendly error
        }
    },

    bulkInsert: async (data) => {
        try {
            const bulkOps = [];
            data.forEach(doc => {
                bulkOps.push(
                    { update: { _index: INDEX_NAME, _id: doc._id } },
                    {
                        doc: {
                            name: doc?.name,
                            status: doc?.status,
                            isFeatured: doc?.isFeatured,
                            bestSeller: doc?.bestSeller,
                            price: doc?.price,
                            average_rating: doc?.average_rating,
                            date_created_utc: doc?.date_created_utc,
                            categories: doc?.categories,
                            price_tiers: doc?.price_tiers,
                            featured_image: doc?.featured_image,
                        },
                        doc_as_upsert: true
                    }
                );
            });

            const response = await esClient.bulk({ refresh: true, body: bulkOps });

            console.log("Bulk insert end...");
        } catch (error) {
            console.error('Bulk upsert error:', error);
        }
    }
}