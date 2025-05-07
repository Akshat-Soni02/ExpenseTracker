import budget from "../models/budget.js";

export const findBudgetById = async (id) => {
    console.log("Finding Budget by Id");
    if(!id) {
        console.log(`Budget id is undefined: ${id}`);
        throw new Error(`Budget id is undefined: ${id}`);
    }
    const currBudget = await budget.findById(id);
    return currBudget;
};

export const findBudgetByCategory = async (category, user_id) => {
    // First, try to find the budget by the specified category
    console.log("Finding Budget by Category");
    if(!category) {
        console.log(`Budget category is undefined: ${category}`);
        throw new Error(`Budget category is undefined: ${category}`);
    }
    if(!user_id) {
        console.log(`User id is undefined: ${user_id}`);
        throw new Error(`User id is undefined: ${user_id}`);
    }
    let currBudget = await budget.findOne({ budget_category: category, user_id});


    return currBudget || null;
};

export const findUserBudgets = async (id) => {
    console.log("Finding User Budgets");
    if(!id) {
        console.log(`User id is undefined: ${id}`);
        throw new Error(`User id is undefined: ${id}`);
    }
    const budgets = await budget.find({user_id: id});
    return budgets;
}