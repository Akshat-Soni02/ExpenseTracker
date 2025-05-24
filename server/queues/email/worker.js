import { Worker } from "bullmq";
import { RedisConnection } from "../../config/config.js";
import logger from "../../logger/index.js";

import { sendInviteMail, sendBorrowerMail } from "../../services/userService.js";
import { sendEmail } from "../../services/notificationService.js";

/**
 * @function emailWorker listens to email queue
 * and sends - invite, password reset and 
 * borrower remainder mails
 */
export const emailWorker = new Worker("email", async (job) => {
    const { name, data } = job;

    try {
        switch (name) {
            case "send-invite-email":
                await sendInviteMail(data);
                break;

            case "send-pass-reset-email":
                await sendEmail(data);
                break;

            case "send-borrow-email":
                await sendBorrowerMail(data);
                break;

            default:
                logger.warn(`Unknown job queued in email queue: ${name}`);
        }
    } catch (err) {
        logger.error(`Job ${name} failed:`, err);
        /**
         * throwing error is required for
         * bullMQ to handle retries
         */
        throw err;
    }
}, { connection: RedisConnection, concurrency: 5 });