import { z } from "zod";

export const createPersonalTransactionSchema = z.object({
  body: z.object({
  transaction_type: z.enum(["income", "expense"], {
    required_error: "Transaction type is required",
  }),
  description: z.string({
        required_error: "Description is required",
      })
      .trim()
      .min(1, 'Description cannot be empty'),
  amount: z.coerce.number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number or string of numbers",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      }),
  wallet_id: z.string()
      .trim()
      .min(1,'Wallet id cannot be empty')
      .optional(),
  transaction_category: z.string()
      .trim()
      .min(1,'Transaction category cannot be empty')
      .optional(),
  notes: z.string()
      .trim()
      .min(1,'Notes cannot be empty')
      .optional(),
  created_at_date_time: z.coerce.date().or(z.string().datetime()),
  }),
  query: z.object({}),
  params: z.object({}),
  file: z.object({}).optional(),
});    //file???????????????

export const updatePersonalTransactionSchema = z.object({
    params : z.object({
        personalTransaction_id : z.string({
          required_error:"Personal Transaction id is required"
        })
        .trim()
        .min(1, "Personal Transaction id cannot be empty")
    }),
    body: z.object({
        transaction_type: z.enum(["income", "expense"]).optional(),
        description: z.string({
          required_error: "Description is required",
        })
        .trim()
        .min(1, 'Description cannot be empty')
        .optional(),
        amount:  z.coerce.number({
          required_error: "Amount is required",
          invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
          message: "Amount must be a positive number",
        })
        .optional(),
        wallet_id: z.string()
        .trim()
        .min(1,'Wallet id cannot be empty')
        .optional(),
        transaction_category: z.string()
        .trim()
        .min(1,'Transaction category cannot be empty')
        .optional(),
        notes: z.string()
        .trim()
        .min(1,'Notes cannot be empty')
        .optional(),
        created_at_date_time: z.coerce.date().or(z.string().datetime())
        .optional(),
    }),
    query: z.object({}),
    file: z.object({}).optional(),
  });

export const deletePersonalTransactionSchema = z.object({
    params: z.object({
        personalTransaction_id: z.string({
          required_error:"Personal Transaction id is required"
        }).trim().min(1, "Personal Transaction id cannot be empty") 
    }),
    body: z.object({}),
    query: z.object({}),
    file: z.object({}).optional(),
}); 

export const getPersonalTransactionSchema = z.object({
    params: z.object({
        personalTransaction_id: z.string({
          required_error:"Personal Transaction id is required"
        })
        .trim()
        .min(1, "Personal Transaction id cannot be empty") 
    }),
    body: z.object({}),
    query: z.object({}),
    file: z.object({}).optional(),
});


export const getUserPeriodTypeTransactionsSchema = z.object({
  body: z.object({
    start_date: z.string().datetime({
      message: "Start date must be a valid ISO datetime string",
    }),
    end_date: z.string().datetime({
      message: "End date must be a valid ISO datetime string",
    }),
    transaction_type: z.enum(["income", "expense"]).optional(),
  }),
  query: z.object({}),
  params: z.object({}),
  file: z.object({}).optional(),
});
