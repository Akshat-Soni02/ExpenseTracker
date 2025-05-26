import { simplifyDebtsService, createGroupService, updateGroupService, leaveGroupService, fetchGroupDetails, fetchExchangeDetails, remindAGroupMember, remindAllGroupMembers, fetchGroupHistory, addPeopleToGroup } from "../services/groupService.js";
import { MESSAGES, STATUS_CODES } from "../config/constants.js";
import { withTransaction } from "../utils/transaction.js";



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


/**
 * 
 * @returns response with group's whole history,
 * including settlements and expenses
 */
export const getGroupHistory = async (req, res, next) => {
  try {
    const { group_id } = req.params;
    const since = req.query.since;

    const history = await fetchGroupHistory({ group_id, since});

    res.status(STATUS_CODES.OK).json({
      message: "Successfully fetched group history",
      data: history,
    });

  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with no data
 */
export const processSimplifyDebts = async (req, res, next) => {
  try {
    const { group_id } = req.params;

    await withTransaction(async (session) => {
      return await simplifyDebtsService( group_id, session );
    })
    
    return res.status(STATUS_CODES.OK).json({message: "Simplified successfully"});
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with updated group
 */
export const addToGroup = async (req, res, next) => {
  try {
    console.log("Adding new members to group");

    const { group_id } = req.params;
    const { newMemberIds } = req.body;

    const curGroup = await addPeopleToGroup({ group_id, newMemberIds});

    return res.status(STATUS_CODES.OK).json({ message: "Added Successfully", group: curGroup });

  } catch (error) {
    next(error);
  }
};

