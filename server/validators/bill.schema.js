import { z } from "zod";

export const createBillSchema = z.object({
  body: z.object({
    bill_title: z.string().min(1, "Bill title is required"),
    bill_category: z.string().min(1, "Bill category is required"),
    amount: z.union([z.string(), z.number()]).transform(Number).refine(val => val > 0, "Amount must be greater than 0"),
    due_date_time: z.coerce.date(), // Accepts ISO strings and coerces to Date
    recurring: z.boolean().optional().default(false),
    members: z.array(
      z.object({
        user_id: z.string(),
        amount: z.number(),
        status: z.string().optional(), // Assuming structure
      })
    ).min(1, "At least one member is required"),
  }),
});