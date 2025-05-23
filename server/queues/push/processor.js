import { pushQueue } from "./queue.js";

/**
 * 
 * @param {{token: string, title: string, body: string}} data
 * @function addPushJob Enqueue new push notifications for
 * multiple functionalities as listed below
 * for bill
 * New bill notification to every other member,
 * @todo Bill update notification - not sending for now,
 * @todo Bill delete notification,
 * Mark as paid notification to others in bill,
 * Missed bill date notification,
 * Bill paid notification when finally bill is paid,
 * Bill due date approach notification,
 * 
 * for split
 * New split notifications,
 * Split update notification,
 * Split delete notification,
 * 
 * Settle up with people notification (in group and outside group),
 * 
 * New group notification to all other memebers,
 * Budget reach notification in group,
 * adding people in group notification,
 * Leaving group notification
 * 
 */
export const addPushJob = async (data) => {
    await pushQueue.add("send-push-notification", data);
};