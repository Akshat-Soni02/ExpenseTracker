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
    const currGroup = await group.findById(groupId).select("members");
    if (!currGroup) throw new Error("No group with the given ID");

    for (const { user_id: borrowerId, amount } of borrowers) {
        const lender = currGroup.members.find(m => m.member_id.toString() === giverId);
        if (lender) {
            updateTransaction(lender, borrowerId, amount, "lended");
        }

        const borrower = currGroup.members.find(m => m.member_id.toString() === borrowerId);
        if (borrower) {
            updateTransaction(borrower, giverId, amount, "borrowed");
        }
    }

    await currGroup.save();
};

const updateTransaction = (member, otherMemberId, amount, type) => {
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
};
