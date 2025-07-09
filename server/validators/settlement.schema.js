import { z } from 'zod';

export const createSettlementSchema = z.object({
    body: z.object({
        settlement_description: z.string({
            required_error: "Description is required",
        })
        .trim()
        .min(1, 'Settlement description cannot be empty'), 
        amount: z.coerce.number({
            required_error: "Amount is required",
            invalid_type_error: "NCERR:Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
            message: "Amount must be positive",
        }),
        payer_wallet_id: z.string()
        .optional(), 
        payer_id: z.string()
        .optional(),
        receiver_wallet_id: z.string()
        .optional(), 
        receiver_id: z.string()
        .optional(), 
        group_id: z
        .string()
        .optional(),
        status: z.enum(["sent", "receiver"], {
            error_map: () => ({ message: "NCERR:Status must be either 'sent' or 'receiver'" }),
          }),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional()
});


export const updateSettlementSchema = z.object({
    body: z.object({
        settlement_description: z.string()
        .trim()
        .min(1, 'Settlement description cannot be empty')
        .optional(), 
    }).strict(),
    query: z.object({}),
    params: z.object({
      id: z.string({
        required_error:"NCERR:Settlement id is required"
      })
      .trim()
      .min(1, 'NCERR:Settlement id cannot be empty'),
    }),
    file: z.object({}).optional()
});


export const deleteSettlementParamsSchema = z.object({
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

export const getSettlementByIdParamsSchema = z.object({
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