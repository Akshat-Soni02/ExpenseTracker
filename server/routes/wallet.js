import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  createWallet,
  updateWallet,
  deleteWallet,
  getWalletById,
  walletsAmountTransfer,
} from "../controller/walletController.js";
import { validate } from "../middlewares/validateRequest.js";
import { 
  createWalletSchema, 
  updateWalletSchema,
  deleteWalletParamsSchema,
  getWalletByIdParamsSchema,
  walletsAmountTransferSchema,
} from "../validators/wallet.schema.js";
const router = express.Router();

//* POST APIs *//
router.post("/new", validate(createWalletSchema),isAuthenticated, createWallet);

//* GET APIs *//
router.get("/:id",validate(getWalletByIdParamsSchema), isAuthenticated, getWalletById);

//* PUT APIs *//
router.put("/transfer",validate(walletsAmountTransferSchema), isAuthenticated, walletsAmountTransfer);
router.put("/:id",validate(updateWalletSchema), isAuthenticated, updateWallet);

//* DELETE APIs *//
router.delete("/:id",validate(deleteWalletParamsSchema), isAuthenticated, deleteWallet);

export default router;
