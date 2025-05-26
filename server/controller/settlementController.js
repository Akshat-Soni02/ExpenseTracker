import { createSettleService, deleteSettleService, fetchSettlementDetails, updateSettleService } from "../services/settlementService.js";
import { MESSAGES, STATUS_CODES } from "../config/constants.js";
import { withTransaction } from "../utils/transaction.js";

/**
 * 
 * group_id is optional since the 
 * settlement can be outside the group in which 
 * case all groups will be settled
 * 
 * @returns response with new settlement
 */
export const createSettlement = async (req, res, next) => {
  try {
    const id = req.user._id;
    
    const newSettlement = await withTransaction(async (session) => {
        return await createSettleService({ user_id: id, data: req.body }, session);
    });
    
    res.status(STATUS_CODES.CREATED).json({
      message : MESSAGES.RESOURCE_CREATED("Settlement"),
      data : newSettlement,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @todo the functionality is incomplete,
 * for now user can only update their settlement description
 * @returns response with updated settlement
 */
export const updateSettlement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedSettle = await updateSettleService({ settlement_id: id, data: req.body});

    res.status(STATUS_CODES.OK).json({
      message : MESSAGES.RESOURCE_UPDATED("Settlement"),
      data : updatedSettle,
    });
  } catch (error) {
    next(error)
  }
};


/**
 * 
 * 
 * @returns response with no data
 */
export const deleteSettlement = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await withTransaction(async (session) => {
      return await deleteSettleService(id, session);
    })

    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.DELETED,
    });

  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with detailed settlement
 */
export const getSettlementById = async (req, res, next) => {
  try {
    const curSettlement = await fetchSettlementDetails(req.params.id);

    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.FETCHED("Settlement"),
      data : curSettlement,
    });

  } catch (error) {
    next(error);
  }
};