import { z } from 'zod';

export const createWalletSchema = z.object({
    wallet_title: z.string().min(1, 'Wallet title is required'), 
    amount: z.union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    }),
    lower_limit: z.union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    }).optional().default(0), 
});

export const updateWalletSchema = z.object({
    wallet_title: z.string().min(1, 'Wallet title is required').optional(), 
    amount: z.union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    }).optional(), 
    lower_limit: z.union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    }).optional(), 
});

export const deleteWalletParamsSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Wallet id is required'),
    }),
});

export const getWalletByIdParamsSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Wallet id is required'),
    }),
});

export const walletsAmountTransferSchema = z.object({
    query: z.object({
        fromWallet: z.string().min(1, 'fromWallet id is required'),
        toWallet: z.string().min(1, 'toWallet id is required'),
    }),
    body: z.object({
        amount: z
            .union([z.string(), z.number()])
            .transform((val) => Number(val))
            .refine((val) => !isNaN(val) //&& val > 0????????????
            , {
            message: "Amount must be a positive number",
            }),
    }),
  });
  