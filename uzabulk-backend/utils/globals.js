
//Here  declaraning global variable;

const path = require("path");
const dotenv = require("dotenv");

const rootEnvPath = path.resolve(__dirname, "../.env");
const devEnvPath = path.resolve(__dirname, "../.env.dev");

// Always load backend .env regardless of process cwd.
dotenv.config({ path: rootEnvPath });
// In non-production, allow .env.dev overrides when present.
if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: devEnvPath, override: true });
}

global.logger = require("../config/logger");

// Set environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '../config/env' : '../config/env-stagging';
global.env = require(envFile)
