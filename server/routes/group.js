import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createGroup } from "../controller/groupController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createGroup);

//* GET APIs *//
router.get("/:id", isAuthenticated);

//* PUT APIs *//
router.put("/:id", isAuthenticated);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;
