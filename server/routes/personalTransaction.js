import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { 
    createPersonalTransaction, 
    deletePersonalTransaction, 
    updatePersonalTransaction,
    getPersonalTransactionById,
    getUserPeriodTypeTransactions 
} from "../controller/personalTransactionController.js";
import multer from "multer";
import {validate} from "../middlewares/validateRequest.js";
import {
    createPersonalTransactionSchema,
    updatePersonalTransactionSchema,
    deletePersonalTransactionSchema,
    getPersonalTransactionSchema,
    getUserPeriodTypeTransactionsSchema
} from "../validations/personalTransaction.schema.js";
const router = express.Router();


const storage = multer.memoryStorage();
const upload = multer({ storage });

//* POST APIs *//
router.post("/new",validate(createPersonalTransactionSchema), isAuthenticated,upload.single("media"), createPersonalTransaction);

//* GET APIs *//
router.get("/userPeriod",validate(getUserPeriodTypeTransactionsSchema),isAuthenticated,getUserPeriodTypeTransactions)
router.get("/:personalTransaction_id",validate(getPersonalTransactionSchema), isAuthenticated, getPersonalTransactionById);

//* PUT APIs *//
router.put("/:personalTransaction_id",validate(updatePersonalTransactionSchema), isAuthenticated, updatePersonalTransaction);

//* DELETE APIs *//
router.delete("/:personalTransaction_id",validate(deletePersonalTransactionSchema), isAuthenticated, deletePersonalTransaction);

export default router;