const productIndex = require("../../../elasticsearch/indexes/productIndex")

const getSearchClauses = (rawSearch = "") => {
    const q = String(rawSearch || "").trim();
    if (!q) return [];

    return [
        {
            // Strong boost for exact phrase so users see what they typed first.
            multi_match: {
                query: q,
                fields: ["name^8"],
                type: "phrase",
                boost: 5,
            },
        },
        {
            // Strict token matching: all terms must be present.
            multi_match: {
                query: q,
                fields: ["name^8"],
                operator: "and",
                minimum_should_match: "100%",
            },
        },
    ];
};

module.exports = {
    filter: ({ limit, skip, sort, search, category }) => {
        const bool = {
            filter: [
                { term: { status: "active" } },
            ],
        };
        if (category) {
            bool.filter.push({
                term: { categories: category },
            });
        }
        const q = String(search || "").trim();
        if (q) {
            bool.must = [{
                bool: {
                    should: getSearchClauses(q),
                    minimum_should_match: 1,
                },
            }];
        }
        return productIndex.search({ bool }, {
            limit,
            skip,
            sort: [sort],
        });
    },


    list: (query) => {
        let esQuery = {
            bool: {
                filter: [
                    { term: { status: "active" } }
                ],
                must: [],
            }
        };

        // Category filter
        if (query?.category) {
            esQuery.bool.filter.push({
                term: {
                    categories: query?.category,
                }
            })
        }

        // Search
        if (query?.search) {
            esQuery.bool.must.push({
                bool: {
                    should: getSearchClauses(query?.search),
                    minimum_should_match: 1,
                }
            });
            if (global._model?.FrequentlySearch?.set) {
                _model.FrequentlySearch.set(query?.search);
            }
        }

        if (query?.fieldName && query?.fieldValue) {
            esQuery.bool.must.push({
                term: { [query?.fieldName]: query?.fieldValue }
            });
        }

        return productIndex.search(esQuery, {
            limit: query?.limit,
            skip: query?.skip,
        })
    }
}