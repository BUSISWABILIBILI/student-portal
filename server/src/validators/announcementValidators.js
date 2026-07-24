import { z } from "zod";

const positiveId = (fieldName) =>
  z.coerce
    .number()
    .int(`${fieldName} must be an integer.`)
    .positive(`${fieldName} must be positive.`);

const nullableDate = z
  .union([
    z.string().datetime({
      message: "Date must use a valid ISO 8601 format.",
    }),
    z.null(),
  ])
  .optional();

const announcementBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must contain at least 3 characters.")
      .max(150),

    content: z
      .string()
      .trim()
      .min(5, "Announcement content is required.")
      .max(10000),

    targetType: z.enum(["all", "role", "student"]),

    targetRole: z.enum(["admin", "student"]).nullable().optional(),

    targetStudentId: positiveId("Target student ID").nullable().optional(),

    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),

    publishAt: nullableDate,
    expiresAt: nullableDate,
  })
  .strict()
  .superRefine((data, context) => {
    if (data.targetType === "role" && !data.targetRole) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetRole"],
        message: "Target role is required for role announcements.",
      });
    }

    if (data.targetType === "student" && !data.targetStudentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetStudentId"],
        message: "Target student ID is required for student announcements.",
      });
    }

    if (data.targetType !== "role" && data.targetRole) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetRole"],
        message: "Target role may only be used with role announcements.",
      });
    }

    if (data.targetType !== "student" && data.targetStudentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetStudentId"],
        message: "Target student may only be used with student announcements.",
      });
    }

    if (
      data.publishAt &&
      data.expiresAt &&
      new Date(data.expiresAt) <= new Date(data.publishAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Expiry date must be later than the publication date.",
      });
    }
  });

export const createAnnouncementSchema = z.object({
  body: announcementBodySchema,
  params: z.object({}),
  query: z.object({}),
});

export const updateAnnouncementSchema = z.object({
  body: announcementBodySchema
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one announcement field to update.",
    }),

  params: z
    .object({
      announcementId: positiveId("Announcement ID"),
    })
    .strict(),

  query: z.object({}),
});

export const announcementIdSchema = z.object({
  body: z.object({}),

  params: z
    .object({
      announcementId: positiveId("Announcement ID"),
    })
    .strict(),

  query: z.object({}),
});

export const listAnnouncementsSchema = z.object({
  body: z.object({}),
  params: z.object({}),

  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),

      limit: z.coerce.number().int().min(1).max(100).default(10),

      search: z.string().trim().max(100).default(""),

      publicationStatus: z.enum(["draft", "published"]).optional(),

      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),

      targetType: z.enum(["all", "role", "student"]).optional(),

      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .strict(),
});

export const myAnnouncementsSchema = z.object({
  body: z.object({}),
  params: z.object({}),

  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(50).default(10),

      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    })
    .strict(),
});
