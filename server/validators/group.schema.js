import { z } from 'zod';

export const createGroupSchema = z.object({
    body: z.object({
        group_title: z.string({
            required_error: "Group title is required",
        })
        .trim()
        .min(1, 'Group title cannot be empty'), 
        memberIds: z.array(
            z.string()
            .trim()
            .min(1,'Member Id cannot be empty')
        ).min(1, 'At least one member is required'),
        initial_budget: z.coerce.number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
            message: "Amount must be a positive number",
        }).optional(),
        settle_up_date:z.coerce.date().optional(), 
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional()
});

export const updateGroupSchema = z.object({
    body: z.object({
        group_title: z.string()
        .trim()
        .min(1, 'Group title cannot be empty')
        .optional(), 
        initial_budget: z.coerce.number({
            invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
            message: "Amount must be a positive number",
        }).optional(),
        settle_up_date:z.coerce.date().optional(), 
    }),
    query: z.object({}), 
    params:z.object({
        id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const leaveGroupParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        groupId: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const getGroupByIdParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const getGroupExchangeStateWithOthersParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const remindGroupBorrowerParamsSchema = z.object({
    body: z.object({}),
    query: z.object({
        borrower_id: z.string({
            required_error: "Borrower id is required",
        })
        .trim()
        .min(1, 'Borrower id cannot be empty'),
        amount : z.coerce.number({
            invalid_type_error: "Amount must be a number or string of numbers",
        }).refine((val) => val > 0, {
            message: "Amount must be a positive number",
        }),
    }), 
    params: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const remindAllGroupBorrowersParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const getGroupHistoryParamsSchema = z.object({
    body: z.object({}),
    query: z.object({
        since : z.coerce.date().optional(), 
    }), 
    params: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const processSimplifyDebtsParamsSchema = z.object({
    body: z.object({}),
    query: z.object({}), 
    params: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});

export const addToGroupParamsSchema = z.object({
    body: z.object({
        newMemberIds: z.array(
            z.string({
                required_error:"Member id is required"
            })
            .trim()
            .min(1,'Member Id cannot be empty')
        ).min(1, 'At least one member is required'),
    }),
    query: z.object({}), 
    params: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    file: z.object({}).optional()
});