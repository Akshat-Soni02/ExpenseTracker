import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import {
  createWallet,
  updateWallet,
  deleteWallet,
  getWalletById,
  walletsAmountTransfer,
  walletTransactions
} from "../controller/walletController.js";
import { walletTransactionsSchema } from "../validators/wallet.schema.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createWallet);

//* GET APIs *//
router.get("/:id", isAuthenticated, getWalletById);
router.get("/transactions/:wallet_id", isAuthenticated, validate(walletTransactionsSchema), walletTransactions);

//* PUT APIs *//
router.put("/transfer", isAuthenticated, walletsAmountTransfer);
router.put("/:id", isAuthenticated, updateWallet);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteWallet);

export default router;
