import ErrorHandler from "../middlewares/error.js";
import personalTransaction from "../models/personalTransaction.js";
import expense from "../models/expense.js";

export const getMonthlySpending = async (req, res, next) => {
    try{
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        console.log("Inside getMonthlySpending");
        const id = req.user._id; 
        if(!id){
            return next(new ErrorHandler("User not found", 404));
        }
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const transactions = await personalTransaction.find({
            user_id: id,
            transaction_type: "expense",
            created_at_date_time: { $gte: sixMonthsAgo }
        });

        const expenses = await expense.find({
            lenders: {
              $elemMatch: { user_id: id }
            },
            created_at_date_time: { $gte: sixMonthsAgo }
        });
        
        const monthlySpending = {};

        const getMonthKey = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        transactions?.forEach(txn => {
            const key = getMonthKey(txn.created_at_date_time);
            monthlySpending[key] = (monthlySpending[key] || 0) + txn.amount;
        });

        expenses?.forEach(exp => {
            const key = getMonthKey(exp.created_at_date_time);
            const lender = exp.lenders.find(l => l.user_id.toString() === id.toString());
            if (lender) {
                monthlySpending[key] = (monthlySpending[key] || 0) + lender.amount;
            }
        });

        const monthlySpendingArray = Object.entries(monthlySpending).map(([month, amount]) => ({
            month,
            amount
        }));
        monthlySpendingArray.sort((a, b) => a.month.localeCompare(b.month));

        // console.log("Monthly Spending:", monthlySpendingArray);

        // console.log("Fetched transactions", transactions);
        // console.log("Fetched expenses", expenses);
        res.status(200).json({
            data: monthlySpendingArray
        });
    }
    catch (error) {
        console.log("Error creating new expense", error);
        next(error);
    }
}


export const getCategoricalSpending = async (req, res, next) => {
    try{
        const categories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "General"];

        console.log("Inside getCategoricalSpending");
        const id = req.user._id; 
        if(!id){
            return next(new ErrorHandler("User not found", 404));
        }
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const transactions = await personalTransaction.find({
            user_id: id,
            transaction_type: "expense",
            created_at_date_time: {
                $gte: startOfMonth,
                $lt: startOfNextMonth
            }
        });

        const expenses = await expense.find({
            lenders: {
                $elemMatch: { user_id: id }
            },
            created_at_date_time: {
                $gte: startOfMonth,
                $lt: startOfNextMonth
            }
        });

        const categoryTotals = {};
        categories.forEach(cat => categoryTotals[cat] = 0);
        transactions.forEach(txn => {
            const category = categories.includes(txn.transaction_category) ? txn.transaction_category : "General";
            categoryTotals[category] += txn.amount;
        });
        
        // 4. Group Shared Expenses (lender part) by category
        expenses.forEach(exp => {
            const category = categories.includes(exp.expense_category) ? exp.expense_category : "General";
            const lender = exp.lenders.find(l => l.user_id.toString() === id.toString());
            if (lender) {
                categoryTotals[category] += lender.amount;
            }
        });
        
        
        res.status(200).json({
            data: categoryTotals
        });
    }
    catch (error) {
        console.log("Error creating new expense", error);
        next(error);
    }
}