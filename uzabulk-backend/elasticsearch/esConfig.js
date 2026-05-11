const { Client } = require('@elastic/elasticsearch');

const normalizeElasticNodeUrl = (rawUrl) => {
    const input = String(rawUrl || "").trim();
    if (!input) return "";
    try {
        const parsed = new URL(input);
        // Elasticsearch client expects an origin-like URL. Strip path/query/hash if present.
        return parsed.origin;
    } catch (error) {
        return "";
    }
};
11
const baseUrl = normalizeElasticNodeUrl(env?.ELASTIC_SEARCH?.BASE_URL);
const isElasticConfigured = Boolean(baseUrl);

const noElasticClient = {
    ping: async () => false,
    index: async () => { throw new Error('Elasticsearch is not configured. Set ELASTIC_SEARCH.BASE_URL'); },
    search: async () => { throw new Error('Elasticsearch is not configured. Set ELASTIC_SEARCH.BASE_URL'); },
    bulk: async () => { throw new Error('Elasticsearch is not configured. Set ELASTIC_SEARCH.BASE_URL'); },
    delete: async () => { throw new Error('Elasticsearch is not configured. Set ELASTIC_SEARCH.BASE_URL'); },
    indices: {
        exists: async () => false,
        create: async () => { throw new Error('Elasticsearch is not configured. Set ELASTIC_SEARCH.BASE_URL'); },
        putMapping: async () => { throw new Error('Elasticsearch is not configured. Set ELASTIC_SEARCH.BASE_URL'); },
    }
};

// Elasticsearch client setup
const esClient = isElasticConfigured ? new Client({
    node: baseUrl,
    ...(env.ELASTIC_SEARCH.IS_SECURITY_ENABLED ? {
        auth: {
            username: env.ELASTIC_SEARCH.USERNAME,
            password: env.ELASTIC_SEARCH.PASSWORD
        }
    } : {}),
    requestTimeout: 60000,
    maxRetries: 5,
}) : noElasticClient;

if (env?.ELASTIC_SEARCH?.BASE_URL && !isElasticConfigured) {
    console.warn('Invalid ELASTIC_SEARCH.BASE_URL. Elasticsearch disabled for this run.');
}

const checkHealth = async () => {
    try {
        await esClient.ping();
        console.log('Elasticsearch is up');

        setTimeout(() => {
            checkHealth();
        }, 60000);
    } catch (error) {
        console.error('Elasticsearch is down:', error.message);
        process.exit(1);
    }
}


module.exports = esClient;