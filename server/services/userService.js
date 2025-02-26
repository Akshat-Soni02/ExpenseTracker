import user from "../models/user.js";

export const findUserById = async (id) => {
  const curUser = await user.findById(id);
  if (!curUser) throw new Error("No user with given id exists");
  return curUser;
};

export const updateFriendlyExchangeStatesOnLending = async ({
  lender_id,
  borrowers,
}) => {
  const activeUser = await findUserById(lender_id);
  if (!activeUser)
    throw new Error("No user found to update the friendly states");

  for (const { user_id, amount } of borrowers) {
    let prevBorrower = activeUser.lended.find(
      (b) => b.borrower_id.toString() === user_id
    );
    let prevLender = activeUser.borrowed.find(
      (l) => l.lender_id.toString() === user_id
    );
    let prevSettle = activeUser.settled.find(
      (s) => s.user_id.toString() === user_id
    );

    if (prevBorrower) {
      console.log("A previous borrower");
      console.log("prevamount =", prevBorrower.amount);
      console.log("New amount =", amount);
      prevBorrower.amount += amount;

      const prevBorrowerProfile = await findUserById(prevBorrower.borrower_id);
      prevBorrowerProfile.borrowed.forEach((lender) => {
        if (lender.lender_id.toString() === lender_id) {
          lender.amount += amount;
        }
      });

      await prevBorrowerProfile.save();
    } else if (prevLender) {
      const prevLenderId = prevLender.lender_id;

      if (prevLender.amount > amount) {
        prevLender.amount -= amount;

        const prevLenderProfile = await findUserById(prevLenderId);
        prevLenderProfile.lended.forEach((borrower) => {
          if (borrower.borrower_id.toString() === lender_id) {
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
          (borrower) => borrower.borrower_id.toString() !== lender_id
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
          (borrower) => borrower.borrower_id.toString() !== lender_id
        );
        prevLenderProfile.borrowed.push({
          lender_id,
          amount: amount - prevLender.amount,
        });

        await prevLenderProfile.save();
      }
    } else if (prevSettle) {
      const prevSettleId = prevSettle.user_id;
      activeUser.settled = activeUser.settled.filter(
        (settle) => settle.user_id.toString() !== prevSettleId
      );
      activeUser.lended.push({ borrower_id: prevSettleId, amount });

      const prevSettleProfile = await findUserById(prevSettleId);
      prevSettleProfile.settled = prevSettleProfile.settled.filter(
        (settle) => settle.user_id.toString() !== lender_id
      );
      prevSettleProfile.borrowed.push({ lender_id, amount });

      await prevSettleProfile.save();
    } else {
      console.log("New friend");
      activeUser.lended.push({ borrower_id: user_id, amount });

      const newBorrowerProfile = await findUserById(user_id);
      newBorrowerProfile.borrowed.push({ lender_id, amount });

      await newBorrowerProfile.save();
    }
  }

  await activeUser.save();
};
