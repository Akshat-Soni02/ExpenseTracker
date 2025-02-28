import expense from "../models/expense.js";
import ErrorHandler from "../middlewares/error.js";
import group from "../models/group.js";
import{distributeAmount} from "../services/groupService.js";
import{revertExpenseEffects} from "../services/expenseService.js";
import {updateFriendlyExchangeStatesOnLending} from "../services/userService.js";

export const updateTransactions = async (req, res, next) => {
    const currGroup = await group.findById("67beffd822af96797e9862f1").select("members");
    
    const member = currGroup.members.find(m => m.member_id.toString() === "67b9b5b18859a4c3049e2939");
    updateTransaction(member, otherMemberId, amount, type);
    await currGroup.save();
    res.status(201).json({
        success: true,
        message: "Expense created successfully"
      });
}


export const distributeAmounts = async (req, res, next) => {
    const groupId = "67beffd822af96797e9862f1";
    const giverId = "67b98aa1a9b4849b4bb2dad6";
    const borrowers = [{ user_id: "67b9b5b18859a4c3049e2939", amount: 1 }];
    distributeAmount({groupId, giverId, borrowers});
    res.status(201).json({
        success: true,
        message: "Expense created successfully"
      });
}

export const revertExpenseEffect = async (req, res, next) => {
    const existingExpense = await expense.findById("67c04393ee1f2002b51ef525");

    revertExpenseEffects(existingExpense);
    
    res.status(201).json({
        success: true,
        message: "Expense created successfully"
      });
}


export const updateFriendlyExchangeStatesOnLendings = async (req, res, next) => {
  const lender_id = "67b98aa1a9b4849b4bb2dad6";
  const borrowers = [{ user_id: "67b9b5b18859a4c3049e2939", amount: 1 }];
  updateFriendlyExchangeStatesOnLending({lender_id, borrowers});
  
  res.status(201).json({
      success: true,
      message: "Expense created successfully"
    });
}