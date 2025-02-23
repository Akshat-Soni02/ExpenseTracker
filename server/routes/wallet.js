import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  createWallet,
  updateWallet,
  deleteWallet,
  getWalletById,
  walletsAmountTransfer,
} from "../controller/walletController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createWallet);
router.post("/handle-amount-transfer", isAuthenticated);

//* GET APIs *//
router.get("/:id", isAuthenticated, getWalletById);

//* PUT APIs *//
router.put("/transfer", isAuthenticated, walletsAmountTransfer);
router.put("/:id", isAuthenticated, updateWallet);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteWallet);

export default router;
