export const validate = (schema) => (req, res, next) => {
    try {
      console.log("Validating request");
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
        file : req.file,
      });
      console.log("Request validated successfully");
      next();
    } catch (error) {
      return res.status(400).json({
        error: error.errors?.[0]?.message || "Validation error",
      });
    }
};