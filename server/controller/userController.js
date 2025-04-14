import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { sendToken } from "../utils/features.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { deleteMedia, uploadMedia } from "../services/cloudinaryService.js";
import { OAuth2Client } from "google-auth-library";

import path from "path";
import { fileURLToPath } from "url";
import { addUserFriend, extractTempName, findBorrowersAndRemind, findUserById, sendBorrowerMail, sendInviteMail } from "../services/userService.js";
import { findUserWallets } from "../services/walletService.js";
import { sendEmail } from "../services/notificationService.js";
import { findUserGroups } from "../services/groupService.js";
import { findUserExpenses } from "../services/expenseService.js";
import { findUserBudgets } from "../services/budgetService.js";
import { findUserPersonalTransactions } from "../services/personalTransactionService.js";
import { findUserSettlements } from "../services/settlementService.js";
import { findUserDetectedTransactions } from "../services/detectedTransactionService.js";
import { getUserBills } from "../services/billService.js";
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, "../assets/panda.jpg");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res, next) => {
  try {

    // {
    //   "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjI1Z...",
    //   "user": {
    //     "email": "the.akshhh@gmail.com",
    //     "name": "Akshat Soni",
    //     "photo": "https://lh3.googleusercontent.com/a/...",
    //     "id": "104475546723009620506"
    //   }
    // }
    console.log("Google login");
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: "ID Token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: "Invalid ID Token" });
    }

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

    sendToken(existingUser, res, "Welcome to ExpenseTracker", 201);
  } catch (error) {
    console.error("Google Login Error:", error);
    next(error);
  }
};


export const register = async (req, res, next) => {
  try {
    console.log("Registering");
    const { email, password } = req.body;
    let userAlreadyExist = await user.findOne({ email });
    if (userAlreadyExist)
      return next(new ErrorHandler("User Already Exist", 404));

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
    if(!newUser) return next(new ErrorHandler("Error creating new user", 400));

    sendToken(newUser, res, "Welcome to ExpenseEase", 201);
  } catch (error) {
    console.log("Error creating new user", error);
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    console.log("Login");
    const { email, password } = req.body;
    const loggedUser = await user.findOne({ email }).select("+password");
    
    if (!loggedUser) return next(new ErrorHandler("Hey try registering first", 404));
    const isMatch = await bcrypt.compare(password, loggedUser.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Password, Try again", 404));
    console.log("Logged in");
    sendToken(
      loggedUser,
      res,
      `Hey ${loggedUser.name} glad to have you back`,
      200
    );
  } catch (error) {
    console.log("Error logging user", error);
    next(error);
  }
};

export const updateUserNotificationToken = async (req, res, next) => {
  try {
    console.log("Updating user notification token");
    const id = req.user.id;
    console.log("USER ID,",id);
    const {token} = req.body;
    console.log("Token,",token);
    const updatedUser = await user.findByIdAndUpdate(
      id,
      {
        $addToSet: { accessTokens: token }, 
      },
      {
        new: true, 
      }
    );
    if(!updateUser) return next(new ErrorHandler("Error updating user", 400));
    console.log("Updated user notification token");
    res.status(200).json({ message: "Details updated successfully", data: updatedUser });
  } catch (error) {
    console.log("Error updating user", error);
    next(error);
  }
};


export const updateProfilePhoto = async (req, res, next) => {
  try {
    console.log("Updating profile photo");
    const id = req.user._id;
    const curUser = await findUserById(id);
    if (!curUser) {
      return next(new ErrorHandler("User does not Exist", 404));
    }
    // update this after frontend 
    // const {filePath} = req.body;
    const result = await uploadMedia(filePath, "userProfiles", curUser.email);
    if(!result) return next("Error updating profile photo");
    if (result && result.secure_url) {
      curUser.profile_photo = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }
    await curUser.save();
    console.log("Profile photo updated");
    res.status(200).json({
      message: "Profile udpated successfully"
    });
  } catch (error) {
    console.log("Error updating profile photo", error);
    next(error);
  }
}


export const updateUser = async (req, res, next) => {
  try {
    console.log("Updating user");
    const id = req.user.id;
    const updatedDetails = req.body;
    const file = req.file;
    // These details can be updated here
    // name, phone number, daily limit
    let media = null;
    let prevPublicId = null;
    if(file) {
        const today = new Date().toISOString().split('T')[0];
        const mediaPath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const publicId = `user/${uuidv4()}/${today}`;
        const result = await uploadMedia(mediaPath, "userProfiles", publicId);
        if(!result) return next(new ErrorHandler("Error uplaoding photo"));
        media = {
            url: result.secure_url,
            public_id: result.public_id,
        };
        const curUser = await user.findById(id).select("profile_photo");
        if(typeof curUser === undefined) return next(new ErrorHandler("Error getting userDetails to update profile photo"));
        if(curUser?.profile_photo?.public_id)  await deleteMedia(curUser.profile_photo.public_id);
        updatedDetails.profile_photo = media;
    }
    const updatedUser = await user.findByIdAndUpdate(id, updatedDetails, {new: true, runValidators: true});
    if(!updateUser) return next(new ErrorHandler("Error updating user", 400));
    console.log("Updated user");
    res.status(200).json({ message: "Details updated successfully", data: updatedUser });
  } catch (error) {
    console.log("Error updating user", error);
    next(error);
  }
};

export const sendOtp = async (req, res, next) => {
  try {
      console.log("Sending OTP");
      const { email } = req.body;
      if (!email) return next( new ErrorHandler("Email is required", 400));

      const curUser = await user.findOne({ email });
      if (!curUser) return next( new ErrorHandler("User not found" , 404));

      // 4-digit OTP
      const otp = crypto.randomInt(1000, 9999).toString();
      const otpExpiry = Date.now() + 5 * 60 * 1000; // OTP valid for 2 minutes
      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

      curUser.otp = hashedOtp;
      curUser.otpExpiry = otpExpiry;
      await curUser.save();

      sendEmail({toMail: curUser.email, subject: "ExpenseEase password reset", text: `Your OTP for resetting your password is ${otp}. It is valid for 5 minutes.`})
      console.log("Sent OTP");
      res.status(200).json({message: "OTP sent successfully" });
  } catch (error) {
      console.error("Send OTP Error:", error);
      next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    console.log("Verifying OTP");
      const { email, otp } = req.body;

      if (!email || !otp) {
          return next(new ErrorHandler("Email and OTP are required", 400));
      }

      const curUser = await user.findOne({ email });
      if (!curUser) return next(new ErrorHandler("User not found", 404));

      // Check OTP expiration
      if (Date.now() > curUser.otpExpiry) {
          return next(new ErrorHandler("OTP expired", 400));
      }

      // Verify OTP
      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
      if (hashedOtp !== curUser.otp) {
          return next(new ErrorHandler("Invalid OTP", 400));
      }
      console.log("Verfied OTP");
      res.status(200).json({ message: "OTP verified" });
  } catch (error) {
      console.error("Verify OTP Error:", error);
      next(error);
  }
};


export const resetPassword = async (req, res, next) => {
    try {
      console.log("Resetting Password");
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return next(new ErrorHandler("Email and new password are required", 400));
        }

        const curUser = await user.findOne({ email });
        if (!curUser) return next(new ErrorHandler("User not found", 404));

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        curUser.password = hashedPassword;

        // Clear OTP fields after password reset
        curUser.otp = undefined;
        curUser.otpExpiry = undefined;
        await curUser.save();
        console.log("Reset Password successful");
        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        next(error);
    }
};

export const logout = async (req, res) => {
  console.log("Logged out");
  res.status(200).json({
    message: "Successfully logged out"
  });
};


export const getMyProfile = (req, res) => {
  console.log("Get my profile");
  res.status(200).json({
    data: req.user
  });
};

export const getMyGroups = async (req, res, next) => {
  try {
    console.log("Getting my groups");
    const id = req.user._id;
    const groups = await findUserGroups(id);
    console.log("User groups fetched");
    res.status(200).json({
      message: "successfully retreived user groups",
      data: groups
    });
  } catch (error) {
    console.log("Error fetching user groups");
    next(error);
  }
}

export const getMyExpenses = async(req, res, next) => {
  try {
    console.log("Getting my expenses");
    const id = req.user.id;
    const expenses = await findUserExpenses({userId: id});
    console.log("User expenses fetched");
    res.status(200).json({
      message: "successfully retreived user expenses",
      data: expenses
    });
  } catch (error) {
    console.log("Error fetching user expenses", error);
    next(error);
  }
}

export const getMySettlements = async (req, res, next) => {
  try {
    console.log("Get my settlements");
    const userId = req.user.id;
    const { group_id } = req.query; // Optional Group ID

    const settlements = await findUserSettlements({userId, group_id});
    console.log("User settlements fetched");
    res.status(200).json({
      message : "settlements fetched successfully",
      data : settlements,
    });
  } catch (error) {
    console.error("Error fetching user settlements", error);
    next(error);
  }
}

export const getMyWallets = async (req, res, next) => {
  try {
    console.log("Get my wallet");
    const id = req.user._id;
    const wallets = await findUserWallets(id);
    console.log("User wallets fetched");
    res.status(200).json({
      data: wallets
    });
  } catch (error) {
    console.log("Error fetching my wallets", error);
    next(error);
  }
};

export const getMyBudgets = async (req, res, next) => {
  try {
    console.log("Get my budgets");
    const id = req.user._id;
    const budgets = await findUserBudgets(id);
    console.log("User budget fetched");
    res.status(200).json({
      data: budgets
    });
  } catch (error) {
    console.log("Error fetching my budgets", error);
    next(error);
  }
};

export const getMyPersonalTransactions = async (req, res, next) => {
  try {
    console.log("Get my personal transactions");
    const id = req.user._id;
    const transactions = await findUserPersonalTransactions(id);
    console.log("Personal transactions fetched");
    res.status(200).json({
      data: transactions
    });
  } catch (error) {
    console.log("Error fetching my personalTransactions", error);
    next(error);
  }
};

export const getMyBills = async(req, res, next) => {
  try {
    console.log("Get my bills");
    const id = req.user._id;
    const {status} = req.query;
    const bills = await getUserBills({userId: id, status});
    console.log("User bills fetched");
    res.status(200).json({
      message: "Successfully feteched user bills",
      data: bills
    });
  } catch (error) {
    console.log("Error fetching bills");
    next(error);
  }
}

export const getMyDetectedTransactions = async (req, res, next) => {
  try {
    console.log("Get my detected transactions");
    const id = req.user._id;
    const transactions = await findUserDetectedTransactions(id);
    console.log("Detected transactions fetched");
    res.status(200).json({
      data: transactions
    });
  } catch (error) {
    console.log("Error fetching my detectedTransactions", error);
    next(error);
  }
};


export const getFriendlyUsers = async (req, res, next) => {
  try {
    console.log("Get friendly users");
    const id = req.user.id;
    const curUser = await user.findById(id).select("lended borrowed settled");
    if(!curUser) return next(new ErrorHandler("Error fetching user", 400));
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

    // Attach amounts to friend data
    const friendsWithAmounts = friends.map((friend) => ({
      _id: friend._id,
      name: friend.name,
      email: friend.email,
      profile_photo: friend.profile_photo?.url || "https://res.cloudinary.com/dgn8yfqs4/image/upload/v1740736643/userProfiles/akshatsonibhl99%40gmail.com.jpg",
      amount: friendsMap.get(friend._id.toString()) || 0,
      type: typeMap.get(friend._id.toString()) || undefined,

    }));
    console.log("Friendly users fetched");
    res.status(200).json({
      message: "friends retrevied successfully",
      data: friendsWithAmounts,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getCurrentExhanges = async (req, res, next) => {
  try {
    console.log("Getting current exchanges");
    const id = req.user.id;
    const curUser = await user.findById(id).select("lended borrowed");
    if(!curUser) return next(new ErrorHandler("Error fetching user", 400));
    let lendedAmount = 0,
      borrowedAmount = 0;
    curUser.lended.forEach(({ borrower_id, amount }) => {
      lendedAmount = lendedAmount + amount;
    });
    curUser.borrowed.forEach(({ lender_id, amount }) => {
      borrowedAmount = borrowedAmount + amount;
    });
    console.log("Current exchanges fetched");
    res.status(200).json({
      data: {
        lendedAmount,
        borrowedAmount,
      }
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const remindBorrowers = async (req, res, next) => {
  try {
    console.log("Reminding borrowers");
    const id = req.user._id;
    await findBorrowersAndRemind(id);
    console.log("Reminded borrowers");
    res.status(200).json({
      message: "Reminders sent successfully"
    });
  } catch (error) {
    console.log("Error reminding borrowers");
    next(error);
  }
}

export const remindBorrower = async (req, res, next) => {
  try {
    console.log("Reminding Borrrower");
    const id = req.user._id;
    const {borrower_id} = req.params;
    const curUser = await user.findById(id);
    if(!curUser) return next(new ErrorHandler("Error fetching user details to remind borrower", 400));
    const borrowerProfile = await user.findById(borrower_id);
    const borrowerDetails = curUser.lended.find((borrower) => borrower.borrower_id.toString() === borrower_id.toString());
    if(!borrowerProfile) return next(new ErrorHandler("Error reminding borrower", 400));
    sendBorrowerMail({lender: curUser, borrowerProfile,amount: borrowerDetails.amount});
    console.log("Reminding borrower");
    res.status(200).json({
      message: "successfully reminded"
    });
  } catch (error) {
    console.log("Error reminding borrower");
    next(error);
  }
}

export const autoAddFutureFriends = async (req, res, next) => {
  try {
    console.log("Adding auto future friends");
    const {email} = req.body;
    const curUser = await user.findOne({email});
    if (!curUser) {
      return next(new ErrorHandler("User not found", 404));
    }
    const userEmail = curUser.email;
    const reqFriends = await user.find({ "futureFriends.email": userEmail });
    for (const friend of reqFriends) {
      await addUserFriend({ invitee: friend, inviter: curUser });
    }
    await user.updateMany(
      { "futureFriends.email": userEmail },
      { $pull: { futureFriends: { email: userEmail } } }
    );
    console.log("Added auto future friends");
    return res.status(200).json({
      message: "Successfully auto-added friends",
    });
  } catch (error) {
    console.log("Error auto-adding friends", error);
    next(error);
  }
};


export const getUserById = async (req, res, next) => {
  console.log("Get user by id");
  const { id } = req.params;
  const user = await findUserById(id);
  console.log("Fetched user by id");
  if(user) return res.status(200).json({
    message: "successfully fetched user",
    data: user
  });
  else return res.status(500).json({
    message: "Error fetching user"
  })
}

export const addUserFriends = async (req, res, next) => {
  try {
    console.log("Adding user friends");
    const id = req.user._id;
    const { invitees } = req.body;

    const curUser = await user.findById(id);
    if (!curUser) {
      return next(new ErrorHandler("Error fetching user details to add friends", 400));
    }

    for (const invitee of invitees) {
      let curMail = invitee.email;
      const curInv = await user.findOne({ email: curMail });

      if (!curInv) {
        curUser.futureFriends = curUser.futureFriends || [];
        curUser.futureFriends.push({ email: curMail });

        sendInviteMail({ inviter: curUser, invitee });
        await curUser.save();
      } else {
        await addUserFriend({ invitee: curInv, inviter: curUser });
      }
    }
    console.log("Added user friends");
    return res.status(200).json({
      message: "Successfully added friends",
    });
  } catch (error) {
    console.log("Error sending invites:", error);
    next(error);
  }
};
