import { billQueue } from "./queue.js";

/**
 * 
 * @param string data bill's id only
 * @function addBillRecurJob enqueues the job 
 * with bill id as data to handle bill recurrance
 */
export const addBillRecurJob = async (data) => {
    await billQueue.add("recur-bill", data);
};