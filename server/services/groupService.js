import ErrorHandler from "../middlewares/error.js";
import group from "../models/group.js";
import { updateFriendlyExchangeStatesOnLending, findUserById } from "./userService.js";
import { GroupMemberStatus } from "../enums/groupEnums.js";
import mongoose from "mongoose";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import logger from "../logger/index.js";
import { addPushJob } from "../queues/push/processor.js";
import user from "../models/user.js";
import expense from "../models/expense.js";
import settlement from "../models/settlement.js";
import { addBorrowMailJob } from "../queues/email/processor.js";
import { withSession } from "../utils/transaction.js";


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


/**
 * Fetches history of group but filter 
 * it out if since is passed as prop (if previously 
 * it fetched till a particular time then later it fetches 
 * after that only)
 * 
 * @param {{group_id: string, since: Date}} param0
 */
export const fetchGroupHistory = async ({ group_id, since }) => {

    if(!group_id) throw new ErrorHandler(`Group's id required to fetched history, not continuining...`);

    const filter1 = { group_id };

    /**
     * fetches those who are created after since
     */
    if (since) {
      filter1.created_at_date_time = { $gte: new Date(since) };
    }

    const filter2 = { group_id };
    if (since) {
      filter2.createdAt = { $gte: new Date(since) };
    }

    const expenses = await expense.find(filter1).lean();
    const settlements = await settlement.find(filter2).lean();

    const formattedExpenses = await Promise.all(
      expenses.map(async (exp) => {
        try {
            const giver = await user.findById(exp.lenders[0].user_id).select("name");
            if(!giver) {
                logger.error(`user not found ${exp.lenders[0].user_id}, included in expense ${exp._id}`);
            }

            const giver_name = giver?.name || "unknown";

            return {
                ...exp,
                type: "expense",
                giver: giver_name,
            };
        } catch (error) {
            logger.warn(`Unable to fetch giver ${exp.lenders[0].user_id} in group ${group_id}'s history`);
            return {
                ...exp,
                type: "expense",
                giver: "unknown",
            };
        }
      })
    );

    const formattedSettlements = await Promise.all(
      settlements.map(async (set) => {

        try {
            const giver = await user.findById(set.payer_id).select("name");
            if(!giver) {
                logger.error(`user not found ${set.payer_id}, included in expense ${set._id}`);
            }

            const giver_name = giver?.name || "unknown";

            return {
            ...set,
            type: "settlement",
            giver: giver_name,
            };
        } catch (error) {
            logger.warn(`Unable to fetch payer ${set.payer_id} in group ${group_id}'s history`);
            return {
                ...set,
                type: "settlement",
                giver: "unknown",
            };
        }
      })
    );

    /**
     * order matters of this operation
     * (b.created_at_date_time || b.createdAt) since it
     * will look for createdAt first if place inverted
     */
    const history = [...formattedExpenses, ...formattedSettlements].sort(
      (a, b) => new Date(b.created_at_date_time || b.createdAt) - new Date(a.created_at_date_time || a.createdAt)
    );

    logger.info(`fetched history of ${group_id}`);
    return history;
}


/**
 *
 * @param {string} group_id 
 * @returns group but nothing if operation fails
 */
export const findGroupById = async (group_id, session) => {

    let query = withSession( group.findById(group_id), session);

    const curGroup = await query;

    if(!curGroup) {
        logger.warn(`Group not found: ${group_id}`);
        return;
    }

    return curGroup;
}


/**
 * gets all groups of user
 * @param {string} user_id 
 * @returns array of groups
 */
export const findUserGroups = async (user_id) => {

    const groups = await group.find({"members.member_id": user_id}).select("_id group_title members").sort({createdAt: -1});
    const filteredGroups = [];

    for(const groupObj of groups) {
        const group = groupObj.toObject();
        
        let userState = 0;
        const matchedMember = group.members.find(member => member.member_id.toString() === user_id.toString());

        matchedMember.other_members.forEach((other_member) => {
            if(other_member.exchange_status === 'borrowed') userState -= other_member.amount;
            else userState += other_member.amount;
        });

        const {members, ...rest} = group;
        filteredGroups.push({...rest, userState});
    }

    return filteredGroups;
}


/**
 * searches groups whoose both mem1 and 
 * mem2 are members of. then settles them there
 * 
 * @param {string} mem1 
 * @param {string} mem2 
 * @param {session} session
 */
export const settleAllGroups = async (mem1, mem2, session) => {

    let findQuery = withSession( group.find({
        "members.member_id": {
            $all: [new mongoose.Types.ObjectId(mem1), new mongoose.Types.ObjectId(mem2)]
        }
    }), session);
    const groups = await findQuery;


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

    logger.info(`settled all groups of ${mem1} and ${mem2}`);
}



/**
 * 
 * when an expense is added in group,
 * the group's state needs to be changed accordingly
 * hence this function register changes of that expense in 
 * group
 * 
 * @param {{groupId: string, giverId: string, borrowers: Array}} param0
 * @param session session
 */
export const distributeAmount = async ({ groupId, giverId, borrowers }, session) => {

    try{    

        if(!groupId || !giverId || borrowers.length === 0) throw new ErrorHandler(`Insufficient details provided in distribute function for group`);

        let currGroup = await findGroupById(groupId, session);

        if(!currGroup) throw new ErrorHandler(`Group not found: ${groupId}, terminating amount distribution in group...`);

        const lender = currGroup.members.find(m => m.member_id.toString() === giverId.toString());

        if(!lender) throw new ErrorHandler(`Invalid operation of amount distribution in group, lender does not belong here`);


        for (const { user_id: borrowerId, amount } of borrowers) {

            const updatedBorrower = updateTransaction( lender, borrowerId.toString(), amount, GroupMemberStatus.LENDED );
            if(!updatedBorrower) throw new ErrorHandler(`amount distribution in group invalid for borrower ${borrowerId}`);
            
            const borrower = currGroup.members.find(m => m.member_id.toString() === borrowerId.toString());
            if(!borrower) throw new ErrorHandler(`Invalid operation of amount distribution in group, borrower does not belong here`);

            const updatedLender = updateTransaction( borrower, giverId.toString(), amount, GroupMemberStatus.BORROWED );
            if(!updatedLender) throw new ErrorHandler(`amount distribution in group invalid for lender ${giverId}`);

        }

        await currGroup.save();
    }
    catch(err){
        logger.error(`Amount distribution in group ${groupId} failed`);
        throw err;
    }
};



/**
 * this function updates a member's 
 * other_member array according to 
 * the previous state of them and 
 * the new expense condition
 * 
 * @param {string} member 
 * @param {string} otherMemberId 
 * @param {number} amount 
 * @param {string} type 
 * @returns updated array (other_members) of member
 */
const updateTransaction = (member, otherMemberId, amount, type) => {

    try{
        if(!member || !otherMemberId || !amount || !type) throw new ErrorHandler(`Insufficient details provided to update transaction (state) for member in group`);

        /**
         * transaction in here is 
         * member's state with other members in group 
         */
        const transaction = member.other_members.find(
            t => t.other_member_id.toString() === otherMemberId
        );

        if (!transaction) {
            logger.warn(`Invalid group details, no previous state of users with themselves`);
            throw new ErrorHandler(`Invalid group details, no previous state of users with themselves`);
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

        /**
         * @todo whyyyy
         */
        transaction.amount = transaction.amount;

        const updatedMember = member;

        updatedMember.otherMembers = transaction;

        return updatedMember;
    }
    catch(err){
        logger.error(`Transaction update error while distributing amount`);
        throw err;
    }
};



/**
 * 
 * @param {object} group
 * @returns an array named "simplifiedTransactions", which 
 * contains objects stating simplify states,
 * ex - {from: "a1", to: "b1", amount: 50}
 */
const simplifyDebts = (group) => {

    if(!group) throw new ErrorHandler(`bad request for simplify debts, group is not passed`);

    /**
     * balances represent state of each 
     * member currently in group, an state 
     * is (totalLendedAmount - totalBorrowedAmount)
     */
    let balances = new Map();

    /**
     * fills balances map,
     * proccess each member and add its state with
     * other_member in balances map
     * NOTE - since each state with other occures twice 
     * we get the balances array with double values
     */
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
    
    /**
     * since balances contain double values,
     * we setting them half
     */
    balances.forEach((value, key) => {
      balances.set(key, value/2);
    });

    /**
     * creditors - overall net +ve
     * debitors - overall net -ve
     */
    let creditors = [];
    let debtors = [];

    balances.forEach((balance, userId) => {
        if (balance > 0) creditors.push({ userId, balance });
        else if (balance < 0) debtors.push({ userId, balance: -balance });
    });

    /**
     * sorting in descending order
     */
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    /**
     * final simplified states array
     */
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

    logger.debug(`simplify debt calculated for group ${group._id}`);

    return simplifiedTransactions;
};



/**
 * since the simplifyDebts function gives a 
 * specified transaction array we need to convert
 * it to matrix
 * @param {object} transactions 
 * @param {number} n 
 * @param {Array<string>} keysArray 
 * @returns matrix form of simplified transactions
 */
function transactionsToMatrix(transactions, n, keysArray) {

    if(!transactions || !n || !keysArray) throw new ErrorHandler(`details missing for simplified matrix formation, terminating...`);

    /**
     * giving an specific index to each id
     */
    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

    /**
     * a matrix of n x n with 0 initial values
     */
    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    /**
     * converting the transactions to a matrix form where 
     * i represent from & j represent to [these are final 
     * states after simplify debts, which means after simplification 
     * those who have +ve value are lenders and -ve are debters]
     */
    transactions.forEach(({ from, to, amount }) => {
        if (keyToIndex[from] !== undefined && keyToIndex[to] !== undefined) {
            let i = keyToIndex[from];
            let j = keyToIndex[to];
            matrix[i][j] = -amount;
            matrix[j][i] = amount;
        }
    });

    logger.debug(`simplify transaction form converted to matrix for group ${group._id}`);

    return matrix;
}



/**
 * 
 * @param {object} members In the original form of group's members
 * @param {number} n total group members
 * @param {Array<string>} keysArray 
 * @returns members in form of matrix with same indexes used to 
 * form simplify debt matrix
 */
function membersToMatrix(members, n, keysArray) {

    if(!members || !n || !keysArray) throw new ErrorHandler(`details missing for members to matrix formation, terminating...`);

    let keyToIndex = Object.fromEntries(keysArray.map((key, i) => [key, i]));

    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    /**
     * populating the matrix with transactions(states) from members
     */
    members.forEach(({ member_id, other_members }) => {

        /**
         * index used for this member
         */
        let i = keyToIndex[member_id];

        /**
         * if members is not used in simplify calcuation
         * return treats as continue
         */
        if (i === undefined) return;

        other_members.forEach(({ other_member_id, amount, exchange_status }) => {
            let j = keyToIndex[other_member_id];
            if (j === undefined) return;

            /**
             * diagonal is same person,
             * hence no operation required
             */
            if (i === j) return; 

            if (exchange_status === GroupMemberStatus.LENDED) {
                matrix[i][j] = +amount;
            } else if (exchange_status === GroupMemberStatus.BORROWED) {
                matrix[i][j] = -amount;
            } else if (exchange_status === GroupMemberStatus.SETTLED) {
                matrix[i][j] = 0;
            }

        });

    });

    logger.debug(`formed matrix from group members for simplification`);
    return matrix;
}

/**
 * 
 * @param {simplify matrix} matrix1 
 * @param {members matrix} matrix2 
 * @returns matrix after subtracting,
 * required to update states of users
 */
function subtractMatrices(matrix1, matrix2) {

    if(!matrix1 || !matrix2) throw new ErrorHandler(`missing one of the matrix to calcuated difference`);

    let n = matrix1.length;

    /**
     * cannot do matrix substraction if
     * both have different dimensions
     */
    if (n !== matrix2.length || matrix1.some((row, i) => row.length !== matrix2[i].length)) throw new ErrorHandler("Incorrect matrix dimensions to calucate matrix differences for simplification");

    let result = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => matrix1[i][j] - matrix2[i][j])
    );

    logger.debug(`matrices substracted for simplification`);

    return result;
}


/**
 * Updates the group data to new simplified data
 * @param {matrix} matrix simplify matrix
 * @param {object} group 
 * @param {Array<string>} keysArray
 */
const updateGroupToSimplify = async (matrix, group, keysArray) => {

    if(!matrix || !group || !keysArray) throw new ErrorHandler(`details insufficient to update group ${group._id} for simplification`);

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
    logger.debug(`changed group details for simplification`);
}


/**
 * Updates users's according to group's simplificaton
 * @param {simplifyMatrix} matrix
 * @param {Array<string>} keysArray
 * @param {session} session
 */
const updateUserToSimplify = async (matrix, keysArray, session) => {

    if(!matrix || !keysArray) throw new ErrorHandler(`details insufficient to update users in group ${group._id} for simplification`);

    let size = keysArray.length;

    for(let i=0;i<size;i++) {
        for(let j=i+1;j<size;j++) {

            if(matrix[i][j] === 0) continue;

            /**
             * @todo send sessions here
             */
            if(matrix[i][j] > 0) {
                await updateFriendlyExchangeStatesOnLending({lender_id: keysArray[i],borrowers: [{user_id: keysArray[j],amount: matrix[i][j]}] }, session);
            } else await updateFriendlyExchangeStatesOnLending({lender_id: keysArray[j],borrowers: [{user_id: keysArray[i],amount: -matrix[i][j]}] }, session);

        }
    }

    logger.debug(`updatd user details for simplification`);
}


/**
 * the main entry point for simplify debts
 * calls 6 services in sequence to calculate the final simplification 
 * states for groups and users
 * 
 * flow works as
 * 1. simplifyDebts
 * 2. change simplify to matrix form
 * 3. change group member to matrix form
 * 4. calculate updated group state after simplification
 * 5. substract matrices to calculate the difference
 * 6. change user's details according to simplification
 * 
 * 
 * @param {string} group_id
 * @returns nothing
 * @throws if operations fails
 */
export const simplifyDebtsService = async (group_id, session) => {

    try {

        let groupQuery = withSession(group.findById(group_id), session);
        const curGroup = await groupQuery;
        if(!curGroup) throw new ErrorHandler(`Group not found: ${group_id}, terminating simplify debt...`);

        let n = curGroup.members.length;

        /**
         * keysArray is an array of 
         * member ids in a 
         * fixed sequence (sequence doesn't matter)
         */
        let keysArray = [];

        /**
         * pushes all members's id in 
         * keys array
         */
        curGroup.members.forEach((member) => keysArray.push(member.member_id));

        let transactions = simplifyDebts(curGroup);

        let simplifyMatrix = transactionsToMatrix(transactions, n, keysArray);

        let earlierMatrix = membersToMatrix(curGroup.members, n, keysArray);

        /**
         * here session is not passed because session is already attached 
         * in find query in the start
         */
        await updateGroupToSimplify(simplifyMatrix, curGroup, keysArray);


        /**
         * substract (members matrix - simplified matrix)
         */
        let subtractedMatrix = subtractMatrices(simplifyMatrix, earlierMatrix);


        await updateUserToSimplify(subtractedMatrix, keysArray, session);

        logger.info(`Group ${group_id} simplified`);

    } catch (error) {
        throw error;
    }
}


/**
 * adding new members in format of group's members
 * 
 * @param {{group_id: string, newMemberIds: Array<string>}} param0
 * @returns updated group
 */
export const addPeopleToGroup = async ({group_id, newMemberIds}) => {

    if(newMemberIds.length === 0) return;

    const curGroup = await findGroupById(group_id);

    if (!curGroup) throw new ErrorHandler(`Group not found: ${group_id}, terminating add people operation...`);


    /**
     * adding 
     * new members as other members in each new member
     * and old members to other members in new members array
     */
    let newMembers = newMemberIds.map(newMemId => ({
      member_id: newMemId,
      other_members: [
        ...curGroup.members.map(member => ({
          other_member_id: member.member_id,
          amount: 0,
          exchange_status: GroupMemberStatus.SETTLED
        })),
        ...newMemberIds
          .filter(id => id !== newMemId)
          .map(otherNewId => ({
            other_member_id: otherNewId,
            amount: 0,
            exchange_status: GroupMemberStatus.SETTLED
          }))
      ]
    }));

    /**
     * adding members to othermembers in existing members
     */
    curGroup.members.forEach(member => {
      newMemberIds.forEach(newMemId => {
        member.other_members.push({
          other_member_id: newMemId,
          amount: 0,
          exchange_status: GroupMemberStatus.SETTLED
        });
      });
    });

    curGroup.members.push(...newMembers);

    await curGroup.save();

    try {
        await sendNewGroupPushNotifications({group: curGroup, selectedMembers: newMemberIds });
    } catch (error) {
        logger.warn(error);
    }

    logger.info(`${newMemberIds.length} new members added in group ${group_id}`);

    return curGroup;
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
 * This is used for both purposes, when notification 
 * is send only to newly added peoples as well as all
 * 
 * @todo i think not working for new people add in exisitng group
 * 
 * @param {{group: object, creator_id: string, selectedMembers: Array<string>}} param0 
 */
export const sendNewGroupPushNotifications = async ({group, creator_id, selectedMembers}) => {
    try{
        const body = `You've been added to ${group.group_title}.`;
        const title = "👤 New Group";

        if(selectedMembers) {
            const members = group.members;
            const selectedMemSet = new Set(selectedMembers);
            const filteredMembers = members.filter(mem => selectedMemSet.has(mem.member_id));
            group.members = filteredMembers;
        }

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



// This example can be used for 
// simplify debts function
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