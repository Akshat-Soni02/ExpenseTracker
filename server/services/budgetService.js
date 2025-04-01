import budget from "../models/budget.js";

export const findBudgetById = async (id) => {
    console.log("Finding Budget by Id");
    const currBudget = await budget.findById(id);
    if (!currBudget) {
        throw new Error("Budget with this id doesn't exist");
    }
    console.log("Budget Found");
    return currBudget;
};

export const findBudgetByCategory = async (category, user_id) => {
    // First, try to find the budget by the specified category
    console.log("Finding Budget by Category");
    let currBudget = await budget.findOne({ budget_category: category, user_id});

    // If no budget is found, check for the "general" category
    if (!currBudget) {
        currBudget = await budget.findOne({ budget_category: "general", user_id});
    }
    console.log("Budget Found");
    // If still no budget is found, return null
    return currBudget || null;
};

export const findUserBudgets = async (id) => {
    console.log("Finding User Budgets");
    const budgets = await budget.find({user_id: id});
    if(!budgets) throw new Error("Error fetching user budgets");
    console.log("User Budgets Found");
    return budgets;
}