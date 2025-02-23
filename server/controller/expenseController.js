import expense from "../models/expense.js";
import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { uploadMedia } from "./cloudinaryController.js";

export const createExpense = async (req, res, next) => {
    try {
      const { description, lenders, borrowers, wallet_id, total_amount, expense_category, notes, group_id } = req.body;
        
      if (!description || !wallet_id || !total_amount) {
        return next(new ErrorHandler("Missing required fields", 400));
      }
  
      let mediaData = {};
      if (req.file) {
        const result = await uploadMedia(req.file.path, "expenseReceipts", next);
        if (result) {
          mediaData = {
            url: result.secure_url,
            public_id: result.public_id,
          };
        }
      }
  
      const newExpense = await expense.create({
        description,
        lenders,
        borrowers,
        wallet_id,
        total_amount,
        expense_category,
        notes,
        group_id,
        media: mediaData,
        creator_id: req.user._id,
      });
  
      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        expense: newExpense,
      });
    } catch (error) {
      next(error);
    }
  };
  

export const updateExpense = async (req, res, next) => {
    try {
        const { expense_id } = req.params;
        const { description, lenders, borrowers, total_amount, expense_category, notes } = req.body;

        const existingExpense = await expense.findById(expense_id);
        if (!existingExpense) {
            return next(new ErrorHandler("Expense not found", 404));
        }

        if (existingExpense.creator_id.toString() !== req.user._id.toString()) {
            return next(new ErrorHandler("Unauthorized to update this expense", 403));
        }

        if (description) existingExpense.description = description;
        if (lenders) existingExpense.lenders = lenders;
        if (borrowers) existingExpense.borrowers = borrowers;
        if (total_amount) existingExpense.total_amount = total_amount;
        if (expense_category) existingExpense.expense_category = expense_category;
        if (notes) existingExpense.notes = notes;

        if (req.file) {
            const result = await uploadMedia(req.file.path, "expenseReceipts", next);
            if (result) {
                existingExpense.media = {
                url: result.secure_url,
                public_id: result.public_id,
                };
            }
        }

        await existingExpense.save();

        res.status(200).json({
        success: true,
        message: "Expense updated successfully",
        expense: existingExpense,
        });
    }
    catch (error) {
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
}

export const deleteExpense = async (req, res, next) => {
    try{
        // const { expense_id } = req.params;

        // const existingExpense = await expense.findById(expense_id);
        // if (!existingExpense) {
        //     return next(new ErrorHandler("Expense not found", 404));
        // }

        // if (existingExpense.creator_id.toString() !== req.user._id.toString()) {
        //     return next(new ErrorHandler("Unauthorized to delete this expense", 403));
        // }
        // await existingExpense.deleteOne();

        // res.status(200).json({
        //     success: true,
        //     message: "Expense deleted successfully",
        // });
       

        const { expense_id } = req.params;

        const deletedExpense = await expense.findByIdAndUpdate(
            expense_id,
            { description: "Deleted_Expense" }, 
            {
                new: true,
                runValidators: true,
            }
        );

        if (!deletedExpense) {
            return next(new ErrorHandler("Invalid expense ID, unable to delete", 404));
        }

        res.status(200).json({
            success: true,
            expense: deletedExpense,
        });
    }
    catch(error){
        console.error("Error deleting expense:", error);
        next(error);
    }
}


export const getExpenseById = async (req, res, next) =>{
    try{
        const {id} = req.params;
        const foundExpense = await expense.findById(id);
        if (!foundExpense) {
            return next(new ErrorHandler("Expense not found", 404));
        }
    
        // Check if the expense has been "soft deleted"
        if (foundExpense.description === "Deleted_Expense") {
            return next(new ErrorHandler("This expense has been deleted", 404));
        }
        const userId = req.user._id;

        const isInvolved =
        foundExpense.creator_id.toString() === userId ||
        foundExpense.lenders.some((l) => l.user_id.toString() === userId) ||
        foundExpense.borrowers.some((b) => b.user_id.toString() === userId);

        if (!isInvolved) {
            return next(new ErrorHandler("You are not authorized to view this expense", 403));
        }

        res.status(200).json({
            success: true,
            expense: foundExpense,
        });
    }
    catch(error){
        console.error("Error getting expense by Id:", error);
        next(error);
    }
}

export const getUserPeriodExpenses = async (req, res, next) => {
    try{
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return next(new ErrorHandler("Please provide startDate and endDate", 400));
        }

        // Convert to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end day

        // Fetch expenses where user is involved
        const expenses = await expense.find({
            $or: [
                { creator_id: userId },
                { "lenders.user_id": userId },
                { "borrowers.user_id": userId },
            ],
            created_at_date_time: { $gte: start, $lte: end },
        }).sort({ created_at_date_time: -1 }); // Sort by most recent

        res.status(200).json({
            success: true,
            expenses,
        });
    }
    catch(error){
        console.error("Error fetching user period expenses", error);
        next(error);
    }
}

export const getUserExpenses = async (req, res, next) => {
    try{
        const userId = req.user.id;
        const { group_id } = req.query; // Optional Group ID

        let filter = {
            $or: [
                { creator_id: userId },
                { "lenders.user_id": userId },
                { "borrowers.user_id": userId },
            ],
        };

        if (group_id) {
            filter.group_id = group_id; // Filter by group if provided
        }

        const expenses = await Expense.find(filter).sort({
            created_at_date_time: -1,
        });

        res.status(200).json({
            success: true,
            expenses,
        });
    }
    catch(error){
        console.error("Error fetching user expenses", error);
        next(error);
    }
}

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

    const expenses = await expense.find(filter).sort({ created_at_date_time: -1 });

    res.status(200).json({
      success: true,
      expenses,
    });
  } catch (error) {
    console.error("Error fetching custom expenses", error);
    next(error);
  }
};


// getExpenseByAutoWalletId