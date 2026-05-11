const category = require('../services');
const CategoryModel = require('../../../models/categoryTable');
module.exports = {
    list: async (req, res) => {
        try {

            let categories = await category.getUZACategories({ status: "active" });

            return res.success(categories);

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    // list: async (req, res) => {
    //     try {

    //         let categories = await category.getCategoryList({ status: "active", parent: "none" });

    //         await module.exports.processCategories(categories);

    //         return res.success(categories);

    //     } catch (error) {
    //         console.error(error)
    //         res.error(error)
    //     }
    // },

    listByLevel: async (req, res) => {
        try {

            let query = { status: "active", level: 1 };

            if (req.query?.level) {
                query.level = parseInt(req.query.level);
            }

            const categories = await CategoryModel.find(query, "parent catName")
                .sort({ sortOrder: 1 })
                .lean();

            return res.success(categories);

        } catch (error) {
            console.error(error)
            res.error(error)
        }
    },
    topCategories: async (req, res) => {
        try {

            let categories = await category.list({ status: "active", isFeatured: true });

            return res.success(categories);

        } catch (error) {
            res.error(error)
        }
    },
    processCategories: async (categories) => {
        for (const category of categories) {
            if (category.subcategories?.length) {
                category.subcategories = await module.exports.processSubCategories(category.subcategories);
            }
        }
        return categories;
    },
    processSubCategories: async (subcategories) => {
        for (const subcategory of subcategories) {
            if (subcategory.subcategories?.length) {
                subcategory.subcategories = await module.exports.processMidCategories(subcategory.subcategories);
            }
        };
        subcategories.sort((a, b) => a.sortOrder - b.sortOrder);
        return subcategories;
    },
    processMidCategories: async (midcategories) => {
        let newCate = [];
        for (const midcategory of midcategories) {
            const getCategory = await category.getSubCategory(midcategory._id);
            newCate.push(getCategory);
        };
        newCate.sort((a, b) => a.sortOrder - b.sortOrder);
        return newCate;
    },
    sourceByApplicatonCat: async (req, res) => {
        try {

            let categories = await category.sourceByApplicaton();

            return res.success(categories);

        } catch (error) {
            res.error(error)
        }
    },

};
