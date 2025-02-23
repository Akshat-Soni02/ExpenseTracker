import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createSettlement } from "../controller/settlementController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createSettlement);

//* GET APIs *//
router.get("/leave/:groupId", isAuthenticated);
router.get("/:id", isAuthenticated);

//* PUT APIs *//
router.put("/:id", isAuthenticated);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;
