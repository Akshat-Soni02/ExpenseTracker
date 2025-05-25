import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { google } from "googleapis";
import axios from "axios";
import logger from "../logger/index.js";
import ErrorHandler from "../middlewares/error.js";

const FCM_API_URL = process.env.FCM_API_URL;


/**
 * utilizes email and pass to send mail
 * @param {{toMail: email, subject: string, text: string}} param0
 * 
 */
export const sendEmail = async ({toMail, subject, text}) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    const mailOptions = {
        from: 'expensetraker414@gmail.com',
        to: toMail,
        subject,
        text
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`email sent to ${toMail} with response: ${info.response}`);
  } catch (error) {
    throw error;
  }
}


/**
 * 
 * @param {{token: string, title: string, body: string}} param0 
 * @returns response object if sent successfully
 */
export const sendNotificationService = async ({token, title, body}) => {

  /**
   * message body for notification, works 
   * for android and ios both
   */
  const message = {
    notification: {
      title,
      body,
    },
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          contentAvailable: true,
        },
      },
    },
    token,
  };

  try {

    const response = await admin.messaging().send(message);
    const accessToken =  await getAccessToken();

    const notificationBody = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body
        }
      }
    };

    let notificationResponse={};

    /**
     * request to google api with access token
     */
    axios.post(FCM_API_URL, notificationBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      notificationResponse=res.data;
    })
    .catch(err => {
      logger.debug(`push notification not sent`);
      logger.warn(err.response?.data || err.message);
    });

    logger.debug(`notification sent`);
    return {response, accessToken, notificationResponse};
  } catch (error) {
    /**
     * @todo for multiple reasons tokens expire,
     * hence need to remove expired tokens else
     * redis will explode with corrupted tokens in queue
     */
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.errorInfo?.code === "messaging/registration-token-not-registered"
    ) {
      logger.info("Invalid FCM token:", token);
    } else {
      logger.warn(`error sending notification:`, error);
      throw error;
    }
  }
}


/**
 * access token cached in-memory,
 * for an hour
 */
let cachedToken = null;
let tokenExpiry = 0;


/**
 * 
 * @returns access token
 */
export const getAccessToken = async () => {
  const now = Date.now();

  /**
   * reuses cachedToken if it's not expired
   */
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!firebaseKey) throw new ErrorHandler(`env not set, missing firebase service account`);

  const parsedKey = JSON.parse(Buffer.from(firebaseKey, "base64").toString("utf-8"));

  const auth = new google.auth.GoogleAuth({
    credentials: parsedKey,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const tokenResponse = await auth.getAccessToken();

  /**
   * caching token with a minute as buffer
   */
  cachedToken = tokenResponse.token;
  tokenExpiry = now + (tokenResponse.res?.data?.expires_in ?? 3600) * 1000 - 60000;

  return cachedToken;
};