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
  sendOtp,
  verifyOtp,
  resetPassword,
  getMyGroups,
  getMyExpenses,
  getMySettlements,
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
  googleLoginAccesstoken,
  removeFriendInvite,
  getUnifiedData,
  userPhoneNumCheck,
  phoneNumAvailabilityCheck,
  mergeToDummy,
  addContactFriend
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
  AddUserFriendsBodySchema,
  RemoveFriendInviteSchema
} from "../validators/user.schema.js";

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
router.post("/first-merge-to-dummy/:phone_num", isAuthenticated, mergeToDummy);
router.post("/send-invites", isAuthenticated,validate(AddUserFriendsBodySchema), addUserFriends);
router.post("/add-contact-friend", isAuthenticated, addContactFriend);
router.post("/auto-add-friends",validate(autoAddFutureFriendsSchema), autoAddFutureFriends);
router.post("/remind-borrowers", isAuthenticated, remindBorrowers);
router.post("/remind-borrower/:borrower_id", isAuthenticated,validate(RemindBorrowerParamsSchema), remindBorrower);
router.post("/remove-friend-invite", isAuthenticated,validate(RemoveFriendInviteSchema), removeFriendInvite);

//* GET APIs *//
router.get("/me", isAuthenticated, getMyProfile);
router.get("/user-phone-number-check", isAuthenticated, userPhoneNumCheck);
router.get("/phone-number-availability-check", isAuthenticated, phoneNumAvailabilityCheck);
router.get("/logout", isAuthenticated, logout);
router.get("/groups", isAuthenticated, getMyGroups);
router.get("/expenses", isAuthenticated, getMyExpenses);
router.get("/settlements", isAuthenticated,validate(GetSettlementsQuerySchema), getMySettlements);
router.get("/wallets", isAuthenticated, getMyWallets);
router.get("/bills", isAuthenticated,validate(GetBillsQuerySchema), getMyBills);
router.get("/personal-transactions", isAuthenticated, getMyPersonalTransactions);
router.get("/detected-transactions", isAuthenticated, getMyDetectedTransactions);
router.get("/friends", isAuthenticated, getFriendlyUsers);
router.get("/current-exchange-status", isAuthenticated, getCurrentExhanges);
router.get("/today-spend", isAuthenticated, getUserTodaySpend);
router.get("/future-friends", isAuthenticated, getUserFutureFriends);
router.get("/unified-history", isAuthenticated, getUnifiedData);
router.get("/:id", isAuthenticated,validate(GetUserByIdParamsSchema), getUserById);

//* PUT APIs *//
router.put("/profile-details", isAuthenticated,validate(UpdateUserSchema),upload.single("media"), updateUser);
router.put("/update-access-token", isAuthenticated,validate(NotificationTokenSchema), updateUserNotificationToken);

export default router;
