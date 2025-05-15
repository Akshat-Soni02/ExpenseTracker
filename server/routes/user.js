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
  getUserFutureFriends,
  googleLoginAccesstoken
} from "../controller/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import multer from "multer";
import {validate} from "../middlewares/validateRequest.js";
import {
  GoogleUserSchema,
  GoogleLoginSchema,
  RegisterSchema,
  LoginSchema,
  NotificationTokenSchema,
  UpdateUserSchema,
  SendOtpSchema,
  VerifyOtpSchema,
  ResetPasswordSchema,
  GetSettlementsQuerySchema,
  GetBillsQuerySchema,
  RemindBorrowerParamsSchema,
  autoAddFutureFriendsSchema,
  GetUserByIdParamsSchema,
  AddUserFriendsBodySchema
} from "../validations/user.schema.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

//* POST APIs *//
router.post("/new",validate(RegisterSchema), register);
router.post("/auth/google",validate(GoogleUserSchema), googleLoginAccesstoken);
router.post("/login",validate(LoginSchema), login);
router.post("/send-otp",validate(SendOtpSchema), sendOtp);
router.post("/verify-otp",validate(VerifyOtpSchema), verifyOtp);
router.post("/reset-password",validate(ResetPasswordSchema), resetPassword);
router.post("/send-invites",validate(AddUserFriendsBodySchema), isAuthenticated, addUserFriends);
router.post("/auto-add-friends",validate(autoAddFutureFriendsSchema), autoAddFutureFriends);
router.post("/remind-borrowers", isAuthenticated, remindBorrowers);
router.post("/remind-borrower/:borrower_id",validate(RemindBorrowerParamsSchema), isAuthenticated, remindBorrower);

//* GET APIs *//
router.get("/me", isAuthenticated, getMyProfile);
router.get("/logout", isAuthenticated, logout);
router.get("/groups", isAuthenticated, getMyGroups);
router.get("/expenses", isAuthenticated, getMyExpenses);
router.get("/settlements",validate(GetSettlementsQuerySchema), isAuthenticated, getMySettlements);
router.get("/wallets", isAuthenticated, getMyWallets);
router.get("/budgets", isAuthenticated, getMyBudgets);
router.get("/bills",validate(GetBillsQuerySchema), isAuthenticated, getMyBills);
router.get("/personal-transactions", isAuthenticated, getMyPersonalTransactions);
router.get("/detected-transactions", isAuthenticated, getMyDetectedTransactions);
router.get("/friends", isAuthenticated, getFriendlyUsers);
router.get("/current-exchange-status", isAuthenticated, getCurrentExhanges);
router.get("/today-spend", isAuthenticated, getUserTodaySpend);
router.get("/future-friends", isAuthenticated, getUserFutureFriends);
router.get("/:id",validate(GetUserByIdParamsSchema), isAuthenticated, getUserById);

//* PUT APIs *//
router.put("/profile-details",validate(UpdateUserSchema), isAuthenticated,upload.single("media"), updateUser);
router.put("/profile-photo", isAuthenticated, updateProfilePhoto);
router.put("/update-access-token",validate(NotificationTokenSchema), isAuthenticated, updateUserNotificationToken);

export default router;
