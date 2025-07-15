import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/features.js";
import logger from "../logger/index.js";

import { addFriendsService, addFutureFriendsService, findBorrowersAndRemind, findTodaySpend, findUserById, getFriends, getUserExchangeState, handleGoogleAccessTokenLogin, handleGoogleIdTokenLogin, loginUser, mergeWithDummy, numAlreadyExists, pushNotificationTokenUpdate, registerUser, removeFutureFriend, resetUserPassword, sendBorrowerRemainder, sendOtpMail, tempPhoneCheckService, unifyUserSpendsHistory, updateUserDetails, verifyReceivedOtp } from "../services/userService.js";
import { findUserWallets } from "../services/walletService.js";
import { findUserGroups } from "../services/groupService.js";
import { findUserExpenses } from "../services/expenseService.js";
import { findUserPersonalTransactions } from "../services/personalTransactionService.js";
import { findUserSettlements } from "../services/settlementService.js";
import { findUserDetectedTransactions } from "../services/detectedTransactionService.js";
import { getUserBills } from "../services/billService.js";
import { STATUS_CODES } from "../config/constants.js";
import { withTransaction } from "../utils/transaction.js";


/**
 * 
 * Note - Once a user loggs in with 
 * email and password, they can login into 
 * same account with google login as we are 
 * allowing right now. @todo remove it
 * 
 * @returns response with token
 */
export const googleLoginAccesstoken = async (req, res, next) => {
  try {
    const { user: userData } = req.body;
    if (!userData) {
      throw new ErrorHandler(`No user details from google`, STATUS_CODES.NOT_FOUND);
    }
  
    const newUser = await handleGoogleAccessTokenLogin( userData );

    sendToken(newUser, res, "Welcome to Expenzz", STATUS_CODES.CREATED);
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * Do not use this for now
 * @returns response with token
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: "Id Token is required" });
    }

    const existingUser = await handleGoogleIdTokenLogin(idToken);
    sendToken(existingUser, res, "Welcome to Expenzz", STATUS_CODES.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * 
 * @returns res with boolean for num check
 */
export const userPhoneNumCheck = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const hasPhoneNumber = await tempPhoneCheckService(user_id);
    logger.debug("Check phone number status for " + user_id + " got " + hasPhoneNumber);

    res.status(STATUS_CODES.OK).json({ message: hasPhoneNumber ? "Already has phone number" : "Doesn't have phone number", data: { hasPhoneNumber } });
  } catch (error) {
    next(error);
  }
}

/**
 * 
 * @returns res with boolean for acquired (dummy account) or not
 * based on which we can alert user
 * @throws error if number is taken by another user
 */
export const phoneNumAvailabilityCheck = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { phone_num } = req.query;

    const acquired = await numAlreadyExists({ user_id, phone_num: Number(phone_num) });

    res.status(STATUS_CODES.OK).json({ message: acquired ? "Number taken by dummy account" : "Number Available", data: { isPhoneNumAcquired: acquired } });
  } catch (error) {
    next(error);
  }
}


/**
 * registers with default photo
 * @returns response with new user
 */
export const register = async (req, res, next) => {
  try {
    const newUser = await registerUser(req.body);
    
    sendToken(newUser, res, "Welcome to Expenzz", STATUS_CODES.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * 
 * @returns response with user
 */
export const login = async (req, res, next) => {
  try {
    const loggedUser = await loginUser(req.body);

    sendToken( loggedUser, res, `Logged in`, STATUS_CODES.OK );
  } catch (error) {
    next(error);
  }
};

/**
 * 
 * Issue new token since user_id is 
 * changed
 */
export const mergeToDummy = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { phone_num } = req.params;

    const mergedUser = await withTransaction(async (session) => {
      return await mergeWithDummy({ user_id, phone_num: Number(phone_num) }, session);
    });
    sendToken(mergedUser, res, "Number changed", 200);
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with user's data
 */
export const updateUserNotificationToken = async (req, res, next) => {
  try {
    const user_id = req.user.id;    
    const updatedUser = await pushNotificationTokenUpdate({ user_id, token: req.body.token});

    res.status(STATUS_CODES.OK).json({ message: "Details updated", data: updatedUser });
  } catch (error) {
    next(error);
  }
};



/**
 * 
 * lets update name, 
 * phone number, daily limit and 
 * profile photo
 * 
 * @returns response with updated user
 */
export const updateUser = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const file = req.file;

    const updatedUser = await updateUserDetails({ user_id, data: req.body, file });
    
    res.status(STATUS_CODES.OK).json({ message: "Details updated", data: updatedUser });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * sends otp with expiry time 
 * of 5 mins
 * @returns response with no data
 */
export const sendOtp = async (req, res, next) => {
  try {
      const { email } = req.body;
      await sendOtpMail(email);
      
      res.status(STATUS_CODES.OK).json({message: "OTP sent successfully" });
  } catch (error) {
      next(error);
  }
};


/**
 * 
 * @returns response with no data
 */
export const verifyOtp = async (req, res, next) => {
  try {
      const verified = await verifyReceivedOtp(req.body);
      if(!verified) return res.status(STATUS_CODES.BAD_REQUEST).json({ message: "Invalid OTP" });

      res.status(STATUS_CODES.OK).json({ message: "OTP verified" });
  } catch (error) {
      next(error);
  }
};

/**
 * 
 * @returns response with no data
 */
export const resetPassword = async (req, res, next) => {
    try {
        const { email, newPassword } = req.body;

        await resetUserPassword({ email, password: newPassword });

        res.status(STATUS_CODES.OK).json({ message: "Password reset successfully" });
    } catch (error) {
        next(error);
    }
};

/**
 * 
 * since there is a token based session,
 * logout is simply token removal from frontend
 */
export const logout = async (req, res, next) => {
  try {
    logger.info(`Logging out ${req.user.id}`);

    res.status(STATUS_CODES.OK).json({
      message: "Successfully logged out"
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * also as we attach user through 
 * middleware
 */
export const getMyProfile = (req, res, next) => {
  try {
    res.status(STATUS_CODES.OK).json({
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with groups array
 */
export const getMyGroups = async (req, res, next) => {
  try {
    const id = req.user.id;
    const groups = await findUserGroups(id);

    res.status(STATUS_CODES.OK).json({
      message: "Fetched Groups",
      data: groups
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 
 * @returns resonse with collected transactions, expenses and settlements
 */
export const getUnifiedData = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const unified = await unifyUserSpendsHistory(user_id);

    res.status(STATUS_CODES.OK).json({
      message: "Fetched data",
      data: unified
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 
 * @returns response with expense array
 */
export const getMyExpenses = async(req, res, next) => {
  try {
    const id = req.user.id;
    const expenses = await findUserExpenses({userId: id});

    res.status(STATUS_CODES.OK).json({
      message: "Fetched Expenses",
      data: expenses
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with settlement array
 */
export const getMySettlements = async (req, res, next) => {
  try {
    const userId = req.user.id;

    /**
     * optional
     */
    const { group_id } = req.query;

    const settlements = await findUserSettlements({userId, group_id});

    res.status(STATUS_CODES.OK).json({
      message : "Fetched Settlements",
      data : settlements,
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with wallet array
 */
export const getMyWallets = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const wallets = await findUserWallets(user_id);

    res.status(STATUS_CODES.OK).json({
      message : "Fetched Wallets",
      data: wallets
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with transactions array
 */
export const getMyPersonalTransactions = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const transactions = await findUserPersonalTransactions(user_id);

    res.status(STATUS_CODES.OK).json({
      message : "Fetched Transactions",
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with bill array
 */
export const getMyBills = async(req, res, next) => {
  try {
    const id = req.user._id;
    const {status} = req.query;

    const bills = await getUserBills({userId: id, status});

    res.status(STATUS_CODES.OK).json({
      message: "Fetched Bills",
      data: bills
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * not used currently
 */
export const getMyDetectedTransactions = async (req, res, next) => {
  try {
    const id = req.user._id;
    const transactions = await findUserDetectedTransactions(id);
    res.status(STATUS_CODES.OK).json({
      message: "Fetched",
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with friends array( includes details of them )
 */
export const getFriendlyUsers = async (req, res, next) => {
  try {
    const id = req.user.id;

    const friends = await getFriends(id);

    res.status(STATUS_CODES.OK).json({
      message: "Friends Retrevied",
      data: friends,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with lended amount and borrowed amount
 */
export const getCurrentExhanges = async (req, res, next) => {
  try {
    const id = req.user.id;

    const { lendedAmount, borrowedAmount } = await getUserExchangeState( id );

    res.status(STATUS_CODES.OK).json({
      message: "State Fetched",
      data: {
        lendedAmount,
        borrowedAmount,
      }
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @todo weirdly this sends spend in object,
 * change this later
 * 
 * @returns response with spend data
 */
export const getUserTodaySpend = async (req ,res, next) => {
  try {
    const id = req.user.id;

    const todaySpend = await findTodaySpend(id);

    res.status(STATUS_CODES.OK).json({
      message: "Spend Fetched",
      data: {
        todaySpend
      }
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with no data
 */
export const remindBorrowers = async (req, res, next) => {
  try {
    const id = req.user._id;

    await findBorrowersAndRemind(id);

    res.status(STATUS_CODES.OK).json({
      message: "Reminders Sent"
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with no data
 */
export const remindBorrower = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const { borrower_id } = req.params;

    await sendBorrowerRemainder({ user_id, borrower_id});

    res.status(STATUS_CODES.OK).json({
      message: "Remainder Sent"
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * 
 * @returns response with no data
 */
export const autoAddFutureFriends = async (req, res, next) => {
  try {
    const {email} = req.body;
    await addFutureFriendsService( email );

    return res.status(STATUS_CODES.OK).json({
      message: "Friends added",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with future friends array
 */
export const getUserFutureFriends = async(req, res, next) => {
  try {
    const id = req.user.id;
    const user = await findUserById(id);
    if(!user) throw new ErrorHandler(`user not found: ${id}`);

    const futureFriends = user.futureFriends;

    res.status(STATUS_CODES.OK).json({
      message: "Requested Friends Fetched",
      data: futureFriends
    });
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with user details
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await findUserById(id);
    if(!user) throw new ErrorHandler(`user not found: ${id}`);

    res.status(STATUS_CODES.OK).json({
      message: "Details Fetched",
      data: user
    })
  } catch (error) {
    next(error);
  }
}


/**
 * 
 * @returns response with no data
 */
export const addUserFriends = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const { invitees } = req.body;

    await addFriendsService({ user_id, invitees});

    return res.status(STATUS_CODES.OK).json({
      message: "Friends added",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with no data
 */
export const removeFriendInvite = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user_id = req.user._id;

    await removeFutureFriend({ user_id, email });

    return res.status(STATUS_CODES.OK).json({
      message: "Invite Removed",
    });
  } catch (error) {
    next(error);
  }
}
