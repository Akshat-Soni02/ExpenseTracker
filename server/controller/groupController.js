import group from "../models/group.js";
import user from "../models/user.js";
import ErrorHandler from "../middlewares/error.js";
import { findGroupById, simplifyDebtsService, createGroupService, updateGroupService, leaveGroupService, fetchGroupDetails, fetchExchangeDetails, remindAGroupMember, remindAllGroupMembers } from "../services/groupService.js";
import expense from "../models/expense.js";
import settlement from "../models/settlement.js"
import { GroupMemberStatus } from "../enums/groupEnums.js";
import { MESSAGES, STATUS_CODES } from "../config/constants.js";



/**
 * creates new group, the memberIds array already
 * has all ids including creator's
 * 
 * @returns response with new group
 */
export const createGroup = async (req, res, next) => {
  try {
    const id = req.user._id;
    const newGroup = await createGroupService({...req.body, creator_id: id});

    res.status(STATUS_CODES.CREATED).json({
      message: MESSAGES.RESOURCE_CREATED("Group"),
      data: newGroup,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * updates group details,
 * we allow group title, initial_budget & settle_up date
 * to update
 * @returns response with updated group
 */
export const updateGroup = async (req, res, next) => {
  try {
    const updatedGroup = await updateGroupService({group_id: req.params.id, data: req.body});

    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.RESOURCE_UPDATED("Group"),
      data: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};



/**
 * 
 * @todo implement delete group
 * deleting the group will also delete all 
 * the expenses recorded in the group 
 * and revert back all the money transfers in wallets
 * 
 */
export const deleteGroup = async (req, res, next) => {
  try {
    //revert all the wallet states according to expense+settlement records
    //delete all the group expenses and settlements
    //delete the group
    const { id } = req.params;
  } catch (error) {}
};


/**
 * 
 * @returns response with no data
 */
export const leaveGroup = async (req, res, next) => {
  try {
    const id = req.user._id.toString();
    const { groupId } = req.params;

    await leaveGroupService({group_id: groupId, user_id: id});
    res.status(STATUS_CODES.OK).json({
      message: "Left successfully",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * fetches group details for client
 * @returns fetched groups
 */
export const getGroupById = async (req, res, next) => {
  try {
    const curGroup = await fetchGroupDetails(req.params.id);

    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.FETCHED("Group"),
      data: curGroup,
    });

  } catch (error) {
    next(error);
  }
};


/**
 * 
 * As we have stored people's exchange state,
 * in our group schema with each other, just gathering that
 * with some essentials
 * @returns response with exchange details
 */
export const getGroupExchangeStateWithOthers = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { group_id } = req.params;

    const exchangeDetails = await fetchExchangeDetails({group_id, user_id: _id});

    res.status(STATUS_CODES.OK).json({
      message: "Successfully fetched exchange states",
      data: exchangeDetails
    });

  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with no data
 */
export const remindGroupBorrower = async (req, res, next) => {
  try {

    const id = req.user._id;
    const {group_id} = req.params;
    const {borrower_id, amount} = req.query;

    await remindAGroupMember({group_id, user_id: id, borrower_id, amount});

    res.status(STATUS_CODES.OK).json({
      message: "Remainder sent"
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with no data
 */
export const remindAllGroupBorrowers = async (req, res, next) => {
  try {
    const id = req.user._id;
    const { group_id } = req.params;

    await remindAllGroupMembers({group_id, user_id: id});

    res.status(STATUS_CODES.OK).json({
      message: "Remainders sent"
    });

  } catch (error) {
    next(error);
  }
}



export const getGroupHistory = async (req, res, next) => {
  try {
    console.log("Fetching group history");
    const { group_id } = req.params;
    const since = req.query.since;

    const filter1 = { group_id };
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
        const giver = await user.findById(exp.lenders[0].user_id).select("name");
        return {
          ...exp,
          type: "expense",
          giver: giver.name,
        };
      })
    );

    const formattedSettlements = await Promise.all(
      settlements.map(async (set) => {
        const giver = await user.findById(set.payer_id).select("name");
        return {
          ...set,
          type: "settlement",
          giver: giver.name,
        };
      })
    );

    const history = [...formattedExpenses, ...formattedSettlements].sort(
      (a, b) => new Date(b.created_at_date_time || b.createdAt) - new Date(a.created_at_date_time || a.createdAt)
    );
    console.log("Fetched group history");
    res.status(200).json({
      message: "Successfully fetched group history",
      data: history,
    });
  } catch (error) {
    console.log("Error fetching group history:", error);
    next(error);
  }
};

export const processSimplifyDebts = async (req, res, next) => {
  try {
    console.log("Processing simplify debts");

    const {group_id} = req.params;

    const curGroup = await group.findById(group_id);
    if(!curGroup) return next(new ErrorHandler("Error fetching group for simplify debts", 400));

    let members = curGroup.members.length;
    await simplifyDebtsService({group: curGroup, memberSize: members});
    
    console.log("Processed simplify debts");
    return res.status(200).json({message: "successfully applied simplify debt"});
  } catch (error) {
    console.log("error processing simplify debt",error);
    next(error);
  }
}


export const addToGroup = async (req, res, next) => {
  try {
    console.log("Adding new members to group");

    const { group_id } = req.params;
    const { newMemberIds = [] } = req.body;

    if(newMemberIds.length === 0) return;

    const curGroup = await findGroupById(group_id);
    if (!curGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

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

    return res.status(200).json({ message: "Members added successfully", group: curGroup });

  } catch (error) {
    console.error("Error adding members to group:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

