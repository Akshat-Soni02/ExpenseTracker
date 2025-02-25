import expense from "../models/expense.js";
import wallet from "../models/wallet.js";
import group from "../models/group.js";
import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { uploadMedia } from "./cloudinaryController.js";


//creating an expense means changing group states, wallet states also changing personal states with other people
export const createExpense = async (req, res, next) => {
    try {
      let { description, lenders, borrowers, wallet_id, total_amount, expense_category, notes, group_id,creator } = req.body;
        
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

    //   //Update Wallet
    //   if(wallet_id){
    //     const currWallet = await wallet.findById(wallet_id).select("amount");
    //     if(total_amount>currWallet.amount){
    //       return next(new ErrorHandler("Insufficient Balance in the wallet.", 402));
    //     }
    //     currWallet.amount = currWallet.amount - total_amount;
    //     await currWallet.save();
    //   }

    //   //Update Group
    //   if(group_id){
    //     const lender_id =  Object.keys(lenders)[0];
    //     const currGroup = await group.findById(group_id).select("members");
    //     for(const [borrower_id,amount] of Object.entries(borrowers)){
    //       const member = currGroup.members.find(m => m.member_id.toString() === lender_id);
    //       if (member) {
    //         const transaction = member.other_members.find(
    //           t => t.other_member_id.toString() === borrower_id
    //         );
    //         if (transaction) {
    //           if(transaction.exchange_status === "lended"){
    //             transaction.amount = transaction.amount + amount;
    //           }
    //           else if(transaction.exchange_status === "settled"){
    //             transaction.amount = amount;
    //             transaction.exchange_status = "lended";
    //           }
    //           else{
    //             if(transaction.amount==amount){
    //               transaction.amount = 0;
    //               transaction.exchange_status = "settled";
    //             }
    //             else if(transaction.amount<amount){
    //               transaction.amount = amount - transaction.amount;
    //               transaction.exchange_status = "lended";
    //             }
    //             else{
    //               transaction.amount = transaction.amount - amount;
    //             }
    //           }
               
    //         }
    //       }
    //       const otherMember = currGroup.members.find(m => m.member_id.toString() === borrower_id);
    //       if (otherMember) {
    //         const transaction = otherMember.other_members.find(
    //           t => t.other_member_id.toString() === lender_id
    //         );
    //         if (transaction) {
    //           if(transaction.exchange_status === "borrowed"){
    //             transaction.amount = transaction.amount + amount;
    //           }
    //           else if(transaction.exchange_status === "settled"){
    //             transaction.amount = amount;
    //             transaction.exchange_status = "borrowed";
    //           }
    //           else{
    //             if(transaction.amount==amount){
    //               transaction.amount = 0;
    //               transaction.exchange_status = "settled";
    //             }
    //             else if(transaction.amount<amount){
    //               transaction.amount = amount - transaction.amount;
    //               transaction.exchange_status = "borrowed";
    //             }
    //             else{
    //               transaction.amount = transaction.amount - amount;
    //             }
    //           } 
    //         }
    //       }
    //     }
    //     currGroup.save();  
    // }

    //   //Update User
    //   const currUser = await user.findById(req.user._id);
      
    //   //Update lenders
    //   const lendedMap = new Map(currUser.lended.map(b => [b.borrower_id.toString(), b.amount]));

    //   // Update existing borrowers and add new ones
    //   for (const [borrowerId, amount] of Object.entries(borrowers)) {
    //     if (lendedMap.has(borrowerId)) {
    //       lendedMap.set(borrowerId, lendedMap.get(borrowerId) + amount);
    //     } else {
    //       lendedMap.set(borrowerId, amount);
    //     }
    //   }
  
    //   // Convert Map back to an array of objects
    //   const updatedLended = Array.from(lendedMap, ([borrower_id, amount]) => ({
    //     borrower_id,
    //     amount,
    //   }));

    //   await user.updateOne({ _id: req.user._id }, { $set: { lended: updatedLended } });


      
      // // update borrowers
      // const lender_id =  Object.keys(lenders)[0];
      // for (const [borrowerId, amount] of Object.entries(borrowers)) {
      //   const currUser = await user.findById(borrowerId);
      //   const borrowedMap = new Map(currUser.borrowed.map(b => [b.lender_id.toString(), b.amount]));
      //   if (borrowedMap.has( lender_id)) {
      //     borrowedMap.set(lender_id, borrowedMap.get(lender_id) + amount);
      //   } else {
      //     borrowedMap.set(lender_id, amount);
      //   }
      //   const updatedBorrowed = Array.from(borrowedMap, ([lender_id, amount]) => ({
      //     lender_id,
      //     amount,
      //   }));
      //   await user.updateOne({ _id: borrowerId }, { $set: { borrowed: updatedBorrowed } });
      // }

  
      const newExpense = await expense.create({
        description,
        lenders,
        borrowers,
        group_id,
        wallet_id,
        media: null,
        total_amount,
        expense_category,
        creator,
        notes,
        
        
      });
  
      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        expense: newExpense,
      });
    } catch (error) {
      console.log("here");
      next(error);
    }
  };
  
//Updating an expense, changes group, wallet, user
export const updateExpense = async (req, res, next) => {
    try {
        const { expense_id } = req.params;
        const { description, lenders, borrowers, total_amount, expense_category, notes, wallet_id } = req.body;

        const existingExpense = await expense.findById(expense_id);
        // if (!existingExpense) {
        //     return next(new ErrorHandler("Expense not found", 404));
        // }

        // if (existingExpense.creator_id.toString() !== req.user._id.toString()) {
        //     return next(new ErrorHandler("Unauthorized to update this expense", 403));
        // }


        // if(wallet_id){
        //   const currWallet = await wallet.findById(wallet_id).select("amount");
        //   if(existingExpense.total_amount>currWallet.amount){
        //     return next(new ErrorHandler("Insufficient Balance in the wallet.", 402));
        //   }
        //   const prevWallet = await wallet.findById(existingExpense.wallet_id).select("amount");
        //   prevWallet.amount = prevWallet.amount + existingExpense.total_amount;
        //   await prevWallet.save();
        //   currWallet.amount = currWallet.amount - existingExpense.total_amount;
        //   await currWallet.save();
        //   existingExpense.wallet_id = wallet_id;
        // }




        // if (description) existingExpense.description = description;
        
        // if (lenders) existingExpense.lenders = lenders;
        
        // if (borrowers) {



          if(existingExpense.group_id){
            // const lender_id =  Object.keys(existingExpense.lenders)[0];
            // const currGroup = await group.findById(existingExpense.group_id).select("members");
            for(const [borrower_id,amount] of Object.entries(borrowers)){
              const borrower = existingExpense.borrowers.find(b => b.user_id.toString() === borrower_id);
              console.log(borrower);
              
              // const member = currGroup.members.find(m => m.member_id.toString() === lender_id);
              // if (member) {
              //   const transaction = member.other_members.find(
              //     t => t.other_member_id.toString() === borrower_id
              //   );
              //   if (transaction) {
              //     if(transaction.exchange_status === "lended"){
              //       transaction.amount = transaction.amount + amount;
              //     }
              //     else if(transaction.exchange_status === "settled"){
              //       transaction.amount = amount;
              //       transaction.exchange_status = "lended";
              //     }
              //     else{
              //       if(transaction.amount==amount){
              //         transaction.amount = 0;
              //         transaction.exchange_status = "settled";
              //       }
              //       else if(transaction.amount<amount){
              //         transaction.amount = amount - transaction.amount;
              //         transaction.exchange_status = "lended";
              //       }
              //       else{
              //         transaction.amount = transaction.amount - amount;
              //       }
              //     }
                   
              //   }
              // }
              // const otherMember = currGroup.members.find(m => m.member_id.toString() === borrower_id);
              // if (otherMember) {
              //   const transaction = otherMember.other_members.find(
              //     t => t.other_member_id.toString() === lender_id
              //   );
              //   if (transaction) {
              //     if(transaction.exchange_status === "borrowed"){
              //       transaction.amount = transaction.amount + amount;
              //     }
              //     else if(transaction.exchange_status === "settled"){
              //       transaction.amount = amount;
              //       transaction.exchange_status = "borrowed";
              //     }
              //     else{
              //       if(transaction.amount==amount){
              //         transaction.amount = 0;
              //         transaction.exchange_status = "settled";
              //       }
              //       else if(transaction.amount<amount){
              //         transaction.amount = amount - transaction.amount;
              //         transaction.exchange_status = "borrowed";
              //       }
              //       else{
              //         transaction.amount = transaction.amount - amount;
              //       }
              //     } 
              //   }
              // }
            }
        //     currGroup.save();  
          }
        //   existingExpense.borrowers = borrowers
        
        // };
        
        // if (total_amount) {
        //   const currWallet = await wallet.findById(existingExpense.wallet_id).select("amount");
        //   if(total_amount-existingExpense.total_amount>currWallet.amount){
        //     return next(new ErrorHandler("Insufficient Balance in the wallet.", 402));
        //   }
        //   currWallet.amount = currWallet.amount + existingExpense.total_amount - total_amount;
        //   await currWallet.save();
        //   existingExpense.total_amount = total_amount;
        // }
        
        // if (expense_category) existingExpense.expense_category = expense_category;
        
        // if (notes) existingExpense.notes = notes;

        // // if (req.file) {
        // //     const result = await uploadMedia(req.file.path, "expenseReceipts", next);
        // //     if (result) {
        // //         existingExpense.media = {
        // //         url: result.secure_url,
        // //         public_id: result.public_id,
        // //         };
        // //     }
        // // }

        // await existingExpense.save();

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