import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { sendCookie } from "../utils/features.js";
import bcrypt from "bcrypt";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const curUser = await user.findOne({ email }).select("+password");
    if (!curUser)
      return next(new ErrorHandler("Invalid Email or Password", 404));
    const isMatch = await bcrypt.compare(password, curUser.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Password", 404));
    sendCookie(curUser, res, `Hey ${curUser.name} glad to have you back`, 200);
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log(username, email, password);
    const name = username;
    let curUser = await user.findOne({ email });
    if (curUser) return next(new ErrorHandler("User Already Exist", 404));

    const hashedPassword = await bcrypt.hash(password, 10);
    curUser = await user.create({
      name,
      email,    
      password: hashedPassword,
    });

    sendCookie(curUser, res, "Welcome to Workout", 201);
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

export const updateUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedDetails = req.body;
    const curUser = await user.findById(id);

    if (!curUser) {
      return next(new ErrorHandler("User does not Exist", 404));
    }

    if (updatedDetails.name) {
      curUser.name = updatedDetails.name;
    }
    await curUser.save();
    return res.status(200).json({ message: "Details updated successfully" });
  } catch (error) {
    next(error);
  }
};
