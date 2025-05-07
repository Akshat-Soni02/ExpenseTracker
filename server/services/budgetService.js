import budget from "../models/budget.js";

export const findBudgetById = async (id) => {
    try {
        console.log(`Finding Budget by Id: ${id}`);
        if(!id) {
            console.log(`Budget id is undefined: ${id}`);
            throw new Error(`Budget id is undefined`);
        }

        const currBudget = await budget.findById(id);
        return currBudget;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const findBudgetByCategory = async (category, user_id) => {
    try {
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
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const findUserBudgets = async (id) => {
    try {
        console.log("Finding User Budgets");

        if(!id) {
            console.log(`User id is undefined: ${id}`);
            throw new Error(`User id is undefined: ${id}`);
        }

        const budgets = await budget.find({user_id: id});
        return budgets;
    } catch (error) {
        console.log(error);
        throw error;
    }
}