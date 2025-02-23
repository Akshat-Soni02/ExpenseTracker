import group from "../models/group.js";
import ErrorHandler from "../middlewares/error.js";

export const createGroup = async (req, res, next) => {
  try {
    const id = req.user._id;
    const { group_title, initial_budget, settle_up_date } = req.body;

    const curGroup = await group.create({
      group_title,
      initial_budget,
      settle_up_date,
      creator_id: id,
    });
    res.status(201).json({
      success: true,
      curGroup,
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
