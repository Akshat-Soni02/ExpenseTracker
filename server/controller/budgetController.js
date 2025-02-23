import budget from "../models/budget.js";
import ErrorHandler from "../middlewares/error.js";
import user from "../models/user.js";
import { uploadMedia } from "./cloudinaryController.js";

export const createBudget = async (req, res, next) => {
    try {
        const { budget_title, amount, budget_category, period } = req.body;
        const user_id = req.user._id; 

        if (!budget_title || !amount || !user_id) {
            return next(new ErrorHandler("Budget title, amount, and user ID are required", 400));
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
            success: true,
            message: "Budget created successfully",
            budget: newBudget,
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
    
        // Find budget by ID and ensure it belongs to the authenticated user
        const existingBudget = await budget.findbyId(id);
    
        if (!existingBudget) {
            return next(new ErrorHandler("Budget not found", 404));
        }
        if (existingBudget.creator_id.toString() !== req.user._id.toString()) {
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
            success: true,
            message: "Budget updated successfully",
            existingBudget,
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