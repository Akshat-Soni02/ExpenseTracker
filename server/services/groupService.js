import group from "../models/group.js";

export const formatMembers = (memberIds) => {
    return memberIds.map((memberId, index) => ({
        member_id: memberId,
        other_members: memberIds
        .filter((otherId) => otherId !== memberId)
        .map((otherMemberId) => ({
            other_member_id: otherMemberId,
            amount: 0,
            exchange_status: "settled",
        })),
    }));
};

export const findGroupById = async (id) => {
    const curGroup = await group.findById(id);
    if (!curGroup) return null;
    return curGroup;
}

export const distributeAmount = async ({ groupId, giverId, borrowers }) => {
    // console.log("In distributeAmount");
    let currGroup = null;
    
    // console.log(groupId);
    try{
        currGroup = await group.findById(groupId).select("members");
    }
    catch(err){
        console.log("Error finding group",err);
    }
    // console.log("group", currGroup);
    // console.log("group details", currGroup);
    if (!currGroup) throw new Error("No group with the given ID");
    // console.log("Group found");
    for (const { user_id: borrowerId, amount } of borrowers) {
        // console.log("In distribute borrower loop");
        const lender = currGroup.members.find(m => m.member_id.toString() === giverId);
        // console.log("lender", lender);
        // console.log("borrowerId", borrowerId.toString);
        // console.log("Lender found");
        if (lender) {
            // console.log("Updating lender");
            updateTransaction(lender, borrowerId.toString(), amount, "borrowed"); //settled
            // console.log("Lender updated");
        }

        const borrower = currGroup.members.find(m => m.member_id.toString() === borrowerId);
        // console.log("Borrower found");
        if (borrower) {
            // console.log("Updating borrower");
            updateTransaction(borrower, giverId, amount, "lended"); //settled
            // console.log("Borrower updated");    
        }
    }
    // console.log("Amount distributed");
    await currGroup.save();
};

const updateTransaction = (member, otherMemberId, amount, type) => {
    // console.log("In updateTransaction");
    const transaction = member.other_members.find(
        t => t.other_member_id.toString() === otherMemberId
    );
    if (!transaction) return;

    if (transaction.exchange_status === type) {
        transaction.amount += amount;
    } else if (transaction.exchange_status === "settled") {
        transaction.amount = amount;
        transaction.exchange_status = type;
    } else {
        if (transaction.amount === amount) {
            transaction.amount = 0;
            transaction.exchange_status = "settled";
        } else if (transaction.amount < amount) {
            transaction.amount = amount - transaction.amount;
            transaction.exchange_status = type;
        } else {
            transaction.amount -= amount;
        }
    }
    // console.log("Transaction updated");
};
