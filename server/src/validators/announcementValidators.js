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

const titleSchema = z
  .string()
  .trim()
  .min(3, "Title must contain at least 3 characters.")
  .max(150);

const contentSchema = z
  .string()
  .trim()
  .min(5, "Announcement content is required.")
  .max(10000);

const targetTypeSchema = z.enum(["all", "role", "student"]);

const targetRoleSchema = z.enum(["admin", "student"]).nullable();

const targetStudentIdSchema = positiveId("Target student ID").nullable();

const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);

const validateAnnouncementBody = (
  data,
  context,
  { requireTargetDetails } = {},
) => {
  const targetTypeProvided = Object.hasOwn(data, "targetType");

  if (
    data.targetType === "role" &&
    (requireTargetDetails || targetTypeProvided) &&
    !data.targetRole
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetRole"],
      message: "Target role is required for role announcements.",
    });
  }

  if (
    data.targetType === "student" &&
    (requireTargetDetails || targetTypeProvided) &&
    !data.targetStudentId
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetStudentId"],
      message: "Target student ID is required for student announcements.",
    });
  }

  if (
    (requireTargetDetails || targetTypeProvided) &&
    data.targetType !== "role" &&
    data.targetRole
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetRole"],
      message: "Target role may only be used with role announcements.",
    });
  }

  if (
    (requireTargetDetails || targetTypeProvided) &&
    data.targetType !== "student" &&
    data.targetStudentId
  ) {
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
};

const announcementBodySchema = z
  .object({
    title: titleSchema,

    content: contentSchema,

    targetType: targetTypeSchema,

    targetRole: targetRoleSchema.optional(),

    targetStudentId: targetStudentIdSchema.optional(),

    priority: prioritySchema.default("normal"),

    publishAt: nullableDate,
    expiresAt: nullableDate,
  })
  .strict()
  .superRefine((data, context) => {
    validateAnnouncementBody(data, context, {
      requireTargetDetails: true,
    });
  });

const updateAnnouncementBodySchema = z
  .object({
    title: titleSchema.optional(),

    content: contentSchema.optional(),

    targetType: targetTypeSchema.optional(),

    targetRole: targetRoleSchema.optional(),

    targetStudentId: targetStudentIdSchema.optional(),

    priority: prioritySchema.optional(),

    publishAt: nullableDate,
    expiresAt: nullableDate,
  })
  .strict()
  .superRefine((data, context) => {
    if (Object.keys(data).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one announcement field to update.",
      });
    }

    validateAnnouncementBody(data, context);
  });

export const createAnnouncementSchema = z.object({
  body: announcementBodySchema,
  params: z.object({}),
  query: z.object({}),
});

export const updateAnnouncementSchema = z.object({
  body: updateAnnouncementBodySchema,

  params: z
    .object({
      announcementId: positiveId("Announcement ID"),
    })
    .strict(),

  query: z.object({}),
});

export const announcementIdSchema = z.object({
  body: z.object({}).default({}),

  params: z
    .object({
      announcementId: positiveId("Announcement ID"),
    })
    .strict(),

  query: z.object({}),
});

export const listAnnouncementsSchema = z.object({
  body: z.object({}).default({}),
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
  body: z.object({}).default({}),
  params: z.object({}),

  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(50).default(10),

      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    })
    .strict(),
});
