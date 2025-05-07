import user from "../models/user.js";
import { sendEmail, sendNotificationService } from "./notificationService.js";
import personalTransaction from "../models/personalTransaction.js";
import expense from "../models/expense.js";
import bill from "../models/bill.js";

export const findUserById = async (id) => {
  console.log(`Finding User with ID: ${id}`);
  if (!id) throw new Error("No user id provided");

  const curUser = await user.findById(id);
  if (!curUser) throw new Error("No user with given id exists");

  return curUser;
};

export const isToday = (date) => {
  try{
    if(!date) {
      console.log("Date is undefined");
      throw new Error("Date is undefined");
    }  
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
  catch (error) {
    console.log("Error checking if date is today", error);
    throw new Error("Error checking if date is today");
  }
}

export const findTodaySpend = async(id) => {
  try {
    if(!id) {
      console.log(`User id is undefined: ${id}`);
      throw new Error(`User id is undefined: ${id}`);
    }
    const personalTransactions = await personalTransaction.find({transaction_type: 'expense', user_id: id}, 'created_at_date_time amount');
    const expenses = await expense.find({'lenders.user_id': id}, 'created_at_date_time lenders');
    let todaysSpend = 0;

    for (const expense of expenses){
      if(isToday(expense.created_at_date_time)) {
        const lender = expense.lenders[0];
        if(lender){
          todaysSpend += lender.amount;
        }
      }
    }

    for(const transaction of personalTransactions){
      if(isToday(transaction.created_at_date_time)) {
        todaysSpend += transaction.amount;
      }
    }
    return todaysSpend;
  } catch (error) {
    console.log("Error calculating todays spend", error);
    throw new Error("Error calculating todays spend");
  }
}

export const extractTempName = (email) => {
  try{  
    console.log("Extracting Temporary Name");
    if(!email) {
      console.log(`Email is undefined: ${email}`);
      throw new Error(`Email is undefined: ${email}`);
    }
    const name = email.split("@")[0]; 
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  catch (error) {
    console.log("Error extracting temporary name", error);
    throw new Error("Error extracting temporary name");
  }
}

export const sendBorrowerMail = ({borrowerProfile, lender, amount, group}) => {
  try{  
    console.log("Sending Borrower Mail");
    if(!borrowerProfile || !lender || !amount) {
      console.log(`Borrower profile, lender or amount is undefined: ${borrowerProfile}, ${lender}, ${amount}`);
      throw new Error(`Borrower profile, lender or amount is undefined: ${borrowerProfile}, ${lender}, ${amount}`);
    }
    if(group) {
      sendEmail({toMail: borrowerProfile.email, subject: "Settle your Dues", text: `Hey ${borrowerProfile.name},\n\n${lender.name} has requested you to clear their dues of ${amount} in group ${group.group_title}.\n\nPlease make the payment at your earliest convenience.\n\nLet us know if you need any assistance.\n\nBest,\nExpense Ease Team`});
    } else {
      sendEmail({toMail: borrowerProfile.email, subject: "Settle your Dues", text: `Hey ${borrowerProfile.name},\n\n${lender.name} has requested you to clear their dues of ${amount}.\n\nPlease make the payment at your earliest convenience.\n\nLet us know if you need any assistance.\n\nBest,\nExpense Ease Team`});
    }
  }
  catch (error) {
    console.log("Error sending borrower mail", error);
    throw new Error("Error sending borrower mail");
  }
}

export const sendInviteMail = ({inviter, invitee}) => {
  try{  
    console.log("Sending Invite Mail");
    if(!inviter || !invitee) {
      console.log(`Inviter or invitee is undefined: ${inviter}, ${invitee}`);
      throw new Error(`Inviter or invitee is undefined: ${inviter}, ${invitee}`);
    }
    sendEmail({toMail: invitee.email, subject: "Invitation to join ExpenseEase", text: `Hey,\n\n${inviter.name} has invited you to join ExpenseEase!\n\nClick the link below to download the app:\n\nhttps://expo.dev/artifacts/eas/jcvy7AAZgCBa5Z4V7X8FXF.apk\n\nYou will be added as friend to ${inviter.name} as you create account.\n\nBest,\nExpenseEase Team`});
  }
  catch (error) {
    console.log("Error sending invite mail", error);
    throw new Error("Error sending invite mail");
  }
}

export const findBorrowersAndRemind = async(id) => {
  try{  
    console.log("Finding Borrowers and Reminding");
    if(!id) {
      console.log(`User id is undefined: ${id}`);
      throw new Error(`User id is undefined: ${id}`);
    } 
    const curUser = await findUserById(id);
    curUser.lended.forEach(async (borrower) => {
      const borrowerProfile = await user.findById(borrower.borrower_id);
      sendBorrowerMail({borrowerProfile, lender:curUser, amount: borrower.amount});
    });
  }
  catch (error) {
    console.log("Error finding borrowers and reminding", error);
    throw new Error("Error finding borrowers and reminding");
  }
}


export const updateFriendlyExchangeStatesOnLending = async ({
  lender_id,
  borrowers,
}) => {
  try{  
    console.log("Updating Friendly Exchange States on Lending");
    if (!lender_id || !borrowers) {
      console.log(`Lender id or borrowers is undefined: ${lender_id}, ${borrowers}`);
      throw new Error(`Lender id or borrowers is undefined: ${lender_id}, ${borrowers}`);
    }
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
  }
  catch (error) {
    console.log("Error updating friendly exchange states on lending", error);
    throw new Error("Error updating friendly exchange states on lending");
  }
};

export const addUserFriend = async ({ inviter, invitee }) => {
  try {
    console.log("Adding User Friend");
    if (!inviter || !invitee) {
      console.log(`Inviter or invitee is undefined: ${inviter}, ${invitee}`);
      throw new Error(`Inviter or invitee is undefined: ${inviter}, ${invitee}`);
    }
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
  } catch (error) {
    console.log("Error adding user friend:", error);
    throw new Error("Error adding user friend");
  }
};


//handleDailyLimitReach
