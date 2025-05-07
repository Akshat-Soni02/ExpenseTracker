import expense from "../models/expense.js";
import personalTransaction from "../models/personalTransaction.js";
import {getBudgetPredictionResponse} from '../services/budgetPredictionService.js';

export const predictBudgetHandler  = async (req, res, next) => {
    try{
        console.log("Predicting budget");
        const id = req.user._id;
        const {transaction_category} = req.body;
        console.log("Transaction Category:", transaction_category);
        const filteredExpenses = [];

        // 2. Fetch Personal Transactions of type "expense"
        const personalTransactions = await personalTransaction.find(
          { transaction_type: 'expense', user_id: id ,...(transaction_category && { transaction_category })},
          'created_at_date_time amount'
        );
    
        const formattedPersonalTransactions = personalTransactions.map(trx => ({
          Date: trx.created_at_date_time,
          Amount: trx.amount,
        }));
    
        // 3. Combine both
        const data = [...formattedPersonalTransactions];
        console.log("Data:",data);
        const budgetPredictionResponse = await getBudgetPredictionResponse(data);
        console.log("Budget Prediction Response:", budgetPredictionResponse);
        res.status(200).json(budgetPredictionResponse);

    }
    catch(error){
        console.log("Error predicting budget", error);
        next(error);
    }


}
