import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password must not exceed 72 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/\d/, "Password must include a number.")
  .regex(/[@$!%*?&]/, "Password must include one special character: @$!%*?&.");

export const loginSchema = z.object({
  body: z
    .object({
      email: z.email("Enter a valid email address.").trim().toLowerCase(),

      password: z.string().min(1, "Password is required."),
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});

export const createUserSchema = z.object({
  body: z
    .object({
      firstName: z
        .string()
        .trim()
        .min(2, "First name must contain at least 2 characters.")
        .max(80),

      lastName: z
        .string()
        .trim()
        .min(2, "Last name must contain at least 2 characters.")
        .max(80),

      email: z.email("Enter a valid email address.").trim().toLowerCase(),

      password: passwordSchema,

      role: z.enum(["admin", "student"]),
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "Current password is required."),

      newPassword: passwordSchema,
    })
    .strict()
    .refine((body) => body.currentPassword !== body.newPassword, {
      path: ["newPassword"],
      message: "New password must be different from the current password.",
    }),

  params: z.object({}),
  query: z.object({}),
});

export const requestPasswordResetSchema = z.object({
  body: z
    .object({
      email: z.email("Enter a valid email address.").trim().toLowerCase(),
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().trim().min(32, "Password reset token is required."),

      newPassword: passwordSchema,
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});
