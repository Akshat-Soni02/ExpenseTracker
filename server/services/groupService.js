import ErrorHandler from "../middlewares/error.js";
import group from "../models/group.js";
import { updateFriendlyExchangeStatesOnLending, findUserById } from "./userService.js";
import { GroupMemberStatus } from "../enums/groupEnums.js";
import mongoose from "mongoose";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import logger from "../logger/index.js";
import { addPushJob } from "../queues/push/processor.js";
import user from "../models/user.js";
import { addBorrowMailJob } from "../queues/email/processor.js";


/**
 * takes the array of ids and convert to 
 * members schema as required by the group
 * 
 * @param {Array<string>} memberIds array of member's ids
 * @returns array of formatted data
 */
export const formatMembers = (memberIds) => {
    try{
        return memberIds.map((memberId, index) => ({
            member_id: memberId,
            other_members: memberIds
            .filter((otherId) => otherId !== memberId)
            .map((otherMemberId) => ({
                other_member_id: otherMemberId,
                amount: 0,
                exchange_status: GroupMemberStatus.SETTLED,
            })),
        }));
    }
    catch(err){
        logger.warn('Group members format error');
        throw err;
    }
};


/**
 * 
 * @param {object} data contains new group data along with creator's id
 * @returns new group
 * @throws if operation fails
 */
export const createGroupService = async (data) => {

    const {memberIds, ...rest} = data;
    const members = formatMembers(memberIds);

    const newGroup = await group.create({...rest, members});
    if(!newGroup) throw new ErrorHandler(`db operation failed to create group`, STATUS_CODES.SERVER_ERROR);

    try {
        await sendNewGroupPushNotifications({group: newGroup, creator_id: data.creator_id});
    } catch (error) {
        logger.warn(error);
    }

    logger.info(`group ${newGroup._id} created by user ${data.creator_id}`);
    return newGroup;
}

/**
 * updates basic group details
 * 
 * @param {{group_id: string, data}} param0 
 * @returns updated group
 */
export const updateGroupService = async ({group_id, data}) => {

    const updatedGroup = await group.findByIdAndUpdate(group_id, data, {
        new: true,
        runValidators: true
    });

    if(!updatedGroup) throw new ErrorHandler(`Group not found to update data: ${group_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });

    logger.info(`Group ${group_id} 's details updated`);
    return updatedGroup;
}

/**
 * 
 * @param {{group_id: string, user_id: string}} param0
 * @returns nothing
 * @throws if operation fails
 */
export const leaveGroupService = async ({group_id, user_id}) => {

    const curGroup = await findGroupById(group_id);

    if (!curGroup) throw new ErrorHandler(`Group not found: ${group_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });


    let hasPendingDues = false;

    curGroup.members.forEach((member) => {
      if (member.member_id.toString() === user_id) {
        member.other_members.forEach((other_member) => {
          if (other_member.exchange_status !== GroupMemberStatus.SETTLED) {
            hasPendingDues = true;
          }
        });
      }
    });

    if (hasPendingDues) throw new ErrorHandler(`Please clear you pending dues to leave group`, STATUS_CODES.BAD_REQUEST, { errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true });

    curGroup.members = curGroup.members.filter(
      (member) => member.member_id.toString() !== user_id
    );

    curGroup.members.forEach((member) => {
      member.other_members = member.other_members.filter(
        (otherMember) => otherMember.other_member_id.toString() !== user_id
      );
    });

    await curGroup.save();

    try {
        await sendLeaveGroupPushNotifications({group: curGroup, active_user_id: user_id});
    } catch (error) {
        logger.warn(error);
    }

    logger.info(`${user_id} left group ${group_id}`);
}


/**
 * 
 * @param {string} group_id 
 * fetches group details and associate 
 * member names with it
 * 
 * @returns group with user names
 * @throws Errorhandler if operations fails
 */
export const fetchGroupDetails = async(group_id) => {

    const groupObj = await findGroupById(group_id);
    if (!groupObj) throw new ErrorHandler(`Group not found: ${group_id}`);

    const curGroup = groupObj.toObject();

    const members = await Promise.all(curGroup.members.map(async (member) => {
        try {
            const user = await findUserById(member.member_id);
            if (!user) {
                logger.warn(`User not found: ${member.member_id}, included in group ${group_id}`);
            }

            return {
                ...member,
                member_name: user?.name || "unknown"
            };
        } catch (error) {
            logger.warn(error);
            return {
                ...member,
                member_name: "unknown"
            };
        }
    }));

    curGroup.members = members;
    return curGroup;
}


/**
 * fetches group details, uses parallel 
 * promises to get user details and then sends
 * @param {{group_id: string, user_id: string}} param0
 */
export const fetchExchangeDetails = async({group_id, user_id}) => {

    const curGroup = await findGroupById(group_id);
    if (!curGroup) throw new ErrorHandler(`Group not found: ${group_id}`);

    const member = curGroup.members.find((member) => member.member_id.toString() === user_id.toString());
    if (!member) {
        logger.warn(`Invalid group ${group_id} access by user ${user_id}`);
        throw new ErrorHandler(`Invalid group access`, STATUS_CODES.FORBIDDEN, {exposeToClient: true, errorType: ERROR_TYPES.UNAUTHORIZED});
    }

    let exchangeDetails = [];

    exchangeDetails = await Promise.all(
      member.other_members.map(async (other_member) => {
        const curUser = await user.findById(other_member.other_member_id).select("name profile_photo");
        return {
          other_member_name: curUser?.name || "Unknown",
          other_member_profile_photo: curUser?.profile_photo?.url || "",
          amount: other_member.amount,
          exchange_status: other_member.exchange_status,
          other_member_id:other_member.other_member_id,
        };
      })
    );

    logger.debug(`fetched group ${group_id} exchange details by user ${user_id}`);

    return exchangeDetails;
}


/**
 * 
 * @param {object} param0
 * sends reminder email to borrower in a group
 * 
 * @returns nothing
 */
export const remindAGroupMember = async ({group_id, user_id, borrower_id, amount}) => {

    const curGroup = await findGroupById(group_id);
    if(!curGroup) throw new ErrorHandler(`Group not found ${group_id}, terminating reminder email to a borrower`);

    const curUser = await findUserById(user_id);
    if(!curUser) throw new ErrorHandler(`User ${user_id} not found, terminating reminder email to their borrower`);

    const borrowerProfile = await findUserById(borrower_id);
    if(!borrowerProfile) throw new ErrorHandler(`Borrower ${borrower_id} profile not found`);

    try {
        await addBorrowMailJob({lender: curUser, borrowerProfile, amount, group: curGroup});
    } catch (notifErr) {
        logger.error(notifErr);
        throw new ErrorHandler(notifErr);
    }

    logger.info(`Reminder sent by ${user_id} to ${borrower_id} in group ${group_id}`);
}


/**
 * 
 * @param {{group_id: string, user_id: string}} param0
 * sents parallel requests to all borrowers in group
 */
export const remindAllGroupMembers = async({group_id, user_id}) => {

    const curGroup = await findGroupById(group_id);
    if(!curGroup) throw new ErrorHandler(`Group not found ${group_id}, terminating reminder email to all borrowers`);

    const curUser = await findUserById(user_id);
    if(!curUser) throw new ErrorHandler(`User ${user_id} not found, terminating reminder email to all their borrowers`);

    const sendPromises = curGroup.members
    .filter(member => member.member_id.toString() === user_id.toString())
    .flatMap(member =>
        member.other_members
        .filter(other_member => other_member.exchange_status === GroupMemberStatus.LENDED)
        .map(async (other_member) => {
            const borrowerProfile = await findUserById(other_member.other_member_id);
            if (!borrowerProfile) return;
            
            try {
                await addBorrowMailJob({lender: curUser, borrowerProfile, amount: other_member.amount, group: curGroup});
            } catch (notifErr) {
                logger.error(notifErr);
            }
            
        })
    );

    await Promise.all(sendPromises);

    logger.info(`Reminders sent by ${user_id} to all borrowers in group ${group_id}`);
}


export const findGroupById = async (id) => {
    try{
        console.log("Finding group by ID");

        if(!id) {
            console.log(`Group id is undefined: ${id}`);
            throw new Error(`Group id is undefined: ${id}`);
        }

        const curGroup = await group.findById(id);
        return curGroup;
    }
    catch(err){
        console.log("Error finding group by ID", err);
        throw new Error("Error finding group by ID");
    }
}

export const findUserGroups = async (id) => {
    try{        
        console.log("Finding user groups");

        if(!id){
            console.log(`User id is undefined: ${id}`);
            throw new Error(`User id is undefined: ${id}`);
        }

        const groups = await group.find({"members.member_id": id});
        return groups;
    }
    catch(err){
        console.log("Error finding user groups", err);
        throw new Error("Error finding user groups");
    }
}

export const settleAllGroups = async (mem1, mem2) => {
    try{    
        console.log("Settling all the groups");

        if(!mem1 || !mem2) {
            console.log(`Member ids are undefined: ${mem1}, ${mem2}`);
            throw new Error(`Member ids are undefined: ${mem1}, ${mem2}`);
        }

        const groups = await group.find({
        "members.member_id": {
            $all: [new mongoose.Types.ObjectId(mem1), new mongoose.Types.ObjectId(mem2)]
        }
        });

        for (const group of groups) {
            for (const member of group.members) {
                if (member.member_id.toString() === mem1) {
                    for (const other_mem of member.other_members) {
                        if (other_mem.other_member_id.toString() === mem2) {
                            other_mem.amount = 0;
                            other_mem.exchange_status = "settled";
                        }
                    }
                }
        
                if (member.member_id.toString() === mem2) {
                    for (const other_mem of member.other_members) {
                        if (other_mem.other_member_id.toString() === mem1) {
                            other_mem.amount = 0;
                            other_mem.exchange_status = "settled";
                        }
                    }
                }
            }
            await group.save();
        }
    }
    catch(err){
        console.log("Error settling all groups", err);
        throw new Error("Error settling all groups");
    }
}

export const distributeAmount = async ({ groupId, giverId, borrowers }) => {
    try{    
        console.log("Distributing amount");

        if(!groupId || !giverId || borrowers.length === 0) {
            console.log(`Group id, giver id or borrowers are undefined: ${groupId}, ${giverId}, ${borrowers}`);
            throw new Error(`Group id, giver id or borrowers are undefined: ${groupId}, ${giverId}, ${borrowers}`);
        }

        let currGroup = await group.findById(groupId).select("members");
        if(!currGroup) {
            console.log("Error finding group",err);
            throw new Error("Error finding group");
        }

        const lender = currGroup.members.find(m => m.member_id.toString() === giverId.toString());
        if(!lender) {
            console.log(`No lender with ${giverId} exisits`,err);
            throw new Error(`No lender exists to distribute amount`);
        }

        for (const { user_id: borrowerId, amount } of borrowers) {
            const res = updateTransaction(lender, borrowerId.toString(), amount, GroupMemberStatus.LENDED); //settled
            if(!res) throw new Error("cannot update group info for adding expense");
            
            const borrower = currGroup.members.find(m => m.member_id.toString() === borrowerId.toString());
            if (borrower) {
                const res = updateTransaction(borrower, giverId.toString(), amount, GroupMemberStatus.BORROWED); //settled
                if(!res) throw new Error("cannot update group info for adding expense");
            }
        }

        await currGroup.save();
    }
    catch(err){
        console.log("Error distributing amount", err);
        throw new Error("Error distributing amount");
    }
};

const updateTransaction = (member, otherMemberId, amount, type) => {
    try{
        console.log("Updating transaction in group");

        if(!member || !otherMemberId || !amount || !type) {
            console.log(`Member, other member id, amount or type are undefined: ${member}, ${otherMemberId}, ${amount}, ${type}`);
            throw new Error(`Member, other member id, amount or type are undefined: ${member}, ${otherMemberId}, ${amount}, ${type}`);
        }

        const transaction = member.other_members.find(
            t => t.other_member_id.toString() === otherMemberId
        );

        if (!transaction) {
            console.warn(`No transaction found to make changes in group`);
            return null;
        }

        if (transaction.exchange_status === type) {
            transaction.amount += amount;
        } else if (transaction.exchange_status === GroupMemberStatus.SETTLED) {
            transaction.amount = amount;
            transaction.exchange_status = type;
        } else {
            if(transaction.amount === amount)
            {
                transaction.amount = 0;
                transaction.exchange_status = GroupMemberStatus.SETTLED;
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
        transaction.amount = transaction.amount;
        const updatedMember = member;
        updatedMember.otherMembers = transaction;
        return updatedMember;
    }
    catch(err){
        console.log("Error updating transaction", err);
        throw new Error("Error updating transaction");
    }
};

/////////////////////

// const group = {
//     members: [
//             {
//                 member_id: "1ac",
//                 "other_members": [
//                     {
//                         "other_member_id": "2ac",
//                         "amount": 200,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "3ca",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "4de",
//                         "amount": 100,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     }
//                 ],
//                 "_id": "67c1a4977ad42b6345fae882"
//             },
//             {
//                 "member_id": "2ac",
//                 "other_members": [
//                     {
//                         "other_member_id": "1ac",
//                         "amount": 200,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "3ca",
//                         "amount": 150,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "4de",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                 ],
//                 "_id": "67c1a4977ad42b6345fae885"
//             },
//             {
//                 member_id: "3ca",
//                 "other_members": [
//                     {
//                         "other_member_id": "1ac",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "2ac",
//                         "amount": 150,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "4de",
//                         "amount": 50,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     }
//                 ],
//                 "_id": "67c1a4977ad42b6345fae882"
//             },
//             {
//                 member_id: "4de",
//                 "other_members": [
//                     {
//                         "other_member_id": "1ac",
//                         "amount": 100,
//                         "exchange_status": "lended",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "2ac",
//                         "amount": 0,
//                         "exchange_status": "settled",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     },
//                     {
//                         "other_member_id": "3ca",
//                         "amount": 50,
//                         "exchange_status": "borrowed",
//                         "_id": "67c1a4977ad42b6345fae883"
//                     }
//                 ],
//                 "_id": "67c1a4977ad42b6345fae882"
//             }
//         ],
// }

//////////////////

const simplifyDebts = (group) => {
    console.log("Simplifying debts");
    if(!group) {
        throw new Error(`Unable to simplify debts, group undefined`);
    }

    let balances = new Map();

    group.members.forEach(member => {
        let memberId = member.member_id.toString();
        if (!balances.has(memberId)) balances.set(memberId, 0);

        member.other_members.forEach(transaction => {
            let otherMemberId = transaction.other_member_id.toString();
            let amount = transaction.amount;
            let status = transaction.exchange_status;

            if (!balances.has(otherMemberId)) balances.set(otherMemberId, 0);

            if (status === GroupMemberStatus.LENDED) {
                balances.set(memberId, balances.get(memberId) + amount);
                balances.set(otherMemberId, balances.get(otherMemberId) - amount);
            } else if (status === GroupMemberStatus.BORROWED) {
                balances.set(memberId, balances.get(memberId) - amount);
                balances.set(otherMemberId, balances.get(otherMemberId) + amount);
            }
        });
    });
    
    balances.forEach((value, key) => {
      balances.set(key, value/2);
    });

    let creditors = [];
    let debtors = [];

    balances.forEach((balance, userId) => {
        if (balance > 0) creditors.push({ userId, balance });
        else if (balance < 0) debtors.push({ userId, balance: -balance });
    });

    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    let simplifiedTransactions = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        let minAmount = Math.min(debtor.balance, creditor.balance);
        simplifiedTransactions.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: minAmount
        });

        debtor.balance -= minAmount;
        creditor.balance -= minAmount;

        if (debtor.balance === 0) i++;
        if (creditor.balance === 0) j++;
    }
    let n = creditors.length + debtors.length;
    // return {transactions: simplifiedTransactions, n};
    console.log("Simplified transactions:");
    return simplifiedTransactions;
};

function transactionsToMatrix(transactions, n, keysArray) {
    console.log("Converting transactions to matrix");

    if(!transactions || !n || !keysArray) throw new Error(`Unable to transform transactions to matrix, details missing`);

    let uniqueKeys = new Set();
    transactions.forEach(({ from, to }) => {
        uniqueKeys.add(from);
        uniqueKeys.add(to);
    });

    // let keysArray = Array.from(uniqueKeys).slice(0, n);
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    transactions.forEach(({ from, to, amount }) => {
        if (keyToIndex[from] !== undefined && keyToIndex[to] !== undefined) {
        let i = keyToIndex[from];
        let j = keyToIndex[to];
        matrix[i][j] = -amount;
        matrix[j][i] = amount;
        }
    });

    console.log("Matrix created");
    return matrix;
}


function membersToMatrix(members, n, keysArray) {
    // Extract unique member IDs
    console.log("Converting members to matrix");

    if(!members || !n || !keysArray) throw new Error(`Unable to transform members to matrix, details missing`);

    let uniqueKeys = new Set();
    members.forEach(({ member_id, other_members }) => {
        uniqueKeys.add(member_id);
        other_members.forEach(({ other_member_id }) => uniqueKeys.add(other_member_id));
    });

    // Map each unique member_id to an index (0 to n-1)
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

    // Initialize an n × n matrix filled with 0s
    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    // Populate the matrix with transactions
    members.forEach(({ member_id, other_members }) => {
        let i = keyToIndex[member_id]; // Get index of member_id
        if (i === undefined) return; // Skip if member_id is not in the index map

        other_members.forEach(({ other_member_id, amount, exchange_status }) => {
        let j = keyToIndex[other_member_id]; // Get index of other_member_id
        if (j === undefined) return; // Skip if other_member_id is not in the index map
        if (i === j) return; // Keep diagonal 0

        if (exchange_status === GroupMemberStatus.LENDED) {
            matrix[i][j] = +amount;
        } else if (exchange_status === GroupMemberStatus.BORROWED) {
            matrix[i][j] = -amount;
        } else if (exchange_status === GroupMemberStatus.SETTLED) {
            matrix[i][j] = 0;
        }
        });
    });
    console.log("Members matrix created");
    return { matrix, keysArray };
}

function subtractMatrices(matrix1, matrix2) {
    console.log("Subtracting matrices");

    if(!matrix1 || !matrix2) throw new Error(`Unable to calc difference between matrices, details missing`);

    let n = matrix1.length;

    // Ensure both matrices are of the same size
    if (n !== matrix2.length || matrix1.some((row, i) => row.length !== matrix2[i].length)) {
        throw new Error("Matrix dimensions do not match");
    }

    // Perform element-wise subtraction
    let result = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => matrix1[i][j] - matrix2[i][j])
    );
    console.log("Matrices subtracted");
    return result;
}

const updateGroupToSimplify = async (matrix, group, keysArray) => {
    console.log("Updating group to simplify");

    if(!matrix || !group || !keysArray) throw new Error(`Unable to update group for simplify, details missing`);

    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));
    group.members.forEach((member) => {
        member.other_members.forEach((other_member) => {
            let i = keyToIndex[member.member_id];
            if (i === undefined) return;
            let j = keyToIndex[other_member.other_member_id];
            if (j === undefined) return;
            if (i === j) return;
            other_member.amount = Math.abs(matrix[i][j]);
            other_member.exchange_status = matrix[i][j] > 0 ? GroupMemberStatus.LENDED : matrix[i][j] < 0 ? GroupMemberStatus.BORROWED : GroupMemberStatus.SETTLED;
        });
    });
    await group.save();
    console.log("Group updated");

}

const updateUserToSimplify = async (matrix, keysArray) => {
    try {
        console.log("Updating user to simplify");
        // let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

        if(!matrix || !keysArray) throw new Error(`Unable to simplify group, details missing`);

        let size = keysArray.length;
        for(let i=0;i<size;i++) {
            for(let j=i+1;j<size;j++) {
                if(matrix[i][j] === 0) continue;
                if(matrix[i][j] > 0) {
                    await updateFriendlyExchangeStatesOnLending({lender_id: keysArray[i],borrowers: [{user_id: keysArray[j],amount: matrix[i][j]}] });
                } else await updateFriendlyExchangeStatesOnLending({lender_id: keysArray[j],borrowers: [{user_id: keysArray[i],amount: -matrix[i][j]}] });
            }
        }

        console.log("User updated");
    } catch (error) {
        console.log(error);
        throw error;
    }
}


export const simplifyDebtsService = async ({group, memberSize}) => {

    try {
        console.log("Simplifying debts service");
        if(!group || !memberSize) throw new Error(`Unable to run simplify service, details missing`);

        let keysArray = [];
        let n = memberSize;
        group.members.forEach((member) => keysArray.push(member.member_id));

        //get simplified debts
        let transactions = simplifyDebts(group, keysArray);
        if(!transactions) throw new Error("Error getting simplify debts transactions");
        if(transactions.length === 0) return;

        //convert simplified debts into matrix format
        let simplifyMatrix = transactionsToMatrix(transactions, n, keysArray);
        if(!simplifyMatrix) throw new Error("Error getting simplify matrix from transactions");
        if(!keysArray) throw new Error("Error getting keysArray transactions");

        //convert members to matrix format
        let { matrix: earlierMatrix } = membersToMatrix(group.members, n, keysArray);
        if(!earlierMatrix) throw new Error("Error getting members matrix");

        //update group
        await updateGroupToSimplify(simplifyMatrix, group, keysArray);

        //substract (members matrix - simplified matrix)
        let subtractedMatrix = subtractMatrices(simplifyMatrix, earlierMatrix)
        await updateUserToSimplify(subtractedMatrix,keysArray);

        console.log("Debts simplified");
    } catch (error) {
        console.log(error);
        throw error;
    }
}

/**
 * @function allGroupMemberPushNotificationService is a dummy
 * structure service to send push notification to all group
 * members except the active user who performed the action
 * 
 * @param {{group: object, active_user_id: string, notification_body: string, notification_title: string}} param0
 * @returns nothing if success, else throws error
 */
export const allGroupMemberPushNotificationService = async ({group, active_user_id, notification_body, notification_title}) => {

    try{
        const members = group.members || [];
        
        for (const member of members) {
            if(active_user_id && member.member_id.toString() === active_user_id.toString()) {
                logger.debug(`Skipping active user notification ${active_user_id}`);
                continue;
            }

            try {
                const user = await findUserById(member.member_id);
                if (!user) {
                    logger.warn(`User not found: ${member.member_id}`);
                    continue;
                }

                const tokens = user.accessTokens || [];
                if(tokens.length === 0) continue;

                for (const token of tokens) {

                    try {
                        await addPushJob({token, title: notification_title, body: notification_body});
                    } catch (tokenErr) {
                        logger.error(`Failed to ${notification_title} group push notification`, {
                            userId: member.member_id,
                            token,
                            error: tokenErr.message,
                        });
                    }

                }
            } catch (userErr) {
                logger.error("Error processing group member for notification", {
                    userId: member.member_id,
                    error: userErr.message,
                });
                continue;
            }

        }
    }
    catch(err){
        throw err;
    }
}

/**
 * 
 * @param {{group_id, creator_id}} param0 
 */
export const sendNewGroupPushNotifications = async ({group, creator_id}) => {
    try{
        const body = `You've been added to ${group.group_title}.`;
        const title = "👤 New Group";
        await allGroupMemberPushNotificationService({group, active_user_id: creator_id, notification_body: body, notification_title: title});
    }
    catch(err){
        throw new ErrorHandler("Error sending new group notifications", STATUS_CODES.SERVER_ERROR, {errorType: ERROR_TYPES.NOTIFICATION_ERROR, details: {stack: err.stack}});
    }

}


/**
 * 
 * @param {{group: object, active_user: object}} param0
 */
export const sendLeaveGroupPushNotifications = async ({group, active_user_id}) => {
    try{
        const active_user = await findUserById(active_user_id);
        if(!active_user) throw new ErrorHandler(`User not found: ${active_user_id}, terminating leave group notification...`);

        const body = `${active_user.name} has left ${group.group_title}.`;
        const title = "👤 Group left";
        await allGroupMemberPushNotificationService({group, active_user_id: active_user._id.toString(), notification_body: body, notification_title: title});
    }
    catch(err){
        throw new ErrorHandler("Error sending group left push notifications", STATUS_CODES.SERVER_ERROR, {errorType: ERROR_TYPES.NOTIFICATION_ERROR, details: {stack: err.stack}});
    }
}
