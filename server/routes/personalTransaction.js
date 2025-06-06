import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { 
    createPersonalTransaction, 
    deletePersonalTransaction, 
    updatePersonalTransaction,
    getPersonalTransactionById,
    getUserPeriodTypeTransactions ,
    deletePersonalTransactionPhoto
} from "../controller/personalTransactionController.js";
import multer from "multer";
import {validate} from "../middlewares/validateRequest.js";
import {
    createPersonalTransactionSchema,
    updatePersonalTransactionSchema,
    deletePersonalTransactionSchema,
    getPersonalTransactionSchema,
    getUserPeriodTypeTransactionsSchema
} from "../validators/personalTransaction.schema.js";
const router = express.Router();


const storage = multer.memoryStorage();
const upload = multer({ storage });

//* POST APIs *//
router.post("/new", isAuthenticated, upload.single("media") ,validate(createPersonalTransactionSchema), createPersonalTransaction);

//* GET APIs *//
router.get("/userPeriod",isAuthenticated,validate(getUserPeriodTypeTransactionsSchema),getUserPeriodTypeTransactions)
router.get("/:personalTransaction_id", isAuthenticated,validate(getPersonalTransactionSchema), getPersonalTransactionById);

//* PUT APIs *//
router.put("/photo/:personalTransaction_id", isAuthenticated, upload.single("media"), deletePersonalTransactionPhoto);
router.put("/:personalTransaction_id", isAuthenticated,validate(updatePersonalTransactionSchema), updatePersonalTransaction);

//* DELETE APIs *//
router.delete("/:personalTransaction_id", isAuthenticated,validate(deletePersonalTransactionSchema), deletePersonalTransaction);

export default router;