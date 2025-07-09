import { Worker } from "bullmq";
import { RedisConnection } from "../../config/config.js";
import logger from "../../logger/index.js";

import { sendNotificationService } from "../../services/notificationService.js";

export const pushWorker = new Worker("push", async (job) => {
    const {name, data} = job;

    try {
        switch (name) {
            case "send-push-notification":
                await sendNotificationService(data);
                break;
        
            default:
                logger.warn(`Unknown job queued in push queue: ${name}`);
        }
    } catch (err) {
        logger.error(`Job ${name} failed:`, err);
        throw err;
    }
}, { connection: RedisConnection, concurrency: 5 })