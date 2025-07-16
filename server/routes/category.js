import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createCategory, deleteCategory, getUserCategories, updateCategory } from "../controller/categoryController.js";


/**
 * @todo implement validation for these requests
 */

const router = express.Router();

//* POST APIs *//
router.post("/new",isAuthenticated, createCategory);

//* GET APIs *//
router.get("/all", isAuthenticated, getUserCategories);

//* PUT APIs *//
router.put("/:id", isAuthenticated, updateCategory);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteCategory);

export default router;
