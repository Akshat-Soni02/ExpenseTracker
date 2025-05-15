import { z } from 'zod';

export const createSettlementSchema = z.object({
    body: z.object({
        settlement_description: z.string({
            required_error: "Settlement description is required",
        })
        .trim()
        .min(1, 'Settlement description cannot be empty'), 
        amount: z.coerce.number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
            message: "Amount must be a positive number",
        }),
        payer_wallet_id: z.string()
        .trim()
        .min(1, 'Payer wallet id cannot be empty')
        .optional(), 
        payer_id: z.string({
            required_error: "Payer id is required",
        })
        .trim()
        .min(1, 'Payer id cannot be empty'), 
        receiver_wallet_id: z.string()
        .trim()
        .min(1, 'Receiver wallet id cannot be empty')
        .optional(), 
        receiver_id: z.string({
            required_error: "Receiver id is required",
        })
        .trim()
        .min(1, 'Receiver id cannot be empty'), 
        group_id: z
        .string()
        .trim()
        .min(1, 'Group id cannot be empty')
        .optional(),
        status: z.enum(["sent", "receiver"], {
            error_map: () => ({ message: "Status must be either 'sent' or 'receiver'" }),
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
        required_error:"Settlement id is required"
      })
      .trim()
      .min(1, 'Settlement id cannot be empty'),
    }),
    file: z.object({}).optional()
});


export const deleteSettlementParamsSchema = z.object({
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

export const getSettlementByIdParamsSchema = z.object({
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