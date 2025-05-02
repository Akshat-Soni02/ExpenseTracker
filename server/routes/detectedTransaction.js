import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createAutoTransaction, getAutoTransactionById ,deleteAutoTransaction} from "../controller/detectedTransactionController.js";


const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createAutoTransaction);

//* GET APIs *//
router.get("/:id", isAuthenticated, getAutoTransactionById);

//* PUT APIs *//
// router.put("/:id", isAuthenticated, );

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteAutoTransaction);

export default router;
