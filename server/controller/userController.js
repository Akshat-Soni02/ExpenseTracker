import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { sendCookie } from "../utils/features.js";
import bcrypt from "bcrypt";
import { uploadMedia } from "./cloudinaryController.js";

import path from "path";
import { fileURLToPath } from "url";

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
    const result = await updateProfilePhoto(filePath, next);

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
    const curUser = await user.findById(id);

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

export const updateProfilePhoto = async (profile_path, next) => {
  try {
    console.log(profile_path);
    const result = await uploadMedia(profile_path, "userProfiles");
    console.log("Profile Picture updated successfully");
    return result;
  } catch (error) {
    next(error);
  }
};
