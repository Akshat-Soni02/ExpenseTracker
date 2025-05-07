import {z} from 'zod';

export const createGroupSchema = z.object({
    body: z.object({
        group_title: z.string().min(1, "Group title is required"),
        memberIds: z.array(z.string()).min(2, "Members required for a group"),
        initial_budget: z.union([z.string(), z.number()]).transform(Number).refine(val => val > -1, "Inital Budget must be greater than 0").optional(),
        settle_up_date: z.coerce.date().optional()
    })
});

export const updateGroupSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Group id required to update group")
    }),
    body: z.object({
        group_title: z.string().min(1, "Group title cannot be empty string").optional(),
        initial_budget: z.union([z.string(), z.number()]).transform(Number).refine(val => val > 0, "Inital Budget must be greater than 0").optional(),
        settle_up_date: z.coerce.date().optional()
    })
});

export const leaveGroupSchema = z.object({
    params: z.object({
        groupId: z.string().min(1, "Group id is required to leave group")
    })
});

export const getGroupByIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Group id is required to get group")
    })
});

export const getGroupExchangeStateWithOthersSchema = z.object({
    params: z.object({
        group_id: z.string().min(1,"Group id is required to get exchange state with members")
    })
});

export const remindGroupBorrowerSchema = z.object({
    params: z.object({
        group_id: z.string().min(1,"Group id is required to remind in group"),
    }),
    query: z.object({
        borrower_id: z.string().min(1, "Borrower id is required to remind group"),
        amount: z.union([z.string(), z.number()])
    })
});

export const remindAllGroupBorrowersSchema = z.object({
    params: z.object({
        group_id: z.string().min(1,"Group id is required to remind in group")
    })
});

export const getGroupHistorySchema = z.object({
    params: z.object({
        group_id: z.string().min(1,"Group id is required to get group history")
    }),
    query: z.object({
        since: z.string().optional()
    })
});

export const processSimplifyDebtsSchema = z.object({
    params: z.object({
        group_id: z.string().min(1,"Group id is required to process group simplify debts")
    })
});

export const addToGroupSchema = z.object({
    params: z.object({
        group_id: z.string().min(1,"Group id is required to add to group")
    }),
    body: z.object({
        newMemberIds: z.array(z.string()).min(1, "Empty new members array"),
    })
});