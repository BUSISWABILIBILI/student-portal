import { z } from "zod";

const userIdSchema = z.coerce
  .number()
  .int("User ID must be an integer.")
  .positive("User ID must be positive.");

const optionalText = (maximumLength) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .optional()
    .nullable()
    .transform((value) => value || null);

const optionalDate = z
  .string()
  .date("Enter a valid date in YYYY-MM-DD format.")
  .optional()
  .nullable()
  .transform((value) => value || null);

export const listUsersSchema = z.object({
  body: z.object({}),

  params: z.object({}),

  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),

      limit: z.coerce.number().int().min(1).max(100).default(10),

      search: z.string().trim().max(100).optional().default(""),

      role: z.enum(["admin", "student"]).optional(),

      status: z.enum(["active", "inactive"]).optional(),

      sortBy: z
        .enum(["createdAt", "firstName", "lastName", "email", "lastLoginAt"])
        .default("createdAt"),

      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .strict(),
});

export const getUserSchema = z.object({
  body: z.object({}),

  params: z
    .object({
      userId: userIdSchema,
    })
    .strict(),

  query: z.object({}),
});

export const createStudentSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(2).max(80),

      lastName: z.string().trim().min(2).max(80),

      email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Enter a valid email address."),

      password: z
        .string()
        .min(8)
        .max(72)
        .regex(/[A-Z]/, "Password must include an uppercase letter.")
        .regex(/[a-z]/, "Password must include a lowercase letter.")
        .regex(/\d/, "Password must include a number.")
        .regex(
          /[@$!%*?&]/,
          "Password must include one special character: @$!%*?&.",
        ),

      programme: z.string().trim().min(2).max(150),

      yearLevel: z.coerce.number().int().min(1).max(10),

      dateOfBirth: optionalDate,

      gender: z
        .enum(["female", "male", "other", "prefer_not_to_say"])
        .optional()
        .nullable(),

      phoneNumber: optionalText(30),
      addressLine: optionalText(200),
      city: optionalText(100),
      province: optionalText(100),
      postalCode: optionalText(20),

      admissionDate: optionalDate,
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});

export const updateUserSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(2).max(80).optional(),

      lastName: z.string().trim().min(2).max(80).optional(),

      email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Enter a valid email address.")
        .optional(),

      role: z.enum(["admin", "student"]).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one account field to update.",
    }),

  params: z
    .object({
      userId: userIdSchema,
    })
    .strict(),

  query: z.object({}),
});

export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      programme: z.string().trim().min(2).max(150).optional(),

      yearLevel: z.coerce.number().int().min(1).max(10).optional(),

      dateOfBirth: optionalDate,

      gender: z
        .enum(["female", "male", "other", "prefer_not_to_say"])
        .optional()
        .nullable(),

      phoneNumber: optionalText(30),
      addressLine: optionalText(200),
      city: optionalText(100),
      province: optionalText(100),
      postalCode: optionalText(20),
      admissionDate: optionalDate,
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one profile field to update.",
    }),

  params: z
    .object({
      userId: userIdSchema,
    })
    .strict(),

  query: z.object({}),
});

export const updateUserStatusSchema = z.object({
  body: z
    .object({
      isActive: z.boolean(),
    })
    .strict(),

  params: z
    .object({
      userId: userIdSchema,
    })
    .strict(),

  query: z.object({}),
});
