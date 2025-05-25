import {STATUS_CODES, MESSAGES, ERROR_TYPES} from "../config/constants.js"
import logger from "../logger/index.js"
import { ZodError } from "zod";

/**
 * Custom error class for handling application-specific errors.
 * Includes metadata for whether to expose the error details to the client.
 *
 * @class ErrorHandler
 * @extends {Error}
 */
class ErrorHandler extends Error {
    /**
     * Creates an instance of ErrorHandler.
     * @param {string} message - The error message.
     * @param {number} statusCode - HTTP status code to return.
     * @param {Object} [options={}] - Additional error options.
     * @param {boolean} [options.exposeToClient=true] - Whether this error should be visible to the client.
     * @param {string} [options.errorType='GenericError'] - A machine-readable type of error.
     * @param {Object} [options.details] - Any additional structured error details (e.g., field-level errors).
     * 
     * by default error is not shown to client
     */
    constructor(message, statusCode, options = {}) {
        super(message);
        this.statusCode = statusCode;
        this.exposeToClient = options.exposeToClient ?? false;
        this.errorType = options.errorType || ERROR_TYPES.GENERIC_ERROR;
        this.details = options.details || null;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 
 * @method errorMiddleware logs all original error [zod + normal], 
 * @returns response of error to client
 */
export const errorMiddleware = (err,req,res,next) => {
    if (err instanceof ZodError) {
        logger.warn("Zod validation", {
            issues: err.issues,
            path: req.originalUrl,
            method: req.method,
        });
    
        const hasNCERR = err.issues.some(issue =>
            issue.message.startsWith("NCERR:")
        );
    
        return res.status(STATUS_CODES.BAD_REQUEST).json({
            message: hasNCERR
                ? "Invalid request data"
                : err.issues[0]?.message || "Validation error",
        });
    }

    const statusCode = err.statusCode || STATUS_CODES.SERVER_ERROR;
    const showClient = err.exposeToClient ?? false;

    if (err.code === 11000) {
        logger.warn("Duplicate resource creation");
        return res.status(STATUS_CODES.BAD_REQUEST).json({message: "Resource with this name already exists.", errorType: ERROR_TYPES.DUPLICATE_RESOURCE});
    }

    const response = {
        message: showClient ? err.message : MESSAGES.ERROR,
        errorType: showClient ? err.errorType : ERROR_TYPES.SERVER_ERROR,
    };

    if (showClient && err.details) {
        response.details = err.details;
    }

    logger.error(`[${err.errorType || 'Unhandled'}] ${err.message}`, {
        stack: err.stack,
        details: err.details,
        path: req.originalUrl,
        method: req.method,
    });

    return res.status(statusCode).json(response);
};

export default ErrorHandler;