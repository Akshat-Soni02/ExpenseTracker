import budget from "../models/budget.js";
import ErrorHandler from "../middlewares/error.js";
// import { uploadMedia } from "./cloudinaryController.js";
import { findBudgetById } from "../services/budgetService.js";



export const createBudget = async (req, res, next) => {
    try {
        const { budget_title, amount, budget_category, period } = req.body;
        const user_id = req.user._id; 

        if (!budget_title || !amount) {
            return next(new ErrorHandler("Budget title and amount are required", 404));
        }

        // Creating new budget entry
        const newBudget = await budget.create({
            budget_title,
            amount,
            budget_category,
            period,
            user_id,
        });

        res.status(201).json({
            message : "Budget created successfully",
            data : newBudget,
        });
    }
    catch(error){
        console.error("Error creating budget:", error);
        next(error);
    }
}

export const updateBudget = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { budget_title, amount, budget_category, period } = req.body;
        const user_id = req.user._id; 
    
        const existingBudget = await findBudgetById(id);
        if (!existingBudget) {
            return next(new ErrorHandler("Budget not found", 404));
        }
        if (existingBudget.user_id.toString() !== user_id.toString()) {
            return next(new ErrorHandler("Unauthorized to update this budget", 403));
        }
    
        // Update only provided fields
        if (budget_title) existingBudget.budget_title = budget_title;
        if (amount) existingBudget.amount = amount;
        if (budget_category) existingBudget.budget_category = budget_category;
        if (period) existingBudget.period = period;
    
        // Save updated budget
        await existingBudget.save();
    
        res.status(200).json({
            message : "Budget updated successfully",
            data : existingBudget,
        });
        } 
        catch (error) {
            if (error.code === 11000) {
                // Duplicate key error (E11000)
                return res.status(400).json({
                error:
                    "A budget with this title already exists. Please choose a different name.",
                });
            }
            console.error("Error updating budget:", error);
            next(error);
        }
    };

    export const deleteBudget = async (req, res, next) => {
        try{
            const { id } = req.params;
            const user_id = req.user._id; 
            console.log("delete budget is called.....")

            const existingBudget = await findBudgetById(id);
            if (!existingBudget) {
                return next(new ErrorHandler("Budget not found", 404));
            }
    
            if (existingBudget.user_id.toString() !== user_id.toString()) {
                return next(new ErrorHandler("Unauthorized to delete this budget", 403));
            }
            const deletedBudget = await existingBudget.deleteOne();
    
            res.status(200).json({
                message: "Budget deleted successfully",
                data : deletedBudget,
            });
        }
        catch(error){
            console.error("Error deleting budget:", error);
            next(error);
        }
    }
    

    export const getBudgetById = async (req, res, next) =>{
        try{
            const {id} = req.params;
            const user_id = req.user._id; 
            const existingBudget = await findBudgetById(id);
            if (!existingBudget) {
                return next(new ErrorHandler("Budget not found", 404));
            }
        
            // Check if the budget has been "soft deleted"
            // if (existingBudget.budget_title === "Deleted_Budget") {
            //     return next(new ErrorHandler("This budget has been deleted", 404));
            // }
            
            if (existingBudget.user_id.toString() !== user_id.toString()) {
                return next(new ErrorHandler("Unauthorized to update this budget", 403));
            }
    
            res.status(200).json({
                message : "Budget found successfully",
                data : existingBudget,
            });
        }
        catch(error){
            console.error("Error getting budget by Id:", error);
            next(error);
        }
    }
    