import budget from "../models/budget.js";

export const findBudgetById = async (id) => {
    const currBudget = await budget.findById(id);
    if (!currBudget) {
        throw new Error("Budget with this id doesn't exist");
    }
    return currBudget;
};
