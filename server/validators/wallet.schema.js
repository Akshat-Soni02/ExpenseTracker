import { z } from 'zod';

export const createWalletSchema = z.object({
    body: z.object({
      wallet_title: z.string({
        required_error: "Wallet title is required",
      })
      .trim()
      .min(1, 'Wallet title cannot be empty'), 
      amount: z.coerce.number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number or string of numbers",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      }),
      lower_limit: z.coerce.number({
        invalid_type_error: "lower_limit must be a number or string of numbers",
      }).refine((val) => val >= 0, {
        message: "lower_limit must be a non-negative number",
      }).optional().default(0), 
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional()
});

export const updateWalletSchema = z.object({
  body: z.object({
    wallet_title: z.string()
      .trim()                   
      .min(1, "Wallet title cannot be empty or whitespace")
      .optional(), 
    amount: z.coerce.number({
      invalid_type_error: "Amount must be a number or string of numbers",
    }).refine((val) => val > 0, {
      message: "Amount must be a positive number",
    }).optional(), 
    lower_limit: z.coerce.number({
      invalid_type_error: "lower_limit must be a number or string of numbers",
    }).refine((val) => val >= 0, {
      message: "lower_limit must be a non-negative number",
    }).optional(), 
  }),
  query: z.object({}), 
  params: z.object({}),
  file: z.object({}).optional()
});


export const deleteWalletParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        id: z.string({
          required_error:"Wallet id is required"
        })
        .trim()
        .min(1, 'Wallet id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const getWalletByIdParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        id: z.string({
          required_error:"Wallet id is required"
        })
        .trim()
        .min(1, 'Wallet id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const walletsAmountTransferSchema = z.object({
    body: z.object({
        amount: z.coerce.number({
          invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
          message: "Amount must be a positive number",
        }),
    }),
    query: z.object({
        fromWallet: z.string({
          required_error:"fromWallet id is required"
        })
        .trim()
        .min(1, 'fromWallet id cannot be empty'),
        toWallet: z.string({
          required_error:"toWallet id is required"
        })
        .trim()
        .min(1, 'toWallet id cannot be empty'),
    }),
    params: z.object({}),
    file: z.object({}).optional()
  });