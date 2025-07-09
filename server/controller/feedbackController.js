import logger from "../logger/index.js";
import feedback from "../models/feedbackSchema.js";
import { STATUS_CODES } from "../config/constants.js";

export const registerFeedback = async (req, res, next) => {
    try {
        const newFeedback = await feedback.create({name: req.body.name, email: req.body.email, message: req.body.message});
        
        logger.info('New feedback');
        res.status(STATUS_CODES.CREATED).json({
            message: "Feedback Taken",
            data: newFeedback,
        });
    } catch (error) {
        next(error);
    }
}