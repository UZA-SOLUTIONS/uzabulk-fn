'use strict';
const mongoose = require("mongoose");
const logger = require('../logger');
const { setup } = require("../../models");

//****Database connection mongodb using mongoose */
try {
    const mongoAtlasUri = env.mongoAtlasUri;

    if (!mongoAtlasUri) {
        logger.warn({
            where: 'db connection',
            message: 'Mongo URI is missing. Skipping DB connection.',
        });
        console.warn('Mongo URI is missing. Skipping DB connection.');
        return;
    }

    mongoose.connect(mongoAtlasUri);

    mongoose.Promise = global.Promise;

    const db = mongoose.connection;

    db.on('error', (err) => {
        logger.error({
            where: 'db connection',
            message: `DB connection error: ${err.message}`,
        });
        console.error('DB connection error:', err.message);
    });

    db.once("open", () => {
        logger.info({
            where: 'db connection',
            message: `Connected to MongoDB`,
        });
        console.log("DB connected successfully");
        setup();
    });

} catch (error) {
    logger.error({
        where: 'db connection',
        message: `Error connecting to MongoDB: ${error.message}`,
        error
    });
    console.error('Error connecting to MongoDB:', error.message);
}


