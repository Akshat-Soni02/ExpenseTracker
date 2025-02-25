import group from "../models/group.js";
import ErrorHandler from "../middlewares/error.js";

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

const formatMembers = (memberIds) => {
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

    res.status(201).json({
      success: true,
      group: newGroup,
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
      success: true,
      group: updatedGroup,
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
      success: true,
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
    const curGroup = await group.findById(id);
    if (!curGroup) return next(new ErrorHandler("No group with given id exists", 404));
    res.status(200).json({
      success: true,
      group: curGroup,
    });
  } catch (error) {
    console.log("Error getting group details", error);
    next(error);
  }
};
