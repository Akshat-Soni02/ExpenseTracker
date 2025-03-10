import user from "../models/user.js";
import { sendEmail } from "./notificationService.js";

export const findUserById = async (id) => {
  const curUser = await user.findById(id);
  if (!curUser) throw new Error("No user with given id exists");
  return curUser;
};

export const extractTempName = (email) => {
  const name = email.split("@")[0]; 
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const sendBorrowerMail = ({borrowerProfile, lender, amount, group}) => {
  if(group) {
    sendEmail({toMail: borrowerProfile.email, subject: "Settle your Dues", text: `Hey ${borrowerProfile.name},\n\n${lender.name} has requested you to clear their dues of ${amount} in group ${group.group_title}.\n\nPlease make the payment at your earliest convenience.\n\nLet us know if you need any assistance.\n\nBest,\nExpense Tracker Team`});
  } else {
    sendEmail({toMail: borrowerProfile.email, subject: "Settle your Dues", text: `Hey ${borrowerProfile.name},\n\n${lender.name} has requested you to clear their dues of ${amount}.\n\nPlease make the payment at your earliest convenience.\n\nLet us know if you need any assistance.\n\nBest,\nExpense Tracker Team`});
  }
}

export const findBorrowersAndRemind = async(id) => {
  const curUser = await findUserById(id);
  if(!curUser) throw new Error("Error fetching user");
  curUser.lended.forEach(async (borrower) => {
    const borrowerProfile = await user.findById(borrower.borrower_id);
    sendBorrowerMail({borrowerProfile, lender:curUser, amount: borrower.amount});
  });
}


export const updateFriendlyExchangeStatesOnLending = async ({
  lender_id,
  borrowers,
}) => {
  console.log(lender_id);
  const activeUser = await findUserById(lender_id);
  if (!activeUser)
    throw new Error("No user found to update the friendly states");

  console.log(activeUser);
  console.log(borrowers);
  for (const { user_id, amount } of borrowers) {
    let prevBorrower = activeUser.lended.find(
      (b) => b.borrower_id.toString() === user_id.toString()
    );
    if (prevBorrower) {
      console.log("Its previous borrower");
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
      console.log("Its previous lender");
      console.log(prevLender);
      const prevLenderId = prevLender.lender_id.toString();
      console.log(prevLenderId);

      if (prevLender.amount > amount) {
        prevLender.amount -= amount;
        console.log("prev lender amount is greater than amount");
        const prevLenderProfile = await findUserById(prevLenderId);
        console.log("Prev lender profile: " + prevLenderProfile);
        prevLenderProfile.lended.forEach((borrower) => {
          if (borrower.borrower_id.toString() === lender_id.toString()) {
            borrower.amount -= amount;
            console.log("amount updated in prevlenderprofile");
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
      console.log("Its previous settle");
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
    console.log("Its new relation");
    activeUser.lended.push({ borrower_id: user_id, amount });

    const newBorrowerProfile = await findUserById(user_id);
    newBorrowerProfile.borrowed.push({ lender_id, amount });

    await newBorrowerProfile.save();
    await activeUser.save();
    continue;


      
  }
};

//handleDailyLimitReach
