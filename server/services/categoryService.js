import category from "../models/category.js";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import logger from "../logger/index.js";
import ErrorHandler from "../middlewares/error.js";

/**
 * Regarding creation of new category we implement unique
 * category name but for is_deleted = false (Active categories 
 * should have unique name)
 */

const GLOBAL_CATEGORY_SLUGS = [
    "food",
    "transport",
    "shopping",
    "bills",
    "entertainment",
    "general"
];


export function slugify(name) {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
}


/**
 * 
 * @param {{name: string, user_id: string}} data 
 * @returns category object
 */
export const createCategoryService = async (data) => {

  const name_slug = slugify(data.name);
  if(GLOBAL_CATEGORY_SLUGS.includes(name_slug)) throw new ErrorHandler(`duplicate category creation`, STATUS_CODES.SERVER_ERROR);

  const newCategory = await category.create({...data, is_deleted: false, name_slug });

  if(!newCategory) throw new ErrorHandler(`db operation failed to create category`, STATUS_CODES.SERVER_ERROR);

  logger.info(`category ${newCategory._id} created by user ${data.user_id}`);
  return newCategory;
}

/**
 * 
 * @param {{category_id: string, data: { name: string }}} param0 
 * @returns updated category
 */
export const updateCategoryService = async ({category_id, data}) => {

  const name_slug = slugify(data.name);
  if(GLOBAL_CATEGORY_SLUGS.includes(name_slug)) throw new ErrorHandler(`duplicate category creation`, STATUS_CODES.SERVER_ERROR);

  const updatedCategory = await category.findByIdAndUpdate(category_id, { ...data, name_slug }, {
    new: true,
    runValidators: true
  });

  if(!updatedCategory) throw new ErrorHandler(`Category not found to update data: ${category_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });

  logger.info(`category ${category_id} 's details updated`);
  return updatedCategory;
}

/**
 * 
 * @param {string} user_id 
 * @returns categories
 */
export const findUserCategories = async (user_id) => {
    const categories = await category.find({
        is_deleted: false,
        $or: [
            { user_id: user_id },
            { user_id: null }
        ]
    });
      
    return categories;
};


/**
 * 
 * @param {{category_id: string, user_id: string}} param0 
 */
export const deleteCategoryService = async ({category_id, user_id}) => {
  /**
   * soft delete
   */
  const deletedCategory = await category.findByIdAndUpdate(category_id, { is_deleted: true });

  if(!deletedCategory) throw new ErrorHandler(`Category not found to delete: ${category_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });

  logger.info(`Category ${category_id} deleted by user ${user_id}`);
}