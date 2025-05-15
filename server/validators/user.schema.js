import { z } from "zod";
import { BillStatus } from "../enums/billEnums";

export const GoogleUserSchema = z.object({
    body: z.object({
        user: z.object({
            email: z.string({
                required_error: "Email id is required",
            })
            .trim()
            .email("Invalid email address"),
            name: z.string({        
                required_error: "Name is required",
            })
            .trim()
            .min(1,"Name cannot be empty"),
            picture: z.string().url().optional(),
            id: z.string({
                required_error: "Google id is required",
            })
            .trim()
            .min(1,"Google id cannot be empty"),
        }),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});


export const GoogleLoginSchema = z.object({
    body: z.object({
        idToken: z.string({        
            required_error: "Bill title is required",
        })
        .trim()
        .min(1, "ID Token cannot be empty"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});

export const RegisterSchema = z.object({
    body: z.object({
        email: z.string({        
            required_error: "Email id is required",
        })
        .trim()
        .email("Invalid email address"),
        password: z.string({        
            required_error: "Password is required",
        })
        .trim()
        .min(6, "Password must be at least 6 characters"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});


export const LoginSchema = z.object({
    body: z.object({
        email: z.string({        
            required_error: "Email id is required",
        })
        .trim()
        .email("Invalid email address"),
        password: z.string({        
            required_error: "Password is required",
        })
        .trim()
        .min(6, "Password must be at least 6 characters"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});

export const NotificationTokenSchema = z.object({
    body: z.object({
        token: z.string({        
            required_error: "Notification token is required",
        })
        .trim()
        .min(1, "Notification token cannot be empty"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});

//Updateprofilephoto?????

export const UpdateUserSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: "Name is required",
        })
        .trim()
        .min(1, 'Name cannot be empty')
        .optional(),
        phone: z
        .string()
        .trim()
        .regex(/^\d{10}$/, "Invalid phone number. Must be 10 digits.")
        .optional(), 
        dailyLimit: z.union([z.string(), z.number()])
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val) && val > 0, {
        message: "Amount must be a positive number",
        })
        .optional(),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
}); //file???????????????

export const SendOtpSchema = z.object({
    body: z.object({
        email: z.string({        
                required_error: "Email id is required",
            })
            .trim()
            .email("Invalid email address"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});

export const VerifyOtpSchema = z.object({
    body: z.object({
        email: z.string({        
            required_error: "Email id is required",
        })
        .trim()
        .email("Invalid email address"),
        otp: z.string()
        .trim()
        .length(4, "OTP must be a 4-digit code"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});


export const ResetPasswordSchema = z.object({
    body: z.object({
        email: z.string({        
            required_error: "Email id is required",
        })
        .trim()
        .email("Invalid email address"),
        newPassword: z.string()
        .trim()
        .min(6, "Password must be at least 6 characters long"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});

export const GetSettlementsQuerySchema = z.object({
    query: z.object({
        group_id: z.string({
            required_error: "Group id is required",
        })
        .trim()
        .min(1, 'Group id cannot be empty'),
    }),
    params: z.object({}),
    body: z.object({}),
    file: z.object({}).optional(),
});

export const GetBillsQuerySchema = z.object({
    query: z.object({
        status: z.enum([BillStatus.MISSED,BillStatus.PAID,BillStatus.PENDING], {
            required_error: "Transaction type is required",
          }),
    }),
    params: z.object({}),
    body: z.object({}),
    file: z.object({}).optional(),
});

export const RemindBorrowerParamsSchema = z.object({
    params: z.object({
        borrower_id: z.string({
            required_error: "Borrower id is required",
        })
        .trim()
        .min(1, "Borrower id cannot be empty"), 
    }),
    query: z.object({}),
    body: z.object({}),
    file: z.object({}).optional(),
});

export const autoAddFutureFriendsSchema = z.object({
    body: z.object({
        email: z.string({
                required_error: "Email id is required",
        })
        .trim()
        .email("Invalid email address"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});

export const GetUserByIdParamsSchema = z.object({
    params:z.object({
        id: z.string({
            required_error: "Transaction type is required",
        })
        .trim()
        .min(1, "User id is required"), 
    }),
    query: z.object({}),
    body: z.object({}),
    file: z.object({}).optional(),
});

const InviteeSchema = z.object({
    email: z.string()
    .trim()
    .email("Invalid email address"), 
});
  
export const AddUserFriendsBodySchema = z.object({
    body: z.object({
        invitees: z.array(InviteeSchema).min(1, "At least one invitee is required"),
    }),
    query: z.object({}),
    params: z.object({}),
    file: z.object({}).optional(),
});