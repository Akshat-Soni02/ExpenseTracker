import express from "express";
import {
  register,
  login,
  logout,
  updateUser,
  getMyProfile,
  getFriendlyUsers,
  getCurrentExhanges,
  getMyWallets,
} from "../controller/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", register);
router.post("/login", login);

//* GET APIs *//
router.get("/me", isAuthenticated, getMyProfile);
router.get("/logout", isAuthenticated, logout);
router.get("/friends", isAuthenticated, getFriendlyUsers);
router.get("/current-exchange-status", isAuthenticated, getCurrentExhanges);
router.get("/my-wallets", isAuthenticated, getMyWallets);

//* PUT APIs *//
router.put("/profile-details", isAuthenticated, updateUser);

export default router;
