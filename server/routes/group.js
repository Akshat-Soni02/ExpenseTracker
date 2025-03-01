import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  createGroup,
  updateGroup,
  leaveGroup,
  getGroupById,
} from "../controller/groupController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createGroup);

//* GET APIs *//
router.get("/leave/:groupId", isAuthenticated, leaveGroup);
router.get("/:id", isAuthenticated, getGroupById);

//* PUT APIs *//
router.put("/:id", isAuthenticated, updateGroup);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;
