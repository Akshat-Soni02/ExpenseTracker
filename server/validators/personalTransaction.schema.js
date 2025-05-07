import { z } from "zod";

export const createPersonalTransactionSchema = z.object({
  transaction_type: z.enum(["income", "expense"], {
    required_error: "Transaction type is required",
  }),
  description: z.string().min(1, "Description is required"),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    }),
  wallet_id: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Personal Transaction wallet id cannot be empty",
  }),
  transaction_category: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Personal Transaction category cannot be empty",
  }),
  notes: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
    message: "Personal Transaction notes cannot be empty",
  }),
  created_at_date_time: z.coerce.date().or(z.string().datetime()),
});    //file???????????????

export const updatePersonalTransactionSchema = z.object({
    params : z.object({
        personalTransaction_id : z.string().min(1, "Personal Transaction id is required")
    }),
    body: z.object({
        transaction_type: z.enum(["income", "expense"]).optional(),
        description: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
            message: "Personal Transaction description cannot be empty",
          }),
        amount: z
        .union([z.string(), z.number()])
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val) && val >= 0, {
            message: "Amount must be a valid non-negative number",
        })
        .optional(),
        wallet_id: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
            message: "Personal Transaction wallet id cannot be empty",
          }),
        transaction_category: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
            message: "Personal Transaction category cannot be empty",
          }),
        notes: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
            message: "Personal Transaction notes cannot be empty",
          }),
        created_at_date_time: z
        .string()
        .datetime()
        .optional(),
    }),
  });

export const deletePersonalTransactionSchema = z.object({
    params: z.object({
        personalTransaction_id: z.string().min(1, "Personal Transaction id is required") 
    }),
}); 

export const getPersonalTransactionSchema = z.object({
    params: z.object({
        personalTransaction_id: z.string().min(1, "Personal Transaction id is required") 
    }),
});


export const getUserPeriodTypeTransactionsSchema = z.object({
    start_date: z.string().datetime({
      message: "Start date must be a valid ISO datetime string",
    }),
    end_date: z.string().datetime({
      message: "End date must be a valid ISO datetime string",
    }),
    transaction_type: z.enum(["income", "expense"]).optional(),
});
