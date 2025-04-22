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
  addUserFriends,
  autoAddFutureFriends,
  updateUserNotificationToken,
  getUserTodaySpend,
  getUserFutureFriends
} from "../controller/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

//* POST APIs *//
router.post("/new", register);
router.post("/auth/google", googleLogin);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/send-invites", isAuthenticated, addUserFriends);
router.post("/auto-add-friends", autoAddFutureFriends);
router.post("/remind-borrowers", isAuthenticated, remindBorrowers);
router.post("/remind-borrower/:borrower_id", isAuthenticated, remindBorrower);

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
router.get("/today-spend", isAuthenticated, getUserTodaySpend);
router.get("/future-friends", isAuthenticated, getUserFutureFriends);
router.get("/:id", isAuthenticated, getUserById);

//* PUT APIs *//
router.put("/profile-details", isAuthenticated,upload.single("media"), updateUser);
router.put("/profile-photo", isAuthenticated, updateProfilePhoto);
router.put("/update-access-token", isAuthenticated, updateUserNotificationToken);

export default router;
