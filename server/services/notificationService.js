import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { google } from "googleapis";
import axios from "axios";


export const sendEmail = ({toMail, subject, text}) => {

  try {
    console.log("Sending Email Notification");

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
    
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
        console.log('Error:', error);
        } else {
        console.log('Email sent:', info.response);
        console.log("email sent to: ", toMail);
        }
    });

    console.log("email sent");
  } catch (error) {
    console.log(`Error sending email notification`, error);
  }
}


const FCM_API_URL = process.env.FCM_API_URL;

export const sendNotificationService = async ({token, title, body}) => {

  if(!token) {
    console.log(`Bad notification request, No token provided`);
    return;
  }

  if(!title || !body) {
    console.log(`Bad notification request, No title/body provided`);
    return;
  }

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
    console.log("Sending push notification");

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