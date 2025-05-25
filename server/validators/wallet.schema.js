import { z } from 'zod';

export const createWalletSchema = z.object({
    body: z.object({
      wallet_title: z.string({
        required_error: "Title is required",
      })
      .trim()
      .min(1, 'Wallet title cannot be empty'),
      amount: z.coerce.number({
        required_error: "Amount is required",
        invalid_type_error: "NCERR:Amount must be a number or string",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      }),
      lower_limit: z.coerce.number({
        invalid_type_error: "NCERR:Lower limit must be a number or string of numbers",
      }).refine((val) => val >= 0, {
        message: "Lower limit must be a non-negative number",
      }).optional(), 
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional()
});

export const updateWalletSchema = z.object({
  body: z.object({
    wallet_title: z.string()
      .trim()                   
      .optional(),
    amount: z.coerce.number({
      invalid_type_error: "NCERR:Amount must be a number or string of numbers",
    }).refine((val) => val > 0, {
      message: "Amount must be positive",
    }).optional(), 
    lower_limit: z.coerce.number({
      invalid_type_error: "NCERR:Lower limit must be a number or string of numbers",
    }).refine((val) => val >= 0, {
      message: "Lower limit must be a non-negative number",
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
          required_error:"NCERR:Wallet id is required"
        })
        .trim()
        .min(1, 'NCERR:Wallet id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const getWalletByIdParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        id: z.string({
          required_error:"NCERR:Wallet id is required"
        })
        .trim()
        .min(1, 'NCERR:Wallet id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const walletsAmountTransferSchema = z.object({
    body: z.object({
        amount: z.coerce.number({
          invalid_type_error: "NCERR:Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
          message: "Amount must be positive",
        }),
    }),
    query: z.object({
        fromWallet: z.string({
          required_error:"NCERR:fromWallet id is required"
        })
        .trim()
        .min(1, 'NCERR:fromWallet id cannot be empty'),
        toWallet: z.string({
          required_error:"NCERR:toWallet id is required"
        })
        .trim()
        .min(1, 'NCERR:toWallet id cannot be empty'),
    }),
    params: z.object({}),
    file: z.object({}).optional()
  });

  export const walletTransactionsSchema = z.object({
    params: z.object({
      wallet_id: z.string().min(1, 'NCERR:Wallet id is required'),
    }),
  });
