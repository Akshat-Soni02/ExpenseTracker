import { z } from "zod";

export const lenderBorrowerSchema = z.object({
  user_id: z.string().min(1, "User id is required"),
  amount: z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val > 0, {
    message: "Amount must be a positive number",
  }), 
});

export const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  wallet_id: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense wallet id cannot be empty",
  }),
  total_amount: z
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val > 0, {
    message: "Amount must be a positive number",
  }),
  expense_category: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense category cannot be empty",
  }),
  notes: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense notes cannot be empty",
  }),
  group_id: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense group id cannot be empty",
  }),
  created_at_date_time: z.coerce.date().or(z.string().datetime()),

  // JSON parsed fields from req.body
  lenders: z.array(lenderBorrowerSchema).min(1, "At least one lender is required"),
  borrowers: z.array(lenderBorrowerSchema).min(1, "At least one borrower is required"),
});

import { z } from "zod";

// ObjectId validator (24-char hex string)

export const updateExpenseSchema = z.object({
    params: z.object({
        expense_id: z.string().min(1, "Budget id is required") // For something like /bills/:id
    }),
  description: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense description cannot be empty",
  }),
  total_amount: z.optional()
  .union([z.string(), z.number()])
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val > 0, {
    message: "Amount must be a positive number",
  }),
  expense_category: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense category cannot be empty",
  }),
  notes: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense notes cannot be empty",
  }),
  wallet_id: objectId.optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense wallet id cannot be empty",
  }),
  group_id: objectId.optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Expense group id cannot be empty",
  }),
  created_at_date_time: z.coerce.date().or(z.string().datetime()).optional(),

  lenders: z.array(lenderBorrowerSchema).optional(),
  borrowers: z.array(lenderBorrowerSchema).optional(),
});


export const deleteExpenseSchema = z.object({
    params: z.object({
      id: z.string().min(1, "Expense id is required") 
    }),
}); 

export const getExpenseSchema = z.object({
    params: z.object({
      id: z.string().min(1, "Expense id is required") 
    }),
  });

export const getUserPeriodExpensesSchema = z.object({
    startDate: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      "startDate must be a valid ISO date string"
    ),
    endDate: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      "endDate must be a valid ISO date string"
    ),
  });

  