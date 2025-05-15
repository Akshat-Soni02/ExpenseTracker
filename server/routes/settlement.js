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
router.post("/new",validate(createSettlementSchema), isAuthenticated, createSettlement);

//* GET APIs *//
router.get("/:id",validate(getSettlementByIdParamsSchema), isAuthenticated, getSettlementById);

//* PUT APIs *//
router.put("/update/:id",validate(updateSettlementSchema), isAuthenticated, updateSettlement);

//* DELETE APIs *//
router.delete("/:id",validate(deleteSettlementParamsSchema), isAuthenticated, deleteSettlement);

export default router;
