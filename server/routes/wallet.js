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
import { 
  createWalletSchema, 
  updateWalletSchema,
  deleteWalletParamsSchema,
  getWalletByIdParamsSchema,
  walletsAmountTransferSchema,
  walletTransactionsSchema
} from "../validators/wallet.schema.js";
const router = express.Router();

//* POST APIs *//
router.post("/new",isAuthenticated, validate(createWalletSchema), createWallet);

//* GET APIs *//
router.get("/:id", isAuthenticated,validate(getWalletByIdParamsSchema), getWalletById);
router.get("/transactions/:wallet_id", isAuthenticated, validate(walletTransactionsSchema), walletTransactions);

//* PUT APIs *//
router.put("/transfer", isAuthenticated,validate(walletsAmountTransferSchema), walletsAmountTransfer);
router.put("/:id", isAuthenticated,validate(updateWalletSchema), updateWallet);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated,validate(deleteWalletParamsSchema), deleteWallet);

export default router;
