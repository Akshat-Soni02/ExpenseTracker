import express from "express";
import {
  register,
  login,
  logout,
  updateUserDetails,
  getMyProfile
} from "../controller/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", register);
router.post("/login", login);

//* GET APIs *//
router.get("/me", isAuthenticated, getMyProfile);
router.get("/logout", logout);

//* PUT APIs *//
router.put("/update/:id", isAuthenticated, updateUserDetails);

export default router;
