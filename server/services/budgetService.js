import budget from "../models/budget.js";

export const findBudgetById = async (id) => {
    const currBudget = await budget.findById(id);
    if (!currBudget) {
        throw new Error("Budget with this id doesn't exist");
    }
    return currBudget;
};

export const findUserBudgets = async (id) => {
    const budgets = await budget.find({user_id: id});
    if(!budgets) throw new Error("Error fetching user budgets");
    return budgets;
}
