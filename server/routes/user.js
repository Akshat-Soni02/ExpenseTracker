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
  updateProfilePhoto,
  sendOtp,
  verifyOtp,
  resetPassword,
  getMyGroups,
  getMyExpenses,
  getMySettlements,
  getMyBudgets,
  getMyPersonalTransactions,
  getMyDetectedTransactions,
  remindBorrowers,
  googleLogin,
  getMyBills,
  remindBorrower,
  getUserById,
} from "../controller/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", register);
router.post("/auth/google", googleLogin);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

//* GET APIs *//
router.get("/me", isAuthenticated, getMyProfile);
router.get("/logout", isAuthenticated, logout);
router.get("/groups", isAuthenticated, getMyGroups);
router.get("/expenses", isAuthenticated, getMyExpenses);
router.get("/settlements", isAuthenticated, getMySettlements);
router.get("/wallets", isAuthenticated, getMyWallets);
router.get("/budgets", isAuthenticated, getMyBudgets);
router.get("/bills", isAuthenticated, getMyBills);
router.get("/personal-transactions", isAuthenticated, getMyPersonalTransactions);
router.get("/detected-transactions", isAuthenticated, getMyDetectedTransactions);
router.get("/friends", isAuthenticated, getFriendlyUsers);
router.get("/current-exchange-status", isAuthenticated, getCurrentExhanges);
router.get("/remind-borrowers", isAuthenticated, remindBorrowers);
router.get("/remind-borrower/:borrower_id", isAuthenticated, remindBorrower);
router.get("/:id", isAuthenticated, getUserById);

//* PUT APIs *//
router.put("/profile-details", isAuthenticated, updateUser);
router.put("/profile-photo", isAuthenticated, updateProfilePhoto);

export default router;
