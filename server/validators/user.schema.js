import { z } from "zod";
import { BillStatus } from "../enums/billEnums";

export const GoogleUserSchema = z.object({
  user: z.object({
    email: z.string().email(),
    name: z.string().min(1,"Name is required"),
    picture: z.string().url(),
    id: z.string().min(1)
  })
});


export const GoogleLoginSchema = z.object({
    idToken: z.string().min(1, "ID Token is required"),
});

export const RegisterSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});


export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const NotificationTokenSchema = z.object({
    token: z.string().min(1, "Notification token is required"),
});

//Updateprofilephoto?????

export const UpdateUserSchema = z.object({
    name: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
        message: "User name cannot be empty",
      }),
    phone: z.string().optional(), //Regex
    dailyLimit: z.union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number",
    })
    .optional(),
}); //file???????????????

export const SendOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const VerifyOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(4, "OTP must be a 4-digit code"),
});


export const ResetPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
    newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});

export const GetSettlementsQuerySchema = z.object({
    query: z.object({
        group_id: z.string().optional().refine(val => val === undefined || val.trim().length > 0 ,{
        message: "User group id cannot be empty",
      }),
    }),
});

export const GetBillsQuerySchema = z.object({
    query: z.object({
        status: z.enum([BillStatus.MISSED,BillStatus.PAID,BillStatus.PENDING], {
            required_error: "Transaction type is required",
          }),
    }),
});

export const RemindBorrowerParamsSchema = z.object({
    borrower_id: z.string().min(1, "Borrower id is required"), 
});

export const autoAddFutureFriendsSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const GetUserByIdParamsSchema = z.object({
    id: z.string().min(1, "User id is required"), 
});

export const InviteeSchema = z.object({
    email: z.string().email("Invalid email address"), 
  });
  
export const AddUserFriendsBodySchema = z.object({
    invitees: z.array(InviteeSchema),
});