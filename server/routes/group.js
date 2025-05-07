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
import { validate } from "../middlewares/validateRequest.js";
import { createGroupSchema, remindGroupBorrowerSchema, remindAllGroupBorrowersSchema, processSimplifyDebtsSchema, leaveGroupSchema, getGroupExchangeStateWithOthersSchema, getGroupHistorySchema, getGroupByIdSchema, addToGroupSchema, updateGroupSchema } from "../validators/group.schema.js";


const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, validate(createGroupSchema), createGroup);
router.post("/remind-group-borrower/:group_id", isAuthenticated, validate(remindGroupBorrowerSchema), remindGroupBorrower);
router.post("/remind-all-group-borrowers/:group_id", isAuthenticated,validate(remindAllGroupBorrowersSchema), remindAllGroupBorrowers);
router.post("/simplify-debt/:group_id", isAuthenticated, validate(processSimplifyDebtsSchema), processSimplifyDebts);

//* GET APIs *//
router.get("/leave/:groupId", isAuthenticated, validate(leaveGroupSchema), leaveGroup);
router.get("/exchange-state/:group_id", isAuthenticated, validate(getGroupExchangeStateWithOthersSchema), getGroupExchangeStateWithOthers);
router.get("/history/:group_id", isAuthenticated, validate(getGroupHistorySchema), getGroupHistory);
router.get("/:id", isAuthenticated,validate(getGroupByIdSchema), getGroupById);

//* PUT APIs *//
router.put("/add-to-group/:group_id", isAuthenticated,validate(addToGroupSchema), addToGroup);
router.put("/:id", isAuthenticated,validate(updateGroupSchema), updateGroup);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated);

export default router;