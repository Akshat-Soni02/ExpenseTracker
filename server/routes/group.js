import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  createGroup,
  updateGroup,
  leaveGroup,
  getGroupById,
  getGroupExchangeStateWithOthers,
  remindGroupBorrower,
  remindAllGroupBorrowers,
  getGroupHistory,
} from "../controller/groupController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createGroup);

//* GET APIs *//
router.get("/leave/:groupId", isAuthenticated, leaveGroup);
router.get("/exchange-state/:group_id", isAuthenticated, getGroupExchangeStateWithOthers);
router.get("/remind-group-borrower/:group_id", isAuthenticated, remindGroupBorrower);
router.get("/remind-all-group-borrowers/:group_id", isAuthenticated, remindAllGroupBorrowers);
router.get("/history/:group_id", isAuthenticated, getGroupHistory);
router.get("/:id", isAuthenticated, getGroupById);

//* PUT APIs *//
router.put("/:id", isAuthenticated, updateGroup);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;