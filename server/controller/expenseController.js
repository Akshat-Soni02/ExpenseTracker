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
    let {
      description,
      lenders,
      borrowers,
      wallet_id,
      total_amount,
      expense_category,
      notes,
      group_id,
      created_at_date_time,
      filePath
    } = req.body;
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
    if(filePath) {
      const timeStamp = Date.now();
      const publicId = `expense/${uuidv4()}/${timeStamp}`;
      const result = await uploadMedia(filePath, "expenseMedia", publicId);
      if(!result) return next(new ErrorHandler("Error uplaoding photo"));
      media = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    }

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

    await handleExpenseRelations({
      lender_id: lenders[0].user_id,
      total_amount,
      wallet_id,
      group_id,
      borrowers,
    });


    res.status(201).json({
      message: "Expense created successfully",
      data: newExpense,
    });
  } catch (error) {
    console.log("Error creating new expense");
    next(error);
  }
};

//Updating an expense, changes group, wallet, user
export const updateExpense = async (req, res, next) => {
  try {
    const { expense_id } = req.params;
    const updatedDetails = req.body;
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

    //inorder to update expense, first we will find the expense
    // then if members is not present in update then its alright
    // else we need to revert the earlier expense and add the new changes in it
    const existingExpense = await expense.findById(expense_id);
    if (!existingExpense) {
      return next(new ErrorHandler("Expense not found with the given id", 404));
    }

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
        wallet_id: updatedExpense?.wallet_id.toString(),
        group_id: updatedExpense?.group_id.toString(),
        borrowers: updatedExpense.borrowers,
      });
      res.status(200).json({
        message : "Expense updated successfully",
        data : updatedExpense,
      });
      return;
    }

    // if(updatedDetails.filePath) {
    //   const timeStamp = Date.now();
    //   const publicId = `expense/${uuidv4()}/${timeStamp}`;
    //   const result = await uploadMedia(updatedDetails.filePath, "expenseMedia", publicId);
    //   if(!result) return next(new ErrorHandler("Error uplaoding photo"));
    //   media = {
    //     url: result.secure_url,
    //     public_id: result.public_id,
    //   };
    // }

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
    console.log("Error updaing expense", error.message);
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    // find the expense
    // revert all changes
    // delete expense

    const { expense_id } = req.params;
    const curExpense = await expense.findById(expense_id);
    if (!curExpense)
      return next(
        new ErrorHandler(`Cannot delete expense with id: ${expense_id}`, 400)
      );

    await revertExpenseEffects(curExpense);
    const deletedExpense = await expense.findByIdAndDelete(expense_id);

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
  console.log("getting expense...........");
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
    const userId = req.user.id;
    const { group_id } = req.query; // Optional Group ID

    const expenses = await findUserExpenses({userId, group_id});

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

