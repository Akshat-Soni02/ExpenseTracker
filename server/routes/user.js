import express from "express";
import {
  register,
  login,
  logout,
  updateUser,
  getMyProfile,
} from "../controller/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", register);
router.post("/login", login);

//* GET APIs *//
router.get("/me", isAuthenticated, getMyProfile);
router.get("/logout", isAuthenticated, logout);

//* PUT APIs *//
router.put("/profile-details", isAuthenticated, updateUser);

export default router;
