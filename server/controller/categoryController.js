import { MESSAGES, STATUS_CODES } from "../config/constants.js";
import { createCategoryService, deleteCategoryService, findUserCategories, updateCategoryService } from "../services/categoryService.js";

export const createCategory = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const newCategory = await createCategoryService({...req.body, user_id});

    res.status(STATUS_CODES.CREATED).json({
      message: MESSAGES.RESOURCE_CREATED("Category"),
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};


export const updateCategory = async (req, res, next) => {
  try {
    const updatedCategory = await updateCategoryService({category_id: req.params.id, data: req.body});
    
    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.RESOURCE_UPDATED("Category"),
      data: updatedCategory,
    });
  
  } catch (error) {
    next(error);
  }
};



export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteCategoryService({category_id: id, user_id: req.user.id});
  
    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.DELETED,
    });
  } catch (error) {
    next(error);
  }
};


export const getUserCategories = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const categories = await findUserCategories(user_id);

    res.status(STATUS_CODES.OK).json({
      message : "Fetched Categories",
      data: categories
    });
  } catch (error) {
    next(error);
  }
};