import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { 
    createSettlement, 
    updateSettlement, 
    getSettlementById, 
    deleteSettlement 
} from "../controller/settlementController.js";
import {validate} from "../middlewares/validateRequest.js";
import {
    createSettlementSchema,
    updateSettlementSchema,
    deleteSettlementParamsSchema,
    getSettlementByIdParamsSchema
} from "../validators/settlement.schema.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated,validate(createSettlementSchema), createSettlement);

//* GET APIs *//
router.get("/:id", isAuthenticated,validate(getSettlementByIdParamsSchema), getSettlementById);

//* PUT APIs *//
router.put("/update/:id", isAuthenticated,validate(updateSettlementSchema), updateSettlement);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated,validate(deleteSettlementParamsSchema), deleteSettlement);

export default router;
