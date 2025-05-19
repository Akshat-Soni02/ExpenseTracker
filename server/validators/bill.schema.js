import { z } from "zod";

export const createBillSchema = z.object({
  body: z.object({
    bill_title: z.string().min(1, "Bill title is required"),
    bill_category: z
    .string()
    .optional(),
    amount: z.union([z.string(), z.number()]).transform(Number).refine(val => val > 0, "Amount must be greater than 0"),
    due_date_time: z.coerce.date(),
    recurring: z.boolean().optional().default(false),
    members: z.array(
      z.object({
        user_id: z.string(),
        amount: z.number(),
        status: z.enum(["pending", "paid", "missed"]),
      })
    ).min(1, "At least one member is required"),
  }),
});

export const billUserStatusUpdateSchema = z.object({
  params: z.object({
    billId: z.string().min(1, "Bill id is required to update user state in bill"),
  }),
  body: z.object({
    status: z.string().min(1, "Statue is required to update user state in bill"),
  }),
});

export const updateBillSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Bill id is required to update bill")
  }),
  body: z.object({
    bill_title: z.string().min(1, "Bill title is required").optional(),
    bill_category: z
    .string()
    .optional()
    .refine(val => val === undefined || val.trim().length > 0, {
      message: "Bill category cannot be empty",
    }),
    due_date_time: z.coerce.date().optional(),
    recurring: z.boolean().optional(),
    members: z.array(
      z.object({
        user_id: z.string(),
        amount: z.number(),
        status: z.enum(["pending", "paid", "missed"])
      })
    ).optional(),
    amount: z.union([z.string(), z.number()]).transform(Number).refine(val => val > 0, "Amount must be greater than 0").optional()
  })
});

export const deleteBillSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Bill id is required to update bill")
  })
});

export const getBillByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Bill id is required to get bill info")
  })
});