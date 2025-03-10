import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createSettlement, updateSettlement, getSettlementById, deleteSettlement } from "../controller/settlementController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createSettlement);

//* GET APIs *//
router.get("/:id", isAuthenticated, getSettlementById);

//* PUT APIs *//
router.put("/update/:id", isAuthenticated, updateSettlement);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteSettlement);

export default router;
