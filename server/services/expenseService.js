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

  console.log("wallet modified");

  //Update Group
  if (group_id)
    await distributeAmount({
      groupId: group_id,
      giverId: lender_id,
      borrowers,
    });

  console.log("group modified");

  //Update Users friendly state
  await updateFriendlyExchangeStatesOnLending({
    lender_id: lender_id,
    borrowers,
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

    curExpense.borrowers.forEach(async (borrower) => {
      await handleExpenseRelations({
        lender_id: borrower.user_id,
        borrowers: [{ user_id: curExpense.lender_id, amount: borrower.amount }],
        group_id: curExpense?.group_id,
      });
    });
    console.log("Successfully reverted the expense with id", curExpense._id);
  } catch (error) {
    console.log("Error reverting expense", error);
  }
};
