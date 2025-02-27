import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { sendCookie } from "../utils/features.js";
import bcrypt from "bcrypt";
import { uploadMedia } from "../services/cloudinaryService.js";

import path from "path";
import { fileURLToPath } from "url";
import { findUserById } from "../services/userService.js";
import { findUserWallets } from "../services/walletService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const loggedUser = await user.findOne({ email }).select("+password");
    if (!loggedUser) return next(new ErrorHandler("Invalid Email", 404));
    const isMatch = await bcrypt.compare(password, loggedUser.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Password", 404));
    sendCookie(
      loggedUser,
      res,
      `Hey ${loggedUser.name} glad to have you back`,
      200
    );
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    let userAlreadyExist = await user.findOne({ email });
    if (userAlreadyExist)
      return next(new ErrorHandler("User Already Exist", 404));

    const filePath = path.resolve(__dirname, "../assets/panda.jpg");
    const result = await uploadMedia(filePath, "userProfiles", next);

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

    sendCookie(newUser, res, "Welcome to ExpenseTracker", 201);
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const logout = async (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      sameSite: "none",
      secure: true,
    })
    .json({
      success: true,
      user: req.user,
    });
};

export const updateUser = async (req, res, next) => {
  try {
    const id = req.user.id;
    const updatedDetails = req.body;
    const curUser = await findUserById(id);

    if (!curUser) {
      return next(new ErrorHandler("User does not Exist", 404));
    }

    if (updatedDetails.name) {
      curUser.name = updatedDetails.name;
    }
    if (updatedDetails.phone_number) {
      curUser.phone_number = updatedDetails.phone_number;
    }
    if (updatedDetails.profile_photo) {
      const result = await updateProfilePhoto(
        updatedDetails.profile_photo,
        next
      );
      if (result && result.secure_url) {
        curUser.profile_photo = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }
    }

    if (updatedDetails.daily_limit) {
      curUser.daily_limit = updatedDetails.daily_limit;
    }
    await curUser.save();
    return res.status(200).json({ message: "Details updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const getFriendlyUsers = async (req, res) => {
  try {
    const id = req.user.id;
    const curUser = await user.findById(id).select("lended borrowed settled");

    const friendsMap = new Map();

    curUser.lended.forEach(({ borrower_id, amount }) => {
      const strId = borrower_id.toString();
      if (!friendsMap.has(strId)) friendsMap.set(strId, 0);
      friendsMap.set(strId, friendsMap.get(strId) + amount);
      console.log(amount);
    });

    curUser.borrowed.forEach(({ lender_id, amount }) => {
      const strId = lender_id.toString();
      if (!friendsMap.has(strId)) friendsMap.set(strId, 0);
      friendsMap.set(strId, friendsMap.get(strId) - amount);
    });

    curUser.settled.forEach(({ user_id, amount }) => {
      const strId = user_id.toString();
      if (!friendsMap.has(strId)) friendsMap.set(strId, amount);
    });

    const friendIds = [...friendsMap.keys()];

    const friends = await user
      .find({ _id: { $in: friendIds } })
      .select("name profile_photo");

    // Attach amounts to friend data
    const friendsWithAmounts = friends.map((friend) => ({
      id: friend._id,
      name: friend.name,
      profile_photo: friend.profile_photo,
      amount: friendsMap.get(friend._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      people: friendsWithAmounts,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getCurrentExhanges = async (req, res, next) => {
  try {
    const id = req.user.id;
    const curUser = await user.findById(id).select("lended borrowed");
    let lendedAmount = 0,
      borrowedAmount = 0;
    curUser.lended.forEach(({ borrower_id, amount }) => {
      lendedAmount = lendedAmount + amount;
    });
    curUser.borrowed.forEach(({ lender_id, amount }) => {
      borrowedAmount = borrowedAmount + amount;
    });
    res.status(200).json({
      success: true,
      lendedAmount,
      borrowedAmount,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getMyWallets = async (req, res, next) => {
  try {
    const id = req.user._id;
    const wallets = await findUserWallets(id);
    res.status(200).json({
      success: true,
      wallets,
    });
  } catch (error) {
    console.log("Error fetching my wallets", error);
    next(error);
  }
};
