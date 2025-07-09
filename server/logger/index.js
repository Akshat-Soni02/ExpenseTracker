import devLogger from "./devLogger.js";
import prodLogger from "./prodLogger.js";

let logger = null;

if(process.env.NODE_ENV === "development") {
    logger = devLogger;
}

if(process.env.NODE_ENV === "production") {
    logger = prodLogger;
}

export default logger;