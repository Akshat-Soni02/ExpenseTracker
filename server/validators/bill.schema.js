import { z } from "zod";

/**
 * @template createBillSchema uses a KEYWORD convention,
 * if error contains prefix NCERR: [Non Client Error] then,
 * generic message is sent rather than original error,
 * but original error gets logged
 */
export const createBillSchema = z.object({
  body: z.object({
    bill_title: z.string({
        required_error: "Bill title is required",
      })
      .trim()
      .min(1, 'Bill title cannot be empty'),
    bill_category: z.string()
      .trim()
      .optional(),
    amount: z.coerce.number({
        required_error: "Bill amount is required",
        invalid_type_error: "Bill amount must be a number or string",
      }).refine((val) => val > 0, {
        message: "Bill amount must be a positive number",
      }),
    due_date_time: z.coerce.date(), // Accepts ISO strings and coerces to Date
    recurring: z.boolean()
    .optional()
    .default(false),
    members: z.array(
      z.object({
        user_id: z.string({
          required_error: `NCERR:user id is required for a member of bill`,
        })
          .trim()
          .min(1, 'NCERR:user id cannot be empty of member'),
        amount: z.coerce.number({
          required_error: "NCERR:member amount is required",
          invalid_type_error: "NCERR:member amount must be a number or string",
        }).refine((val) => val > 0, {
          message: "Member amount must be greater then 0",
        }),
        status: z.string({
            required_error: "NCERR:member status is required",
          })
          .trim()
          .min(1, 'NCERR:member status cannot be empty'), 
      })
    ).min(1, "At least one member is required in bill"),
  }),
  query: z.object({}),
  params: z.object({}),
  file: z.object({}).optional(),
});


export const handleBillUserStatusUpdateSchema = z.object({
  body: z.object({
    status: z.string({ 
      required_error: "Updating user status is required" 
    })
    .trim()
    .min(1, 'Updating user status cannot be empty'),
  }),
  query: z.object({}),
  params: z.object({
    billId: z.string({
      required_error: "Bill id is required",
    })
    .trim()
    .min(1, 'Bill id cannot be empty'),
  }),
  file: z.object({}).optional(),
});

export const updateBillSchema = z.object({
  body: z.object({
    bill_title: z.string()
      .trim()
      .min(1, 'Bill title cannot be empty')
      .optional(),
    bill_category: z.string()
      .trim()
      .min(1, 'Bill category cannot be empty')
      .optional(),
    amount: z.coerce.number({
        invalid_type_error: "Amount must be a number or string of numbers",
      }).refine((val) => val > 0, {
        message: "Amount must be a positive number",
      }).optional(),
    due_date_time: z.coerce.date().optional(), // Accepts ISO strings and coerces to Date
    recurring: z.boolean().optional(),
    members: z.array(
      z.object({
        user_id: z.string({
          required_error: "Member id is required",
        })
        .trim()
        .min(1, 'Member id cannot be empty'),
        amount: z.coerce.number({
          invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
          message: "Amount must be a positive number",
        }),
        status: z.string({
            required_error: "Status is required",
        })
        .trim()
        .min(1, 'Member id cannot be empty'), 
      })
    ).optional(),
  }),
  query: z.object({}),
  params: z.object({
    id: z.string()
      .trim()
      .min(1, 'Bill id is required'),
  }),
  file: z.object({}).optional(),
});

export const deleteBillParamsSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string({
      required_error: "Bill id is required",
    })
    .trim()
    .min(1, 'Bill id cannot be empty'),
  }),
  file: z.object({}).optional(),
});
export const getBillByIdParamsSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string({
      required_error: "Bill id is required",
    })
    .trim()
    .min(1, 'Bill id cannot be empty'),
  }),
  file: z.object({}).optional(),
});