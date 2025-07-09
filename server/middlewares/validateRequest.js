import logger from "../logger/index.js";

export const validate = (schema) => (req, res, next) => {
    try {
      logger.verbose("Validating request");
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
        file : req.file,
      });
      logger.verbose("Request validated successfully");
      next();
    } catch (error) {
      next(error);
    }
};