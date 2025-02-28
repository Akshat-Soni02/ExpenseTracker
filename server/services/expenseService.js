import expense from "../models/expense.js";
import { modifyWalletBalance } from "./walletService.js";
import { distributeAmount } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";

export const handleExpenseRelations = async ({
  lender_id,
  borrowers,
  wallet_id,
  group_id,
  total_amount,
}) => {
  //Update Wallet
  if (wallet_id)
    await modifyWalletBalance({ id: wallet_id, amount: -total_amount });
  
  if (group_id)
    try {
      await distributeAmount({
        groupId: group_id,
        giverId: lender_id,
        borrowers,
      });
  } catch (err) {
      console.log("Error distributing amount:", err);
  }
  
    
  //Update Users friendly state
  await updateFriendlyExchangeStatesOnLending({
    lender_id: lender_id,
    borrowers
  });
};

export const revertExpenseEffects = async (curExpense) => {
  try {
    if (curExpense.wallet_id) {
      await modifyWalletBalance({
        id: curExpense.wallet_id,
        amount: curExpense.total_amount,
      });
    }

    for (const borrower of curExpense.borrowers) {
      await handleExpenseRelations({
        lender_id: borrower.user_id.toString(),
        borrowers: [{ user_id: curExpense.lenders[0].user_id.toString(), amount: borrower.amount }],
        group_id: curExpense?.group_id.toString(),
      });
    }
  } catch (error) {
    console.log("Error reverting expense", error);
  }
};

export const findExpenseById = async (id) => {
  const curExpense = await expense.findById(id);
  if (!curExpense) return null;
  return curExpense;
}

export const findPeriodicExpenses = async ({start, end, userId}) => {
    const expenses = await expense
    .find({
      $or: [
        { creator_id: userId },
        { "lenders.user_id": userId },
        { "borrowers.user_id": userId },
      ],
      created_at_date_time: { $gte: start, $lte: end },
    })
    .sort({ created_at_date_time: -1 }); // Sort by most recent

    return expenses;
}

export const findUserExpenses = async ({userId, group_id}) => {
  let filter = {
    $or: [
      { "lenders.user_id": userId },
      { "borrowers.user_id": userId },
    ],
  };

  if (group_id) {
    filter.group_id = group_id; // Filter by group if provided
  }

  const expenses = await expense.find(filter).sort({
    created_at_date_time: -1,
  });

  return expenses;
}

export const findCustomExpenses = async ({description,
  lender_id,
  borrower_id,
  group_id,
  wallet_id,
  min_amount,
  max_amount,
  category}) => {
    let filter = {};

    if (description) {
      filter.description = { $regex: description, $options: "i" }; // Case-insensitive search
    }

    if (lender_id) {
      filter["lenders.user_id"] = lender_id;
    }

    if (borrower_id) {
      filter["borrowers.user_id"] = borrower_id;
    }

    if (group_id) {
      filter.group_id = group_id;
    }

    if (wallet_id) {
      filter.wallet_id = wallet_id;
    }

    if (category) {
      filter.expense_category = category;
    }

    if (min_amount || max_amount) {
      filter.total_amount = {};
      if (min_amount) filter.total_amount.$gte = Number(min_amount);
      if (max_amount) filter.total_amount.$lte = Number(max_amount);
    }

    const expenses = await expense
      .find(filter)
      .sort({ created_at_date_time: -1 });
    
    return expenses;
}