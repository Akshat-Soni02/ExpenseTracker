import group from "../models/group.js";
import user from "../models/user.js";
import ErrorHandler from "../middlewares/error.js";
import { findGroupById, formatMembers, simplifyDebtsService } from "../services/groupService.js";
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
    console.log("Creating Group");
    const id = req.user._id;
    const {
      group_title,
      memberIds = [],
      initial_budget,
      settle_up_date,
    } = req.body;
    // memberIds.push(id);
    const members = formatMembers(memberIds);

    const newGroup = await group.create({
      group_title,
      members,
      initial_budget,
      settle_up_date,
      creator_id: id,
    });

    if(!newGroup) return next(new ErrorHandler("Error creating new Group"));
    console.log("Created Group");
    res.status(201).json({
      data: newGroup,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (E11000)
      return next(new ErrorHandler("A group with this title already exists. Please choose a different name.", 400));
    }
    console.log("Error creating group", error);
    next(error);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    console.log("Updating Group");
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
    console.log("Updated Group");
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
    console.log("Leaving Group");
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
      return next(new ErrorHandler("You have pending dues to clear", 400));
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
    console.log("Left group");
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
    console.log("Fetching group by id");
    const { id } = req.params;
    const curGroup = await findGroupById(id);
    if (!curGroup) return next(new ErrorHandler("No group with given id exists", 404));
    console.log("Fetched Group");
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
    console.log("Fetching group exchange state with others");
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
          other_member_profile_photo: curUser?.profile_photo?.url || "",
          amount: other_member.amount,
          exchange_status: other_member.exchange_status,
          other_member_id:other_member.other_member_id,
        };
      })
    );
    console.log("Fetched Group Exchange State");
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
    console.log("Reminding Borrowers");
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
    console.log("Reminded Borrowers");
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
    console.log("Reminding All Borrowers");
    const id = req.user._id;
    const {group_id} = req.params;
    const curGroup = await group.findById(group_id);
    if(!curGroup) return next(new ErrorHandler("Error fetching group details to remaind borrower", 400));
    const curUser = await user.findById(id);
    if(!curUser) return next(new ErrorHandler("Error fetching user details to remaind borrower", 400));
    curGroup.members.forEach(async(member) => {
      if(member.member_id.toString() === id.toString()) {
        member.other_members.forEach(async(other_member) => {
          if(other_member.exchange_status === "lended") {
            const borrowerProfile = await user.findById(other_member.other_member_id);
            if(!borrowerProfile) return next(new ErrorHandler("Error remainding borrower", 400));
            sendBorrowerMail({lender: curUser, borrowerProfile,amount: other_member.amount, group: curGroup});
          }
        })
      }
    })
    console.log("Reminded All Borrowers");
    res.status(200).json({
      message: "all borrowers successfully reminded"
    });
  } catch (error) {
    console.log("Error remainding borrowers");
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

    const formattedExpenses = expenses.map(exp => ({
      ...exp,
      type: "expense",
    }));

    const formattedSettlements = settlements.map(set => ({
      ...set,
      type: "settlement",
    }));

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
    const { group_id } = req.params;
    const { newMemberIds = [] } = req.body;

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
          exchange_status: "settled"
        })),
        ...newMemberIds
          .filter(id => id !== newMemId)
          .map(otherNewId => ({
            other_member_id: otherNewId,
            amount: 0,
            exchange_status: "settled"
          }))
      ]
    }));

    curGroup.members.forEach(member => {
      newMemberIds.forEach(newMemId => {
        member.other_members.push({
          other_member_id: newMemId,
          amount: 0,
          exchange_status: "settled"
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

