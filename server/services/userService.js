import user from "../models/user.js";
import personalTransaction from "../models/personalTransaction.js";
import expense from "../models/expense.js";

import { OAuth2Client } from "google-auth-library";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import crypto from "crypto";

import { withSession } from "../utils/transaction.js";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import ErrorHandler from "../middlewares/error.js";
import logger from "../logger/index.js";

import { sendEmail } from "./notificationService.js";
import { deleteMedia, uploadMedia } from "../services/cloudinaryService.js";
import { addBorrowMailJob, addInviteMailJob, addPassResetMailJob } from "../queues/email/processor.js";
import { addPushJob } from "../queues/push/processor.js";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, "../assets/panda.jpg");

/**
 * 
 * 
 * access tokens are not the way to verify 
 * a user's authenticity it must be done 
 * by idToken instead. @todo replace in future
 * 
 * the details received from google has structure
 * like "user": {
      "email": "mail@gmail.com",
      "name": "name",
      "picture": "public_picture_link",
      "id": "id_sent_by_google"
    }
 * 
 * @param {object} userData 
 */
export const handleGoogleAccessTokenLogin = async ( userData ) => {

  const { email, name, picture, id: googleId } = userData;

  let existingUser = await user.findOne({ email });

  if (!existingUser) {

    const result = await uploadMedia(picture, "userProfiles", email);
    const auth = {
      auth_id: googleId,
      auth_provider: "google"
    }

    existingUser = await user.create({
      name,
      email,
      oauth: [auth],
      profile_photo: {
        url: result.secure_url,
        public_id: result.public_id,
      },
    });

  }

  logger.info(`${userData.email} logged in through google`);
  return existingUser;
}


/**
 * 
 * NOTE - Do not use this one for now
 * 
 * this is the correct way to authenticate 
 * user but for now google won't allow to extract 
 * idtoken in app
 * 
 * 
 * // {
      "idToken": "kkkk....",
      "user": {
        "email": "mail@gmail.com",
        "name": "name",
        "photo": "photo.",
        "id": "google_id"
      }
    }
 * 
 * @param {string} idToken 
 * @returns user details
 */
export const handleGoogleIdTokenLogin = async ( idToken ) => {

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new ErrorHandler('Invalid Token', STATUS_CODES.FORBIDDEN, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});

  const { email, name, picture, sub: googleId } = payload;

  let existingUser = await user.findOne({ email });

  if (!existingUser) {
    const result = await uploadMedia(picture, "userProfiles", email);

    const auth = {
      auth_id: googleId,
      auth_provider: "google"
    }

    existingUser = await user.create({
      name,
      email,
      oauth: [auth],
      profile_photo: {
        url: result.secure_url,
        public_id: result.public_id,
      },
    });

  }

  logger.info(`${email} logged in through google`);
  return existingUser;
}


/**
 * 
 * @param {object} data 
 * @returns new created user
 */
export const registerUser = async (data) => {

  const { email, password } = data;

  let userAlreadyExist = await user.findOne({ email });
  if (userAlreadyExist) throw new ErrorHandler(`Account already exist with this email`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.GENERIC_ERROR, exposeToClient: true});

  const result = await uploadMedia(filePath, "userProfiles", email);

  const name = extractTempName(email);

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await user.create({
    name,
    email,
    password: hashedPassword,
    profile_photo: {
      url: result.secure_url,
      public_id: result.public_id,
    },
  });

  if(!newUser) throw new ErrorHandler(`register db operation failed`);

  logger.info(`${email} registered`);
  return newUser;
}

/**
 * 
 * @param {{email: email, password: string}} param0 
 * @returns found user
 */
export const loginUser = async ({ email , password }) => {

  const loggedUser = await user.findOne({ email }).select("+password");
  if (!loggedUser) throw new ErrorHandler(`Hey try registering first`, STATUS_CODES.FORBIDDEN, {errorType: ERROR_TYPES.UNAUTHORIZED, exposeToClient: true});

  const isMatch = await bcrypt.compare(password, loggedUser.password);
  if (!isMatch) throw new ErrorHandler(`Invalid password`, STATUS_CODES.FORBIDDEN, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});

  logger.info(`${email} logged in`);
  return loggedUser;
}


/**
 * adds token to accessToken array 
 * if not already there
 * 
 * @param {{user_id: string, token: string}} param0 
 */
export const pushNotificationTokenUpdate = async ({ user_id, token }) => {
  const updatedUser = await user.findByIdAndUpdate( user_id, {$addToSet: { accessTokens: token }}, { new: true });
  if(!updatedUser) throw new ErrorHandler(`user update failed: ${user_id}`);
}


/**
 * 
 * @param {{user_id: string, data: object, file: string}} param0 
 * @returns updated user
 */
export const updateUserDetails = async ({ user_id , data , file}) => {

  let media = null;

  if(file) {

      const today = new Date().toISOString().split('T')[0];
      const mediaPath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const publicId = `user/${uuidv4()}/${today}`;

      const result = await uploadMedia(mediaPath, "userProfiles", publicId);
      media = {
          url: result.secure_url,
          public_id: result.public_id,
      };

      const curUser = await user.findById(user_id).select("profile_photo");
      if(!curUser) throw new ErrorHandler(`cannot find user by id: ${user_id}`);

      if(curUser?.profile_photo?.public_id)  await deleteMedia( curUser.profile_photo.public_id );

      data.profile_photo = media;
  }

  const updatedUser = await user.findByIdAndUpdate(user_id, data, {new: true, runValidators: true});
  if(!updatedUser) throw new ErrorHandler(`update error for user: ${user_id}`);

  logger.info(`user ${user_id} details updated`);
  return updatedUser;
}


/**
 * 
 * @param {{email: email}} param0 
 */
export const sendOtpMail = async ( email ) => {

  const curUser = await user.findOne({ email });
  if (!curUser) throw new ErrorHandler(`user not found: ${email}, cannot send opt`);

  /**
   * 4-digit otp
   */
  const otp = crypto.randomInt(1000, 9999).toString();

  /**
   * otp expiry for time, 
   * valid for next 5 minutes
   */
  const otpExpiry = Date.now() + 5 * 60 * 1000;
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  curUser.otp = hashedOtp;
  curUser.otpExpiry = otpExpiry;

  try {
    await addPassResetMailJob({toMail: email, subject: "ExpenZ password reset", text: `Your OTP is ${otp} for password reset. It is valid for 5 minutes.`, html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <p>Your <strong>OTP</strong> for password reset is:</p>
        <p style="font-size: 24px; font-weight: bold; color: #2B61D4;">${otp}</p>
        <p>This OTP is valid for <strong>5 minutes</strong>.</p>
      </div>
    `,})
  } catch (error) {
    logger.error(error);
    throw new ErrorHandler(`mail job failed to send otp for user ${email}`);
  }

  await curUser.save();
}


/**
 * 
 * @returns boolean
 */
export const verifyReceivedOtp = async ({ email, otp}) => {

  const curUser = await user.findOne({ email });
  if (!curUser) throw new ErrorHandler(`User ${email} not found, cannot verify otp`);

  if (Date.now() > curUser.otpExpiry) throw new ErrorHandler(`Otp expired, please re-send otp`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashedOtp !== curUser.otp) throw new ErrorHandler(`Invalid OTP`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});

  logger.info(`otp verified for user ${email}`);
  return true;
}


/**
 * saves hashed password, also clears otp fields
 * @param {{email: email, password: string}} param0 
 */
export const resetUserPassword = async ({ email, password}) => {

  const curUser = await user.findOne({ email });
  if (!curUser) throw new ErrorHandler(`User ${email} not found, cannot reset password`);

  const hashedPassword = await bcrypt.hash(password, 10);
  curUser.password = hashedPassword;

  curUser.otp = undefined;
  curUser.otpExpiry = undefined;

  await curUser.save();
}


/**
 * @todo bottleneck for speed here,
 * too many loops
 * 
 * @param {string} user_id 
 * @returns array of friends
 */
export const getFriends = async (user_id) => {

  const curUser = await findUserById(user_id);
  if(!curUser) throw new ErrorHandler(`User ${user_id} not found, cannot find friends`);

  const friendsMap = new Map();
  const typeMap = new Map();

  curUser.lended.forEach(({ borrower_id, amount }) => {
    const strId = borrower_id.toString();
    if (!friendsMap.has(strId)) {
      friendsMap.set(strId, 0)
      typeMap.set(strId, "credit");
    };
    friendsMap.set(strId, friendsMap.get(strId) + amount);
  });

  curUser.borrowed.forEach(({ lender_id, amount }) => {
    const strId = lender_id.toString();
    if (!friendsMap.has(strId)){
        friendsMap.set(strId, 0)
        typeMap.set(strId, "debit");
      };
    friendsMap.set(strId, friendsMap.get(strId) - amount);
  });

  curUser.settled.forEach(({ user_id, amount }) => {
    const strId = user_id.toString();
    if (!friendsMap.has(strId)){
        friendsMap.set(strId, amount)
        typeMap.set(strId, undefined);
    };
  });

  const friendIds = [...friendsMap.keys()];

  const friends = await user
    .find({ _id: { $in: friendIds } })
    .select("name profile_photo email");

  const friendsWithAmounts = friends.map((friend) => ({
    _id: friend._id,
    name: friend.name,
    email: friend.email,
    profile_photo: friend.profile_photo?.url || "https://res.cloudinary.com/dgn8yfqs4/image/upload/v1740736643/userProfiles/akshatsonibhl99%40gmail.com.jpg",
    amount: friendsMap.get(friend._id.toString()) || 0,
    type: typeMap.get(friend._id.toString()) || undefined,
  }));

  return friendsWithAmounts;
}


/**
 * stored everything in model itself
 * 
 * @param {string} user_id 
 * @returns lended state and borrowed state
 */
export const getUserExchangeState = async ( user_id ) => {

  const curUser = await user.findById(user_id).select("lended borrowed");

  if(!curUser) throw new ErrorHandler(`User ${user_id} not found, cannot get details`);

  let lendedAmount = 0, borrowedAmount = 0;

  curUser.lended.forEach(({ borrower_id, amount }) => {
    lendedAmount = lendedAmount + amount;
  });

  curUser.borrowed.forEach(({ lender_id, amount }) => {
    borrowedAmount = borrowedAmount + amount;
  });

  return {lendedAmount, borrowedAmount};
}



/**
 * 
 * @param {string} user_id 
 * @returns user
 */
export const findUserById = async (user_id, session) => {

  let query = withSession(user.findById(user_id) , session);
  const curUser = await query;

  if (!curUser) {
    logger.error(`User not found: ${user_id}`);
    return null;
  }

  return curUser;
};


/**
 * utility to check if 
 * date passed is present date
 * 
 * @param {date} date 
 * @returns boolean
 */
export const isToday = (date) => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}



/**
 * 
 * @param {string} id 
 * @returns user's current day spend
 */
export const findTodaySpend = async(id) => {

  const personalTransactions = await personalTransaction.find({transaction_type: 'expense', user_id: id}, 'created_at_date_time amount');
  const expenses = await expense.find({'lenders.user_id': id}, 'created_at_date_time lenders');

  let todaysSpend = 0;

  for (const expense of expenses){
    if(isToday(expense.created_at_date_time)) {
      const lender = expense.lenders[0];
      if(lender){
        todaysSpend += lender.amount;
      }
    }
  }

  for(const transaction of personalTransactions){
    if(isToday(transaction.created_at_date_time)) {
      todaysSpend += transaction.amount;
    }
  }

  return todaysSpend;
}



/**
 * 
 * @param {email} email 
 * @returns Name with uppercase first letter
 */
export const extractTempName = (email) => {
  const name = email.split("@")[0]; 
  return name.charAt(0).toUpperCase() + name.slice(1);
}


/**
 * 
 * @param {{borrowerProfile: object, lender: object, amount: number, group: object}} param0 
 */
export const sendBorrowerMail = async ({borrowerProfile, lender, amount, group}) => {
  if(group) {
    await sendEmail({toMail: borrowerProfile.email, subject: "Dues pending", text: `Hi ${borrowerProfile.name},\n\nThis is a reminder from ${lender.name} regarding an outstanding amount of ₹${amount} in the group "${group.group_title}".\n\nPlease make the settlement soon.\n\nBest,\nExpenZ Team`, html: `<div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
    <p>Hi <strong>${borrowerProfile.name}</strong>,</p>

    <p>
      This is a reminder from <strong>${lender.name}</strong> regarding an outstanding amount of 
      <strong>₹${amount}</strong> in the group "<strong>${group.group_title}</strong>".
    </p>

    <p>Please make the settlement soon.</p>

    <p style="margin-top: 20px;">Best,<br/>ExpenZ Team</p>
  </div>
  `});
  } else {
    await sendEmail({toMail: borrowerProfile.email, subject: "Dues pending", text: `Hi ${borrowerProfile.name},\n\nThis is a reminder from ${lender.name} regarding an outstanding amount of ₹${amount}.\n\nPlease make the settlement soon.\n\nBest,\nExpenZ Team`, html: `<div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
    <p>Hi <strong>${borrowerProfile.name}</strong>,</p>

    <p>
      This is a reminder from <strong>${lender.name}</strong> regarding an outstanding amount of 
      <strong>₹${amount}</strong>".
    </p>

    <p>Please make the settlement soon.</p>

    <p style="margin-top: 20px;">Best,<br/>ExpenZ Team</p>
  </div>
  `});
  }
}


/**
 * sends invite mail
 * @param {{invitee: object, inviter: object}} param0
 */
export const sendInviteMail = async ({inviter, invitee}) => {
  if(!inviter || !invitee) throw new ErrorHandler(`Inviter or invitee is undefined: ${inviter}, ${invitee}`);
  await sendEmail({ toMail: invitee.email, subject: "Invitation to join ExpenZ", text: `Hi,\n\n${inviter.name} has invited you to join ExpenZ!\n\nYou can download the app using the link below:\n\n${process.env.APP_LINK}\n\nOnce you sign up, you will be automatically added as a friend to ${inviter.name}.\n\nBest regards,\nExpenZ Team`, html: `<div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
    <p>Hi,</p>

    <p><strong>${inviter.name}</strong> has invited you to join <strong>ExpenZ</strong>!</p>

    <p>
      You can download the app using the link below:<br/>
      <a href=${process.env.APP_LINK}" style="color: #2B61D4;">
        ${process.env.APP_LINK}
      </a>
    </p>

    <p>
      After signing up, you’ll automatically be added as a friend to <strong>${inviter.name}</strong>.
    </p>

    <p style="margin-top: 20px;">Best regards,<br/>ExpenZ Team</p>
  </div>
  `});
}


/**
 * 
 * @param {string} id user's id
 */
export const findBorrowersAndRemind = async(id) => {

  const curUser = await findUserById(id);
  if(!curUser) throw new ErrorHandler(`User ${id} not found, cannot send mail to borrowers`);

  for (const borrower of curUser.lended) {

    const borrowerProfile = await findUserById(borrower.borrower_id);
    if(!borrowerProfile) {
      logger.warn(`borrower ${borrower.borrower_id} profile not found for ${id}`);
      continue;
    }

    try {
      await addBorrowMailJob({borrowerProfile, lender: curUser, amount: borrower.amount})
    } catch (error) {
      logger.error(error);
    }

  }

  logger.info(`remainded all ${id} borrowers`);
}


/**
 * 
 * we dont throw error if mail not sent
 * 
 * @param {{user_id: string, borrower_id: string}} param0 
 */
export const sendBorrowerRemainder = async ({ user_id, borrower_id}) => {

  const curUser = await findUserById( user_id );
  if(!curUser) throw new ErrorHandler(`User ${user_id} not found, cannot send mail to borrower`);

  const borrowerProfile = await findUserById(borrower_id);
  if(!borrowerProfile) throw new ErrorHandler(`borrower ${borrower_id} not found, cannot send remainder mail`);

  const borrowerDetails = curUser.lended.find((borrower) => borrower.borrower_id.toString() === borrower_id.toString());
  if(!borrowerDetails) throw new ErrorHandler(`Invalid borrower ${borrower_id}, details not found`);

  try {
    await addBorrowMailJob({lender: curUser, borrowerProfile, amount: borrowerDetails.amount})
  } catch (error) {
    logger.error(error);
  }
}


/**
 * 
 * @param {email} email 
 */
export const addFutureFriendsService = async ( email ) => {

  const curUser = await user.findOne({ email });
  if (!curUser) throw new ErrorHandler(`User ${email} not found, cannot add future friend`);
  
  const reqFriends = await user.find({ "futureFriends.email": email });

  for (const friend of reqFriends) {
    try {
      await addUserFriend({ invitee: friend, inviter: curUser });
    } catch (error) {
      logger.error(error);
    }
  }

  await user.updateMany(
    { "futureFriends.email": email },
    { $pull: { futureFriends: { email } } }
  );

  logger.info(`added future friends to ${email}`);
}


/**
 * filters out user's future friend array
 * 
 * @param {{user_id: string, email: email}} param0 
 */
export const removeFutureFriend = async ({ user_id, email }) => {

  const curUser = await findUserById(user_id);
  if(!curUser) throw new ErrorHandler(`User ${user_id} not found, cannot remove future friend`);

  const updatedFriends = curUser.futureFriends.filter((friend) => friend.email !== email);
  curUser.futureFriends = updatedFriends;

  await curUser.save();

  logger.info(`${user_id} removed ${email}'s invite`);
}


/**
 * 
 * @param {{user_id: string, invitees: Array<object>}} param0 
 */
export const addFriendsService = async ({user_id, invitees}) => {

  const curUser = await findUserById(user_id);
  if (!curUser) throw new ErrorHandler(`User ${email} not found, cannot add friends`);

  for (const invitee of invitees) {

    let curMail = invitee.email;
    const curInv = await user.findOne({ email: curMail });

    if (!curInv) {
      curUser.futureFriends = curUser.futureFriends || [];
      curUser.futureFriends.push({ email: curMail });

      try {
        await addInviteMailJob({ inviter: curUser, invitee });
      } catch (error) {
        logger.error(error);
      }

      await curUser.save();
    } else {
      await addUserFriend({ invitee: curInv, inviter: curUser });
    }
  }

}


/**
 * 
 * @todo will surely explain someday
 * 
 * @param {{lender_id: string, borrowers: Array<object>}} param0 
 * @param {session} session 
 */
export const updateFriendlyExchangeStatesOnLending = async ({
  lender_id,
  borrowers,
}, session ) => {
  try{  

    if (!lender_id || borrowers.length === 0) {
      logger.error(`Lender id or borrowers is undefined: ${lender_id}, ${borrowers}`);
      throw new ErrorHandler(`Lender id or borrowers is undefined: ${lender_id}, ${borrowers}`);
    }

    const activeUser = await findUserById(lender_id, session);
    if (!activeUser) throw new ErrorHandler(`User ${lender_id} not found, aborting users state update...`);

    for (const { user_id, amount } of borrowers) {

      let prevBorrower = activeUser.lended.find(
        (b) => b.borrower_id.toString() === user_id.toString()
      );

      if (prevBorrower) {

        prevBorrower.amount += amount;

        const prevBorrowerProfile = await findUserById(prevBorrower.borrower_id.toString(), session); 
        if(!prevBorrowerProfile) throw new ErrorHandler(`Unable to find prev borrower ${prevBorrower.borrower_id} profile`);

        prevBorrowerProfile.borrowed.forEach((lender) => {
          if (lender.lender_id.toString() === lender_id.toString()) {
            lender.amount += amount;
          }
        });

        await prevBorrowerProfile.save();
        await activeUser.save();
        continue;
      }

      let prevLender = activeUser.borrowed.find(
        (l) => l.lender_id.toString() === user_id.toString()
      );

      if (prevLender) {
        const prevLenderId = prevLender.lender_id.toString();

        if (prevLender.amount > amount) {
          prevLender.amount -= amount;

          const prevLenderProfile = await findUserById(prevLenderId, session);
          if(!prevLenderProfile) throw new ErrorHandler(`Unable to find prev lender ${prevLenderId} profile`);

          prevLenderProfile.lended.forEach((borrower) => {
            if (borrower.borrower_id.toString() === lender_id.toString()) {
              borrower.amount -= amount;
            }
          });

          await prevLenderProfile.save();
        } else if (prevLender.amount === amount) {

          activeUser.borrowed = activeUser.borrowed.filter(
            (lender) => lender.lender_id.toString() !== prevLenderId
          );

          activeUser.settled.push({ user_id, amount: 0 });

          const prevLenderProfile = await findUserById(prevLenderId, session);
          if(!prevLenderProfile) throw new ErrorHandler(`Unable to find prev lender ${prevLenderId} profile`);

          prevLenderProfile.lended = prevLenderProfile.lended.filter(
            (borrower) => borrower.borrower_id.toString() !== lender_id.toString()
          );

          prevLenderProfile.settled.push({ user_id: lender_id, amount: 0 });

          await prevLenderProfile.save();
        } else {

          activeUser.borrowed = activeUser.borrowed.filter(
            (lender) => lender.lender_id.toString() !== prevLenderId
          );

          activeUser.lended.push({
            borrower_id: prevLenderId,
            amount: amount - prevLender.amount,
          });

          const prevLenderProfile = await findUserById(prevLenderId, session);
          if(!prevLenderProfile) throw new Error(`Unable to find prev lender ${prevLenderId} profile`);

          prevLenderProfile.lended = prevLenderProfile.lended.filter(
            (borrower) => borrower.borrower_id.toString() !== lender_id.toString()
          );

          prevLenderProfile.borrowed.push({
            lender_id,
            amount: amount - prevLender.amount,
          });

          await prevLenderProfile.save();
        }

        await activeUser.save();
        continue;
      } 

      
      let prevSettle = activeUser.settled.find(
        (s) => s.user_id.toString() === user_id.toString()
      );

      if (prevSettle) {

        const prevSettleId = prevSettle.user_id.toString();

        activeUser.settled = activeUser.settled.filter(
          (settle) => settle.user_id.toString() !== prevSettleId
        );

        activeUser.lended.push({ borrower_id: prevSettleId, amount });

        const prevSettleProfile = await findUserById(prevSettleId, session);
        if(!prevSettleProfile) throw new ErrorHandler(`Unable to find prev settle ${prevSettleId} profile`);

        prevSettleProfile.settled = prevSettleProfile.settled.filter(
          (settle) => settle.user_id.toString() !== lender_id.toString()
        );

        prevSettleProfile.borrowed.push({ lender_id, amount });

        await prevSettleProfile.save();
        await activeUser.save();
        continue;
      }

      activeUser.lended.push({ borrower_id: user_id, amount });

      const newBorrowerProfile = await findUserById(user_id, session);
      if(!newBorrowerProfile) throw new Error(`Unable to find new borrower ${user_id} profile`);

      newBorrowerProfile.borrowed.push({ lender_id, amount });

      await newBorrowerProfile.save();
      await activeUser.save();
      continue;
    }
  }
  catch (error) {
    logger.error(`exchange state update error for lender ${lender_id}`);
    throw error;
  }
};


/**
 * 
 * @param {{inviter: object, invitee: object}} param0 
 * @returns no data
 */
export const addUserFriend = async ({ inviter, invitee }) => {

  if (!inviter || !invitee) throw new ErrorHandler(`Inviter or invitee is undefined: ${inviter}, ${invitee}`);

  inviter.settled = inviter.settled || [];
  invitee.settled = invitee.settled || [];
  inviter.settled.push({ user_id: invitee._id, amount: 0 });
  invitee.settled.push({ user_id: inviter._id, amount: 0 });
  await inviter.save();
  await invitee.save();

  const body = `You have been added as friend from ${inviter.name}. You can split money together now!`;
  const title = `👤 New Friend`

  const tokens = invitee.accessTokens;
  
  if(tokens.length === 0) return;

  for(const token of tokens) {
    try {
      await addPushJob({ token, title, body });
    } catch (error) {
      logger.warn(error);
    }
  }

};

//handleDailyLimitReach
