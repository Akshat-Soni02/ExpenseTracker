
/**
 * Do not remove these imports
 */
import { emailWorker } from "./email/worker.js";
import { pushWorker } from "./push/worker.js";
import logger from "../logger/index.js";

export const initQueueWorkers = () => {
    /**
     * Workers are automatically initialized
     * when imported
     */
    logger.info("All queue workers initialized");
};
