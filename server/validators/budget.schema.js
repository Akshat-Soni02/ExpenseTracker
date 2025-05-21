import { z } from "zod";

export const createBudgetSchema = z.object({
  body: z.object({
    budget_title: z.string({
        required_error: "Budget title is required",
      })
      .trim()
      .min(1,'Budget title cannot be empty'),
    amount: z.coerce.number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number or string of numbers",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      }),
    budget_category: z.string()
      .trim()
      .min(1,'Budget category cannot be empty')
      .optional(),
    period: z.string()
      .trim()
      .min(1,'Budget period cannot be empty')
      .optional(),
  }),
  query: z.object({}),
  params: z.object({}),
  file: z.object({}).optional(),
});


export const updateBudgetSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: "Budget id is required",
      })
      .trim()
      .min(1, "Budget id cannot be empty") 
    }),
    body: z.object({
      budget_title: z.string()
      .trim()
      .min(1,'Budget title cannot be empty')
      .optional(),
      budget_category: z.string()
      .trim()
      .min(1,'Budget category cannot be empty')
      .optional(),
      period: z.string()
      .trim()
      .min(1,'Budget period cannot be empty')
      .optional(),
      amount: z.coerce.number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number or string of numbers",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      })
      .optional(),
    }),
    query: z.object({}),
    file: z.object({}).optional(),
  }); 

  export const deleteBudgetSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: "Budget id is required",
      })
      .trim()
      .min(1, "Budget id cannot be empty") 
    }),
    body: z.object({}),
    query: z.object({}),
    file: z.object({}).optional()
  }); 


  export const getBudgetSchema = z.object({
    params: z.object({
      id: z.string({
        required_error: "Budget id is required",
      })
      .trim()
      .min(1, "Budget id cannot be empty") 
    }),
    body: z.object({}),
    query: z.object({}),
    file: z.object({}).optional()
  }); 





