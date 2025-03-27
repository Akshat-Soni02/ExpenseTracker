import expense from "../models/expense.js";
import ErrorHandler from "../middlewares/error.js";
import { uploadMedia } from "../services/cloudinaryService.js";
import {
  findExpenseById,
  findPeriodicExpenses,
  handleExpenseRelations,
  revertExpenseEffects,
  findUserExpenses,
  findCustomExpenses
} from "../services/expenseService.js";
import { sufficientBalance } from "../services/walletService.js";
import { v4 as uuidv4 } from 'uuid';


//creating an expense means changing group states, wallet states also changing personal states with other people
export const createExpense = async (req, res, next) => {
  try {
    console.log("Creating Expense");
    let {
      description,
      wallet_id,
      total_amount,
      expense_category,
      notes,
      group_id,
      created_at_date_time,
    } = req.body;
    let lenders = JSON.parse(req.body.lenders);  //Not typecasted
    let borrowers = JSON.parse(req.body.borrowers); //Not typecasted
    total_amount = Number(total_amount);
    const file = req.file;
    const user_id = req.user._id;


    // if (!description || !total_amount) {
    //   return next(new ErrorHandler("Missing required fields", 404));
    // }

    // let mediaData = {};
    // if (req.file) {
    //   const result = await uploadMedia(req.file.path, "expenseReceipts", next);
    //   if (result) {
    //     mediaData = {
    //       url: result.secure_url,
    //       public_id: result.public_id,
    //     };
    //   }
    // }

    // we will create new expense
    // if we are able to successfully create expense then we will do the below things
    // first we will update the wallets
    // then will change the group states
    // then will change the personal states

    const creator = {
      creator_id: user_id,
      amount: total_amount,
    };

    
    let media = null;
    if(file) {
      console.log("Uploading Media");
      const today = new Date().toISOString().split('T')[0];
      const mediaPath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const publicId = `expense/${uuidv4()}/${today}`;
      const result = await uploadMedia(mediaPath, "expenseMedia", publicId);
      if(!result) return next(new ErrorHandler("Error uplaoding photo"));
      media = {
        url: result.secure_url,
        public_id: result.public_id,
      };
      console.log("Media uploaded");
    }

    await handleExpenseRelations({
      lender_id: lenders[0].user_id,
      total_amount,
      wallet_id,
      group_id,
      borrowers,
    });

    const newExpense = await expense.create({
      description,
      lenders,
      borrowers,
      group_id,
      wallet_id,
      total_amount,
      expense_category,
      creator,
      notes,
      created_at_date_time,
      media
    });

    if (!newExpense)
      return next(new ErrorHandler("Cannot create new expense", 400));
    console.log("Expense created");
    res.status(201).json({
      message: "Expense created successfully",
      data: newExpense,
    });
  } catch (error) {
    console.log("Error creating new expense", error);
    next(error);
  }
};

//Updating an expense, changes group, wallet, user
export const updateExpense = async (req, res, next) => {
  try {
    console.log("Updating Expense");
    const { expense_id } = req.params;
    let updatedDetails = req.body;
    updatedDetails.total_amount = Number(updatedDetails.total_amount);
    if(!updatedDetails) {
      return res.status(200).json({
        message: "No details to update expense"
      });
    }
    if(updatedDetails.lenders) updatedDetails.lenders = JSON.parse(updatedDetails.lenders);
    if(updatedDetails.borrowers) updatedDetails.borrowers = JSON.parse(updatedDetails.borrowers);
    if(updatedDetails.total_amount) updatedDetails.total_amount = Number(updatedDetails.total_amount);
    // the updated details might contain
    // description,
    // lenders,
    // borrowers,
    // total_amount,
    // expense_category,
    // notes,
    // wallet_id,
    // media
    // create_at_date_time

    if (req.body.lenders && typeof req.body.lenders === "string") {
      req.body.lenders = JSON.parse(req.body.lenders);
  }
  if ( req.body.borrowers && typeof req.body.borrowers === "string") {
    req.body.borrowers = JSON.parse(req.body.borrowers);
}
    //inorder to update expense, first we will find the expense
    // then if members is not present in update then its alright
    // else we need to revert the earlier expense and add the new changes in it
    let existingExpense = await expense.findById(expense_id);
    if (!existingExpense) {
      return next(new ErrorHandler("Expense not found with the given id", 404));
    }

    existingExpense.total_amount = Number(existingExpense.total_amount);
    //cases with wallet - 
    //earlier there was a wallet and now wallet is removed
    //earlier there was no wallet and now wallet is added
    //earlier there was a wallet and now wallet is updated
    //no wallet update
    let newAmount = updatedDetails.total_amount !== undefined ? updatedDetails.total_amount : existingExpense.total_amount;
    if(updatedDetails.wallet_id !== undefined) {
      if(!sufficientBalance({id: updatedDetails.wallet_id, amount: newAmount})) return next(new ErrorHandler("Not Sufficient balances to update expense"));
    }

    if (
      updatedDetails.lenders !== undefined ||
      updatedDetails.borrowers !== undefined
    ) {
      await revertExpenseEffects(existingExpense);

      const updatedExpense = await expense.findByIdAndUpdate(
        expense_id,
        updatedDetails,
        { new: true, runValidators: true }
      );
      if (!updatedExpense)
        return next(
          new ErrorHandler(
            `Cannot update expense with id: ${existingExpense._id}`,
            400
          )
        );

       await handleExpenseRelations({
        lender_id: updatedExpense.lenders[0].user_id.toString(),
        total_amount: updatedExpense.total_amount,
        wallet_id: updatedExpense?.wallet_id?.toString(),
        group_id: updatedExpense?.group_id?.toString(),
        borrowers: updatedExpense.borrowers,
      });
      res.status(200).json({
        message : "Expense updated successfully",
        data : updatedExpense,
      });
      return;
    }

    const updatedExpense = await expense.findByIdAndUpdate(
      expense_id,
      updatedDetails,
      { new: true, runValidators: true }
    );
    if (!updatedExpense)
      return next(
        new ErrorHandler(
          `Cannot update expense with id: ${existingExpense._id}`,
          400
        )
      );
    console.log("Updated Expense");

    res.status(200).json({
      message : "Expense updated successfully",
      data : updatedExpense,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (E11000)
      return res.status(400).json({
        error:
          "An expense with this title already exists. Please choose a different name.",
      });
    }
    console.log("Error updating expense", error.message);
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    // find the expense
    // revert all changes
    // delete expense
    console.log("Deleting Expense");
    const { expense_id } = req.params;
    const curExpense = await expense.findById(expense_id);
    if (!curExpense)
      return next(
        new ErrorHandler(`Cannot delete expense with id: ${expense_id}`, 400)
      );
    console.log("Reverting Expense");
    await revertExpenseEffects(curExpense);
    const deletedExpense = await expense.findByIdAndDelete(expense_id);
    console.log("Deleted Expense");
    res.status(200).json({
      message: "Expense deleted successfully",
      data: deletedExpense,
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    next(error);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curExpense = await findExpenseById(id);

    res.status(200).json({
      message : "Expense fetched successfully",
      data : curExpense,
    });
  } catch (error) {
    console.error(`Error getting expense by Id: `, error);
    next(error);
  }
};

export const getUserPeriodExpenses = async (req, res, next) => {
  try {
    console.log("Fetch user period expenses");
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(
        new ErrorHandler("Please provide startDate and endDate", 400)
      );
    }

    // Convert to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include entire end day

    // Fetch expenses where user is involved
    const expenses = await findPeriodicExpenses({start, end, userId});
    console.log("Fetched user period expenses");
    res.status(200).json({
      message: "User period expenses fetched successfully",
      data :expenses,
    });
  } catch (error) {
    console.error("Error fetching user period expenses", error);
    next(error);
  }
};

export const getUserExpenses = async (req, res, next) => {
  try {
    console.log("Fetching user expenses");
    const userId = req.user.id;
    const { group_id } = req.query; // Optional Group ID

    const expenses = await findUserExpenses({userId, group_id});
    console.log("Fetched user expenses");
    res.status(200).json({
      message: "User expenses fetched successfully",
      data : expenses,
    });
  } catch (error) {
    console.error("Error fetching user expenses", error);
    next(error);
  }
};

export const getCustomExpenses = async (req, res, next) => {
  try {
    console.log("Fetching custom expenses");
    const {
      description,
      lender_id,
      borrower_id,
      group_id,
      wallet_id,
      min_amount,
      max_amount,
      category,
    } = req.query;

    const expenses = await findCustomExpenses({description, lender_id, borrower_id, group_id, wallet_id, min_amount, max_amount, category});
    console.log("Fetched user expenses");
    res.status(200).json({
      message : "Custom expenses fetched successfully",
      data : expenses,
    });
  } catch (error) {
    console.error("Error fetching custom expenses", error);
    next(error);
  }
};
 
// getExpenseByAutoWalletId

