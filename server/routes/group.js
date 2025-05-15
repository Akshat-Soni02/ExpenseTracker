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
  processSimplifyDebts,
  addToGroup,
} from "../controller/groupController.js";
import {validate} from "../middlewares/validateRequest.js";
import {
  createGroupSchema,
  updateGroupSchema,
  leaveGroupParamsSchema,
  getGroupByIdParamsSchema,
  getGroupExchangeStateWithOthersParamsSchema,
  remindGroupBorrowerParamsSchema,
  remindAllGroupBorrowersParamsSchema,
  getGroupHistoryParamsSchema,
  processSimplifyDebtsParamsSchema,
  addToGroupParamsSchema
} from "../validations/group.schema.js";

const router = express.Router();

//* POST APIs *//
router.post("/new",validate(createGroupSchema), isAuthenticated, createGroup);
router.post("/remind-group-borrower/:group_id",validate(remindGroupBorrowerParamsSchema), isAuthenticated, remindGroupBorrower);
router.post("/remind-all-group-borrowers/:group_id",validate(remindAllGroupBorrowersParamsSchema), isAuthenticated, remindAllGroupBorrowers);
router.post("/simplify-debt/:group_id",validate(processSimplifyDebtsParamsSchema), isAuthenticated, processSimplifyDebts);

//* GET APIs *//
router.get("/leave/:groupId",validate(leaveGroupParamsSchema), isAuthenticated, leaveGroup);
router.get("/exchange-state/:group_id",validate(getGroupExchangeStateWithOthersParamsSchema), isAuthenticated, getGroupExchangeStateWithOthers);
router.get("/history/:group_id",validate(getGroupHistoryParamsSchema), isAuthenticated, getGroupHistory);
router.get("/:id",validate(getGroupByIdParamsSchema), isAuthenticated, getGroupById);

//* PUT APIs *//
router.put("/add-to-group/:group_id",validate(addToGroupParamsSchema), isAuthenticated, addToGroup);
router.put("/:id",validate(updateGroupSchema), isAuthenticated, updateGroup);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;