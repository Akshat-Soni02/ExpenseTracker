import { file } from "pdfkit";

export const validate = (schema) => (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
        file : req.file,
      });
      next();
    } catch (error) {
      return res.status(400).json({
        error: error.errors?.[0]?.message || "Validation error",
      });
    }
};