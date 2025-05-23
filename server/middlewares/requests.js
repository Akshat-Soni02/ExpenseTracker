import logger from "../logger/index.js";

let requestCount = 0;

export const requestCounterMiddleware = (req, res, next) => {
  requestCount++;
  logger.debug(`Request #${requestCount} - ${req.method} ${req.url}`);
  next();
};
