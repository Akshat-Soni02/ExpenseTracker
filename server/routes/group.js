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
} from "../validators/group.schema.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated,validate(createGroupSchema), createGroup);
router.post("/remind-group-borrower/:group_id", isAuthenticated,validate(remindGroupBorrowerParamsSchema), remindGroupBorrower);
router.post("/remind-all-group-borrowers/:group_id", isAuthenticated,validate(remindAllGroupBorrowersParamsSchema), remindAllGroupBorrowers);
router.post("/simplify-debt/:group_id", isAuthenticated,validate(processSimplifyDebtsParamsSchema), processSimplifyDebts);

//* GET APIs *//
router.get("/leave/:groupId", isAuthenticated,validate(leaveGroupParamsSchema), leaveGroup);
router.get("/exchange-state/:group_id", isAuthenticated,validate(getGroupExchangeStateWithOthersParamsSchema), getGroupExchangeStateWithOthers);
router.get("/history/:group_id", isAuthenticated,validate(getGroupHistoryParamsSchema), getGroupHistory);
router.get("/:id", isAuthenticated,validate(getGroupByIdParamsSchema), getGroupById);

//* PUT APIs *//
router.put("/add-to-group/:group_id", isAuthenticated,validate(addToGroupParamsSchema), addToGroup);
router.put("/:id", isAuthenticated,validate(updateGroupSchema), updateGroup);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;