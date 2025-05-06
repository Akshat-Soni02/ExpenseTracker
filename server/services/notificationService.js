import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from 'url';
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



export const sendEmail = ({toMail, subject, text}) => {
    console.log("sending email");
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          user: 'expensetracker414@gmail.com',
          pass: 'buygfdapgkgjofol',
        },
      });
    
    
    const mailOptions = {
        from: 'expensetraker414@gmail.com',
        to: toMail,
        subject,
        text
    };
    
    // Send the email
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
        console.log('Error:', error);
        } else {
        console.log('Email sent:', info.response);
        console.log("email sent to: ", toMail);
        }
    });
    console.log("email sent");
}

const FCM_API_URL = 'https://fcm.googleapis.com/v1/projects/expensetracker-451815/messages:send';


export const sendNotificationService = async ({token, title, body}) => {
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
    console.log("Sending notification");
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
      console.error('Error sending notification:', err.response?.data || err.message);
    });
    console.log("Notification sent successfully:");
    return {response, accessToken, notificationResponse};
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }

}

export const getAccessToken = async () => {
  console.log("Getting access token");
  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!firebaseKey) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var');
  }

  let parsedKey;
  try {
    parsedKey = JSON.parse(Buffer.from(firebaseKey, 'base64').toString('utf-8'));
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }

  const auth = new google.auth.GoogleAuth({
    // keyFile: parsedKey, // path to the service account key
    credentials: parsedKey,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  try {
    const accessToken = await auth.getAccessToken();
    return accessToken;
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error;
  }
}