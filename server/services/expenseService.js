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
  try{
    console.log("Handling expense relations");
    if(!total_amount || !lender_id || borrowers.length === 0){
      console.log("Lender ID, borrowers, or total amount is undefined");
      throw new Error("Lender id, borrowers, or total amount is undefined");
    }

    //Update Wallet
    if (wallet_id){
      try{
        await modifyWalletBalance({ id: wallet_id, amount: -total_amount });
      }
      catch (err) {
        console.log("Error modifying wallet balance:", err);
        throw new err;
      }
    }

    if (group_id){
      try {
        await distributeAmount({
          groupId: group_id,
          giverId: lender_id,
          borrowers,
        });
      } catch (err) {
          console.log("Error distributing amount:", err);
          throw new err;
      }
    }
    
      
    //Update Users friendly state
    await updateFriendlyExchangeStatesOnLending({
      lender_id: lender_id,
      borrowers
    });

    console.log("Updated friendly exchange states");

  }
  catch (error) {
    console.log("Error handling expense relations", error);
    throw error;
  }
};

export const revertExpenseEffects = async (curExpense) => {
  try {

    console.log("Reverting expense effects");
    if (!curExpense) {
      console.log("Current expense is undefined");
      throw new Error("Current expense is undefined");
    }

    if (curExpense.wallet_id) {
      try{
        await modifyWalletBalance({
          id: curExpense.wallet_id,
          amount: curExpense.total_amount,
        });
      }
      catch (err) {
        console.log("Error modifying wallet balance:", err);
        throw new Error("Error modifying wallet balance");
      }
    }

    for (const borrower of curExpense.borrowers) {
      try{
        await handleExpenseRelations({
          lender_id: borrower.user_id.toString(),
          borrowers: [{ user_id: curExpense.lenders[0].user_id.toString(), amount: borrower.amount }],
          group_id: curExpense?.group_id?.toString(),
        });
      }
      catch (err) {
        console.log("Error handling expense relations:", err);
        throw new Error("Error handling expense relations");
      }
    }
  } catch (error) {
    console.log("Error reverting expense", error);
    throw new Error("Error reverting expense");
  }
};

export const findExpenseById = async (id) => {
  try{
    console.log("Finding expense by ID");

    if(!id) {
      console.log(`Expense id is undefined: ${id}`);
      throw new Error(`Expense id is undefined: ${id}`);
    }

    const curExpense = await expense.findById(id);
    return curExpense;
  }
  catch (error) {
    console.log("Error finding expense by ID", error);
    throw new Error("Error finding expense by ID");
  }
}

export const findPeriodicExpenses = async ({start, end, userId}) => {
  try{
    console.log("Finding periodic expenses");

    if(!start || !end || !userId) {
      console.log(`Start date, end date, or user ID is undefined: ${start}, ${end}, ${userId}`);
      throw new Error(`Start date, end date, or user ID is undefined: ${start}, ${end}, ${userId}`);
    }

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
  catch (error) {
    console.log("Error finding periodic expenses", error);
    throw new Error("Error finding periodic expenses");
  }
}

export const findUserExpenses = async ({userId, group_id}) => {
  try{
    console.log("Finding user expenses");

    if(!userId) {
      console.log(`User ID is undefined: ${userId}`);
      throw new Error(`User ID is undefined: ${userId}`);
    }
    
    let filter = {
      $or: [
        { "lenders.user_id": userId.toString() },
        { "borrowers.user_id": userId.toString() },
      ],
    };

    if (group_id) {
      filter.group_id = group_id; // Filter by group if provided
    }

    const expenses = await expense.find(filter).sort({
      created_at_date_time: -1,
    });

    // const modifiedExpenses = expenses.map(expense => {
    //   const isLender =
    //     Array.isArray(expense.lenders) &&
    //     expense.lenders.some(
    //       lender => lender?.user_id?.toString() === userId.toString()
    //     );

    //   const isBorrower =
    //     Array.isArray(expense.borrowers) &&
    //     expense.borrowers.some(
    //       borrower => borrower?.user_id?.toString() === userId.toString()
    //     );
    //   console.log("Expense found");
    //   return {
    //     ...expense.toObject(), // Convert Mongoose document to plain object
    //     transactionType: isLender ? 'debit' : isBorrower ? 'credit' : undefined, // Add credit/debit field
    //   };
    // });
    // return modifiedExpenses;
    return expenses;
  }
  catch (error) {
    console.log("Error finding user expenses", error);
    throw new Error("Error finding user expenses");
  }
}

export const findCustomExpenses = async ({
  description,
  lender_id,
  borrower_id,
  group_id,
  wallet_id,
  min_amount,
  max_amount,
  category}) => {
    try{  
      console.log("Finding custom expenses");

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
    catch (error) {
      console.log("Error finding custom expenses", error);
      throw new Error("Error finding custom expenses");
    }
}