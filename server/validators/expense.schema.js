import { query } from "express";
import { z } from "zod";
import group from "../models/group";

const lenderBorrowerSchema = z.object({
  user_id: z.string({
    required_error: "User id is required",
  })
  .trim()
  .min(1, "User id cannot be empty"),
  amount: z.coerce.number({
    required_error: "Amount is required",
    invalid_type_error: "Amount must be a number or string of numbers",
  }).refine((val) => val > 0, {
    message: "Amount must be a positive number",
  }), 
});

export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string({        
      required_error: "Description is required",
    })
    .trim()
    .min(1, "Description cannot be empty"),
    wallet_id:  z.string()
    .trim()
    .min(1, "Wallet id cannot be empty")
    .optional(),
    total_amount: z.coerce.number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number or string of numbers",
    }).refine((val) => val > 0, {
      message: "Amount must be a positive number",
    }),
    expense_category: z.string()
    .trim()
    .min(1, "Expense category cannot be empty")
    .optional(),
    notes: z.string()
    .trim()
    .min(1, "Notes cannot be empty")
    .optional(),
    group_id: z.string()
    .trim()
    .min(1, "Group id cannot be empty")
    .optional(),
    created_at_date_time: z.coerce.date().or(z.string().datetime()),

    // JSON parsed fields from req.body
    lenders: z.array(lenderBorrowerSchema).min(1, "At least one lender is required"),
    borrowers: z.array(lenderBorrowerSchema).min(1, "At least one borrower is required"),
  }),
  params: z.object({}).optional(), // Add fields if you want to validate params
  query: z.object({}).optional(),  // Add fields if you want to validate query
  file: z.any().optional(), 
});



export const updateExpenseSchema = z.object({
    params: z.object({
        expense_id: z.string({
          required_error: "Expense id is required",
        })
        .trim()
        .min(1, "Budget id cannot be empty") 
    }),
    body: z.object({
      description: z.string()
      .trim()
      .min(1, "Description cannot be empty")
      .optional(),
      total_amount: z.coerce.number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number or string of numbers",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      })
      .optional(),
      expense_category: z.string()
      .trim()
      .min(1, "Expense category cannot be empty")
      .optional(),
      notes: z.string()
      .trim()
      .min(1, "Notes cannot be empty")
      .optional(),
      wallet_id: z.string()
      .trim()
      .min(1, "Wallet id cannot be empty")
      .optional(),
      group_id: z.string()
      .trim()
      .min(1, "Group id cannot be empty")
      .optional(),
      created_at_date_time: z.coerce.date().or(z.string().datetime()).optional(),

      lenders: z.array(lenderBorrowerSchema).optional(),
      borrowers: z.array(lenderBorrowerSchema).optional(),
    }),
    query: z.object({}).optional(), // Add fields if you want to validate query
    file: z.any().optional(),
});


export const deleteExpenseSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: "Expense id is required",
      })
      .trim()
      .min(1, "Expense id cannot be empty") 
    }),
    body: z.object({}).optional(), 
    query: z.object({}).optional(), 
    file: z.any().optional(), 
}); 

export const getExpenseSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: "Expense id is required",
      })
      .trim()
      .min(1, "Expense id cannot be empty") 
    }),
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    file: z.any().optional(),
  });

export const getUserPeriodExpensesSchema = z.object({
  query: z.object({
    start_date: z.string().datetime({
      message: "Start date must be a valid ISO datetime string",
    }),
    end_date: z.string().datetime({
      message: "End date must be a valid ISO datetime string",
    }),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(), 
  file: z.any().optional(),
});

export const getUserExpensesSchema = z.object({
  query: z.object({
    group_id: z.string({
      required_error: "Group id is required",
    })
    .trim()
    .min(1, 'Group id cannot be empty')
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(), 
  file: z.any().optional(),
});

export const getCustomExpensesSchema = z.object({
  query: z.object({
    description: z.string({        
      required_error: "Description is required",
    })
    .trim()
    .min(1, "Description cannot be empty")
    .optional(),
    lender_id: z.string()
    .trim()
    .min(1, "Lender id cannot be empty")
    .optional(),
    borrower_id: z.string()
    .trim()
    .min(1, "Borrower id cannot be empty")
    .optional(),
    wallet_id: z.string()
    .trim()
    .min(1, "Wallet id cannot be empty")
    .optional(),
    group_id: z.string()
    .trim()
    .min(1, "Group id cannot be empty")
    .optional(),
    category: z.string()
    .trim()
    .min(1, "Expense category cannot be empty")
    .optional(),
    min_amount : z.coerce.number({
      invalid_type_error: "Min amount must be a number or string of numbers",
    }).refine((val) => val > 0, {
      message: "Min amount must be a positive number",
    }).optional(),
    max_amount : z.coerce.number({
      invalid_type_error: "Max amount must be a number or string of numbers",
    }).refine((val) => val > 0, {
      message: "Max amount must be a positive number",
    })
    .optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(), 
  file: z.any().optional(),
});  