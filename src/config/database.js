const mongoose = require("mongoose");
const config = require("./config");

const connectDB = async () => {
    try {
        console.log("Attempting to connect to DB...");
        await mongoose.connect(config.mongoose.url, {
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 1000,
        });
        console.log("Connected to DB at", config.mongoose.url);
    } catch (e) {
        console.error("Failed to connect to DB:", e.message);
        process.exit(1);
    }
}

module.exports = connectDB;
