import user from "../models/user.js";

export const findUserById = async(id) => {
    const curUser = await user.findById(id);
    if(!curUser) throw new Error("No user with given id exists");
    return curUser;
}

export const updateFiendlyExchangeStatesOnLending = async ({lender_id, borrowers}) => {
    const activeUser = await findUserById(lender_id);
    if(!activeUser) throw new Error("No user found to update the friendly states");
    
    const lended = activeUser.lended;
    const borrowed = activeUser.borrowed;
    const settles = activeUser.settled;

    for (const { user_id, amount } of borrowers) {
        const prevBorrower = lended.find(borrower => borrower.borrower_id.toString() === user_id);
        const prevLender = borrowed.find(lender => lender.lender_id.toString() === user_id);
        const prevSettle = settles.find(settle => settle.user_id.toString() === user_id);
        if(prevBorrower) {
            prevBorrower.amount = prevBorrower.amount + amount;
            const prevBorrowerProfile = await findUserById(prevBorrower.borrower_id);
            prevBorrowerProfile.borrowed.forEach((lender) => {
                if (lender.lender_id === lender_id) {
                    lender.amount += amount;
                }
            });
        } else if(prevLender) {
            const prevLenderId = prevLender.lender_id;
            if(prevLender.amount > amount) {
                prevLender.amount -= amount;
                const prevLenderProfile = await findUserById(prevLenderId);
                prevLenderProfile.lended.forEach((borrower) => {
                    if(borrower.borrower_id === lender_id) {
                        borrower.amount = borrower.amount - amount;
                    }
                });
            }
            else if(prevLender.amount === amount) {
                borrowed = borrowed.filter((lender) => lender.lender_id !== prevLenderId);
                settles.push({user_id, amount: 0});
                const prevLenderProfile = await findUserById(prevLenderId);
                prevLenderProfile.lended = prevLenderProfile.lended.filter((borrower) => borrower.borrower_id !== lender_id);
                prevLenderProfile.settled.push({user_id: lender_id, amount: 0});
            } 
            // else 
        } else if (prevSettle) {
            const prevSettleId = prevSettle.user_id;
            settles = settles.filter((settle) => settle.user_id !== prevSettleId);
            lended.push({borrower_id: prevSettleId, amount});
            const prevSettleProfile = await findUserById(prevSettleId);
            prevSettleProfile.settled = prevSettleProfile.settled.filter((settle) => settle.user_id !== lender_id);
            prevSettleProfile.borrowed.push({lender_id, amount});
        } else {
            lended.push({borrower_id: user_id, amount});
            const newBorrowerProfile = await findUserById(user_id);
            newBorrowerProfile.borrowed.push({lender_id, amount});
        }
    }
}