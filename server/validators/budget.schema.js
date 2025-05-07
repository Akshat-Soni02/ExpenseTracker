import { z } from "zod";

export const createBudgetSchema = z.object({
  budget_title: z.string().min(1, "Budget title is required"),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    }),
  budget_category: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Budget category cannot be empty",
  }),
  period: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Budget period cannot be empty",
  }),
});


export const updateBudgetSchema = z.object({
    params: z.object({
      id: z.string().min(1, "Budget id is required") // For something like /bills/:id
    }),
    body: z.object({
      budget_title: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
        message: "Budget title cannot be empty",
      }),
      budget_category: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
        message: "Budget category cannot be empty",
      }),
      period: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
        message: "Budget period cannot be empty",
      }),
      amount: z
        .union([z.string(), z.number()])
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val) && val > 0, {
          message: "Amount must be a positive number",
        })
        .optional(),
    }),
  }); 

  export const deleteBudgetSchema = z.object({
    params: z.object({
      id: z.string().min(1, "Budget id is required") // For something like /bills/:id
    }),
  }); 


  export const getBudgetSchema = z.object({
    params: z.object({
      id: z.string().min(1, "Budget id is required") // For something like /bills/:id
    }),
  }); 





