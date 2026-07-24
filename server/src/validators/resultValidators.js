import { z } from "zod";

const positiveId = (fieldName) =>
  z.coerce
    .number({
      invalid_type_error: `${fieldName} must be a number.`,
    })
    .int(`${fieldName} must be an integer.`)
    .positive(`${fieldName} must be positive.`);

const markSchema = z.coerce
  .number()
  .min(0, "Marks cannot be lower than 0.")
  .max(100, "Marks cannot exceed 100.");

const remarksSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  },
  z.string().trim().max(500).nullable().optional(),
);

export const captureResultSchema = z.object({
  body: z
    .object({
      enrollmentId: positiveId("Enrollment ID"),

      courseworkMark: markSchema.nullable().optional(),

      examinationMark: markSchema.nullable().optional(),

      remarks: remarksSchema,
    })
    .strict()
    .refine(
      (body) =>
        body.courseworkMark !== undefined ||
        body.examinationMark !== undefined ||
        body.remarks !== undefined,
      {
        message: "Provide at least one result field.",
      },
    ),

  params: z.object({}),
  query: z.object({}),
});

export const updateResultSchema = z.object({
  body: z
    .object({
      courseworkMark: markSchema.nullable().optional(),

      examinationMark: markSchema.nullable().optional(),

      remarks: remarksSchema,
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one result field to update.",
    }),

  params: z
    .object({
      resultId: positiveId("Result ID"),
    })
    .strict(),

  query: z.object({}),
});

export const resultIdSchema = z.object({
  body: z.object({}),

  params: z
    .object({
      resultId: positiveId("Result ID"),
    })
    .strict(),

  query: z.object({}),
});

export const listResultsSchema = z.object({
  body: z.object({}),
  params: z.object({}),

  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),

      limit: z.coerce.number().int().min(1).max(100).default(10),

      search: z.string().trim().max(100).optional().default(""),

      academicPeriodId: positiveId("Academic period ID").optional(),

      courseId: positiveId("Course ID").optional(),

      outcome: z.enum(["pass", "fail", "incomplete"]).optional(),

      publicationStatus: z.enum(["draft", "published"]).optional(),

      sortBy: z
        .enum([
          "studentName",
          "studentNumber",
          "courseCode",
          "finalMark",
          "createdAt",
        ])
        .default("createdAt"),

      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .strict(),
});

export const myResultsSchema = z.object({
  body: z.object({}),
  params: z.object({}),

  query: z
    .object({
      academicPeriodId: positiveId("Academic period ID").optional(),

      outcome: z.enum(["pass", "fail", "incomplete"]).optional(),
    })
    .strict(),
});
