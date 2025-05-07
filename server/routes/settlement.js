import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createSettlement, updateSettlement, getSettlementById, deleteSettlement } from "../controller/settlementController.js";
import {validate} from "../middlewares/validateRequest.js";
import { createSettlementSchema, getSettlementByIdSchema, updateSettlementSchema, deleteSettlementSchema } from "../validators/settlement.schema.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated,validate(createSettlementSchema), createSettlement);

//* GET APIs *//
router.get("/:id", isAuthenticated,validate(getSettlementByIdSchema), getSettlementById);

//* PUT APIs *//
router.put("/update/:id", isAuthenticated,validate(updateSettlementSchema), updateSettlement);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated,validate(deleteSettlementSchema), deleteSettlement);

export default router;
