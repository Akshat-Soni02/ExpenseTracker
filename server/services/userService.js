import user from "../models/user.js";
import { sendEmail, sendNotificationService } from "./notificationService.js";

export const findUserById = async (id) => {
  console.log("Finding User by ID");
  if (!id) throw new Error("No user id provided");
  const curUser = await user.findById(id);
  if (!curUser) throw new Error("No user with given id exists");
  console.log("User found");
  return curUser;
};

export const extractTempName = (email) => {
  console.log("Extracting Temporary Name");
  const name = email.split("@")[0]; 
  console.log("Extracted Temporary Namw");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const sendBorrowerMail = ({borrowerProfile, lender, amount, group}) => {
  console.log("Sending Borrower Mail");
  if(group) {
    sendEmail({toMail: borrowerProfile.email, subject: "Settle your Dues", text: `Hey ${borrowerProfile.name},\n\n${lender.name} has requested you to clear their dues of ${amount} in group ${group.group_title}.\n\nPlease make the payment at your earliest convenience.\n\nLet us know if you need any assistance.\n\nBest,\nExpense Ease Team`});
  } else {
    sendEmail({toMail: borrowerProfile.email, subject: "Settle your Dues", text: `Hey ${borrowerProfile.name},\n\n${lender.name} has requested you to clear their dues of ${amount}.\n\nPlease make the payment at your earliest convenience.\n\nLet us know if you need any assistance.\n\nBest,\nExpense Ease Team`});
  }
  console.log("Borrower Mail Sent");
}

export const sendInviteMail = ({inviter, invitee}) => {
  console.log("Sending Invite Mail");
  sendEmail({toMail: invitee.email, subject: "Invitation to join ExpenseEase", text: `Hey,\n\n${inviter.name} has invited you to join ExpenseEase!\n\nClick the link below to download the app:\n\nhttps://expo.dev/artifacts/eas/jcvy7AAZgCBa5Z4V7X8FXF.apk\n\nYou will be added as friend to ${inviter.name} as you create account.\n\nBest,\nExpenseEase Team`});
  console.log("Invite Mail Sent");
}

export const findBorrowersAndRemind = async(id) => {
  console.log("Finding Borrowers and Reminding");
  const curUser = await findUserById(id);
  if(!curUser) throw new Error("Error fetching user");
  curUser.lended.forEach(async (borrower) => {
    const borrowerProfile = await user.findById(borrower.borrower_id);
    sendBorrowerMail({borrowerProfile, lender:curUser, amount: borrower.amount});
  });
  console.log("Borrowers Found and Reminded");
}


export const updateFriendlyExchangeStatesOnLending = async ({
  lender_id,
  borrowers,
}) => {
  console.log("Updating Friendly Exchange States on Lending");
  const activeUser = await findUserById(lender_id);
  if (!activeUser)
    throw new Error("No user found to update the friendly states");

  for (const { user_id, amount } of borrowers) {
    let prevBorrower = activeUser.lended.find(
      (b) => b.borrower_id.toString() === user_id.toString()
    );
    if (prevBorrower) {
      prevBorrower.amount += amount;
      const prevBorrowerProfile = await findUserById(prevBorrower.borrower_id.toString()); 
      prevBorrowerProfile.borrowed.forEach((lender) => {
        if (lender.lender_id.toString() === lender_id.toString()) {
          lender.amount += amount;
        }
      });

      await prevBorrowerProfile.save();
      await activeUser.save();
      continue;
    }

    let prevLender = activeUser.borrowed.find(
      (l) => l.lender_id.toString() === user_id.toString()
    );
    if (prevLender) {
      const prevLenderId = prevLender.lender_id.toString();

      if (prevLender.amount > amount) {
        prevLender.amount -= amount;
        const prevLenderProfile = await findUserById(prevLenderId);
        prevLenderProfile.lended.forEach((borrower) => {
          if (borrower.borrower_id.toString() === lender_id.toString()) {
            borrower.amount -= amount;
          }
        });

        await prevLenderProfile.save();
      } else if (prevLender.amount === amount) {
        activeUser.borrowed = activeUser.borrowed.filter(
          (lender) => lender.lender_id.toString() !== prevLenderId
        );
        activeUser.settled.push({ user_id, amount: 0 });

        const prevLenderProfile = await findUserById(prevLenderId);
        prevLenderProfile.lended = prevLenderProfile.lended.filter(
          (borrower) => borrower.borrower_id.toString() !== lender_id.toString()
        );
        prevLenderProfile.settled.push({ user_id: lender_id, amount: 0 });

        await prevLenderProfile.save();
      } else {
        activeUser.borrowed = activeUser.borrowed.filter(
          (lender) => lender.lender_id.toString() !== prevLenderId
        );
        activeUser.lended.push({
          borrower_id: prevLenderId,
          amount: amount - prevLender.amount,
        });

        const prevLenderProfile = await findUserById(prevLenderId);
        prevLenderProfile.lended = prevLenderProfile.lended.filter(
          (borrower) => borrower.borrower_id.toString() !== lender_id.toString()
        );
        prevLenderProfile.borrowed.push({
          lender_id,
          amount: amount - prevLender.amount,
        });

        await prevLenderProfile.save();
        
      }
      await activeUser.save();
      continue;
    } 

    
    let prevSettle = activeUser.settled.find(
      (s) => s.user_id.toString() === user_id.toString()
    );
    if (prevSettle) {
      const prevSettleId = prevSettle.user_id.toString();
      activeUser.settled = activeUser.settled.filter(
        (settle) => settle.user_id.toString() !== prevSettleId
      );
      activeUser.lended.push({ borrower_id: prevSettleId, amount });

      const prevSettleProfile = await findUserById(prevSettleId);
      prevSettleProfile.settled = prevSettleProfile.settled.filter(
        (settle) => settle.user_id.toString() !== lender_id.toString()
      );
      prevSettleProfile.borrowed.push({ lender_id, amount });

      await prevSettleProfile.save();
      await activeUser.save();
      continue;
    }
    activeUser.lended.push({ borrower_id: user_id, amount });

    const newBorrowerProfile = await findUserById(user_id);
    newBorrowerProfile.borrowed.push({ lender_id, amount });

    await newBorrowerProfile.save();
    await activeUser.save();
    continue;


      
  }
  console.log("Friendly Exchange States Updated");
};

export const addUserFriend = async ({ inviter, invitee }) => {
  try {
    console.log("Adding User Friend");
    inviter.settled = inviter.settled || [];
    invitee.settled = invitee.settled || [];
    inviter.settled.push({ user_id: invitee._id, amount: 0 });
    invitee.settled.push({ user_id: inviter._id, amount: 0 });
    await inviter.save();
    await invitee.save();

    const body = `You and ${inviter.name} are now friends. Let the splitting begin!`;
    const tokens = invitee.accessTokens;
    for(const token of tokens) {
      await sendNotificationService({
        token,
        title: "🎉 New Friend Added!",
        body,
      });
    }

    console.log("User Friend Added");
  } catch (error) {
    console.log("Error adding user friend:", error);
    throw new Error("Error adding user friend");
  }
};


//handleDailyLimitReach
