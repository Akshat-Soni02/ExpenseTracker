import { RedisConnection } from "../../config/config.js";
import { Worker } from "bullmq";

import { handleBillRecurrence } from "../../services/billService.js";

export const billWorker = new Worker("bill", async (job) => {
    const {name, data} = job;

    try {
        switch (name) {
            case "recur-bill":
                await handleBillRecurrence(data);
                break;
        
            default:
                logger.warn(`Unknown job queued in bill queue: ${name}`);
        }
    } catch (err) {
        logger.error(`Job ${name} failed:`, err);
        throw err;
    }
}, { connection: RedisConnection, concurrency: 5 })