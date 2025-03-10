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

export const findUserGroups = async (id) => {
    const groups = await group.find({"members.member_id": id});
    if(!groups) throw new Error("Error finding user groups");
    return groups;
}

export const distributeAmount = async ({ groupId, giverId, borrowers }) => {
    let currGroup = null;
    
    try{
        currGroup = await group.findById(groupId).select("members");
    }
    catch(err){
        console.log("Error finding group",err);
    }

    if (!currGroup) throw new Error("No group with the given ID");

    for (const { user_id: borrowerId, amount } of borrowers) {
        const lender = currGroup.members.find(m => m.member_id.toString() === giverId);
        if (lender) {
            const res = updateTransaction(lender, borrowerId.toString(), amount, "borrowed"); //settled
            if(!res)
            {
                // return error 
            }

        }

        const borrower = currGroup.members.find(m => m.member_id.toString() === borrowerId);
        if (borrower) {
            updateTransaction(borrower, giverId, amount, "lended"); //settled
        }
    }
    await currGroup.save();
};

const updateTransaction = (member, otherMemberId, amount, type) => {
    const transaction = member.other_members.find(
        t => t.other_member_id.toString() === otherMemberId
    );
    if (!transaction) return null;

    if (transaction.exchange_status === type) {
        transaction.amount += amount;
    } else if (transaction.exchange_status === "settled") {
        transaction.amount = amount;
        transaction.exchange_status = type;
    } else {
        if(transaction.amount === amount)
        {
            transaction.amount = 0;
            transaction.exchange_status = "settled";
        }
        else if(transaction.amount < amount)
        {
            transaction.amount = amount - transaction.amount;
            transaction.exchange_status = type;
        }
        else
        {
            transaction.amount -= amount;
        }
    }
    const updatedMember = member;
    updatedMember.otherMembers = transaction;

    return updatedMember;
};