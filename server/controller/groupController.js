import group from "../models/group.js";
import user from "../models/user.js";
import ErrorHandler from "../middlewares/error.js";
import { findGroupById, formatMembers } from "../services/groupService.js";
import {sendBorrowerMail} from "../services/userService.js";
import expense from "../models/expense.js";
import settlement from "../models/settlement.js"

// this is how it should look for members in group
// {
//     "group_title": "Weekday Trip",
//     "initial_budget": 1000,
//     "settle_up_date": "2025-03-01",
//     "members": [
//       {
//           "member_id" : "67b96de864e68788e56bc872",
//           "other_members" : [
//               {
//                   "other_member_id" : "67b98380061b73e293691775",
//                   "amount": 50,
//                   "exchange_status": "lended"
//               },
//               {
//                   "other_member_id" : "67b9840167edecea2be0e236",
//                   "amount": 100,
//                   "exchange_status": "borrowed"
//               }
//           ]
//       }
//     ]
//   }



export const createGroup = async (req, res, next) => {
  try {
    const id = req.user._id;
    const {
      group_title,
      memberIds = [],
      initial_budget,
      settle_up_date,
    } = req.body;
    memberIds.push(id);
    const members = formatMembers(memberIds);

    const newGroup = await group.create({
      group_title,
      members,
      initial_budget,
      settle_up_date,
      creator_id: id,
    });

    if(!newGroup) return next(new ErrorHandler("Error creating new Group"));
    res.status(201).json({
      data: newGroup,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (E11000)
      return res.status(400).json({
        error:
          "A group with this title already exists. Please choose a different name.",
      });
    }
    console.log("Error creating group", error);
    next(error);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedDetails = req.body;
    const updatedGroup = await group.findByIdAndUpdate(id, updatedDetails, {
      new: true,
      runValidators: true,
    });
    if (!updatedGroup)
      return next(new ErrorHandler("No group found with this id to update", 400));
    res.status(200).json({
      message: "Group updated successfully",
      data: updatedGroup,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (E11000)
      return res.status(400).json({
        error:
          "A group with this title already exists. Please choose a different name.",
      });
    }
    console.log("Error updating group", error);
    next(error);
  }
};

// deleting the group will also delete all the expenses recorded in the group and revert back all the money transfers in wallets
export const deleteGroup = async (req, res, next) => {
  try {
    //revert all the wallet states according to expense+settlement records
    //delete all the group expenses and settlements
    //delete the group
    const { id } = req.params;
    

  } catch (error) {}
};

export const leaveGroup = async (req, res, next) => {
  try {
    const id = req.user._id.toString();
    const { groupId } = req.params;

    const curGroup = await group.findById(groupId).select("members");

    if (!curGroup) {
      return next(new ErrorHandler("Group not found", 404));
    }

    let hasPendingDues = false;

    curGroup.members.forEach((member) => {
      if (member.member_id.toString() === id) {
        member.other_members.forEach((other_member) => {
          if (other_member.exchange_status !== "settled") {
            hasPendingDues = true;
          }
        });
      }
    });

    if (hasPendingDues) {
      return next(new ErrorHandler("User has pending dues to clear", 400));
    }

    curGroup.members = curGroup.members.filter(
      (member) => member.member_id.toString() !== id
    );

    curGroup.members.forEach((member) => {
      member.other_members = member.other_members.filter(
        (otherMember) => otherMember.other_member_id.toString() !== id
      );
    });

    await curGroup.save();

    res.status(200).json({
      message: "User successfully left the group.",
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    next(error);
  }
};

export const getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curGroup = await findGroupById(id);
    if (!curGroup) return next(new ErrorHandler("No group with given id exists", 404));
    res.status(200).json({
      data: curGroup,
    });
  } catch (error) {
    console.log("Error getting group details", error);
    next(error);
  }
};

export const getGroupExchangeStateWithOthers = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { group_id } = req.params;

    const curGroup = await findGroupById(group_id);
    if (!curGroup) return next(new ErrorHandler("Cannot find the group with given ID", 400));

    const member = curGroup.members.find((member) => member.member_id.toString() === _id.toString());
    if (!member) return next(new ErrorHandler("User not part of the group", 404));

    let exchangeDetails = [];

    exchangeDetails = await Promise.all(
      member.other_members.map(async (other_member) => {
        const curUser = await user.findById(other_member.other_member_id).select("name profile_photo");
        return {
          other_member_name: curUser?.name || "Unknown",
          other_member_profile_photo: curUser?.profile_photo || "",
          amount: other_member.amount,
          exchange_status: other_member.exchange_status
        };
      })
    );

    res.status(200).json({
      message: "Successfully fetched exchange states",
      data: exchangeDetails
    });
  } catch (error) {
    console.error("Error fetching group exchange details:", error);
    next(error);
  }
};


export const remindGroupBorrower = async (req, res, next) => {
  try {
    const id = req.user._id;
    const {group_id} = req.params;
    const {borrower_id, amount} = req.query;
    const curGroup = await group.findById(group_id);
    if(!curGroup) return next(new ErrorHandler("Error fetching group details to remaind borrower", 400));
    const curUser = await user.findById(id);
    if(!curUser) return next(new ErrorHandler("Error fetching user details to remaind borrower", 400));
    const borrowerProfile = await user.findById(borrower_id);
    if(!borrowerProfile) return next(new ErrorHandler("Error remainding borrower", 400));
    sendBorrowerMail({lender: curUser, borrowerProfile,amount, group: curGroup});
    res.status(200).json({
      message: "successfully reminded"
    });
  } catch (error) {
    console.log("Error remainding borrower");
    next(error);
  }
}


export const remindAllGroupBorrowers = async (req, res, next) => {
  try {
    const id = req.user._id;
    const {group_id} = req.params;
    const curGroup = await group.findById(group_id);
    if(!curGroup) return next(new ErrorHandler("Error fetching group details to remaind borrower", 400));
    const curUser = await user.findById(id);
    if(!curUser) return next(new ErrorHandler("Error fetching user details to remaind borrower", 400));
    curGroup.members.forEach(async(member) => {
      member.other_members.forEach(async(other_member) => {
        if(other_member.exchange_status === "lended") {
          const borrowerProfile = await user.findById(other_member.other_member_id);
          if(!borrowerProfile) return next(new ErrorHandler("Error remainding borrower", 400));
          sendBorrowerMail({lender: curUser, borrowerProfile,amount: other_member.amount, group: curGroup});
        }
      })
    })
    res.status(200).json({
      message: "all borrowers successfully reminded"
    });
  } catch (error) {
    console.log("Error remainding borrowers");
    next(error);
  }
}

export const getGroupHistory = async (req, res) => {
  try {
    const {group_id} = req.params;
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
    const formattedExpenses = expenses.map(exp => ({ ...exp, type: "expense" }));
    const formattedSettlements = settlements.map(set => ({ ...set, type: "settlement" }));
    const history = [...formattedExpenses, ...formattedSettlements].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.status(200).json({
      message: "successfully fetched group history",
      data: history
    });
  } catch (error) {
    console.log("Error fetching group history");
    next(error);
  }
};

export const addToGroup = async (req, res, next) => {
  try {
    const {group_id} = req.params;
    const {memberIds = []} = req.body;

    const curGroup = await findGroupById(group_id);
    let prevMemberIds = [];
    curGroup.members.forEach((member) => prevMemberIds.push(member.member_id));
    memberIds.forEach((memberId) => prevMemberIds.push(memberId));
    
  } catch (error) {
    
  }
}
