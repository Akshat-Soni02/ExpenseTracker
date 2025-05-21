let requestCount = 0;

export const requestCounterMiddleware = (req, res, next) => {
  requestCount++;
  console.log(`Request #${requestCount} - ${req.method} ${req.url}`);
  next();
};
