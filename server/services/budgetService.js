import budget from "../models/budget.js";

export const findBudgetById = async (id) => {
    const currBudget = await budget.findById(id);
    if (!currBudget) {
        throw new Error("Budget with this id doesn't exist");
    }
    return currBudget;
};

export const findBudgetByCategory = async (category, user_id) => {
    // First, try to find the budget by the specified category
    let currBudget = await budget.findOne({ budget_category: category, user_id});

    // If no budget is found, check for the "general" category
    if (!currBudget) {
        currBudget = await budget.findOne({ budget_category: "general", user_id});
    }

    // If still no budget is found, return null
    return currBudget || null;
};

export const findUserBudgets = async (id) => {
    const budgets = await budget.find({user_id: id});
    if(!budgets) throw new Error("Error fetching user budgets");
    return budgets;
}