import { z } from "zod";

export const predictBudgetSchema = z.object({
  transaction_category: z.string().min(1, "Transaction category cannot be empty").optional(),
});
