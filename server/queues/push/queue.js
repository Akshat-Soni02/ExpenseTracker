import { Queue } from "bullmq";
import { RedisConnection } from "../../config/config.js"

/**
 * total attemps include the first try,
 * 2000ms delay + exponential it will
 * retry at 1sec, 3sec
 */
export const pushQueue = new Queue("push", {
    defaultJobOptions: {
        attempts: 1,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
    connection: RedisConnection,
});