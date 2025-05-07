import { z } from "zod";

export const createSettlementSchema = z.object({
    body: z.object({
        settlement_description: z.string().min(1, "Description is required for a settlement"),
        payer_wallet_id: z.string().optional(),
        payer_id: z.string().optional(),
        receiver_wallet_id: z.string().optional(),
        receiver_id: z.string().optional(),
        group_id: z.string().optional(),
        status: z.enum(["sent", "receiver"]),
        amount: z.union([z.string(), z.number()]).transform(Number).refine(val => val > 0, "Amount must be greater than 0")
    })
});

export const updateSettlementSchema = z.object({
    params: z.object({
        id: z.string().min(1, "id required to update settlement")
    }),
    body: z.object({
        settlement_description: z.string().min(1, "Description must not be empty").optional()
    })
});

export const deleteSettlementSchema = z.object({
    params: z.object({
        id: z.string().min(1, "id required to delete settlement")
    })
});

export const getSettlementByIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, "id required to get settlement details")
    })
});