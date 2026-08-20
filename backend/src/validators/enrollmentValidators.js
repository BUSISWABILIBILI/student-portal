import { z } from "zod";

const positiveId = (fieldName) =>
  z.coerce
    .number()
    .int(`${fieldName} must be an integer.`)
    .positive(`${fieldName} must be positive.`);

const optionalQueryText = (maximumLength) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }, z.string().max(maximumLength).optional());

export const listEnrollmentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}),

  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),

      limit: z.coerce.number().int().min(1).max(100).default(25),

      search: optionalQueryText(100).default(""),

      academicPeriodId: positiveId("Academic period ID").optional(),

      courseId: positiveId("Course ID").optional(),

      status: z.enum(["registered", "cancelled", "completed"]).optional(),

      resultStatus: z.enum(["pending", "captured", "all"]).default("all"),

      sortBy: z
        .enum(["registeredAt", "studentName", "studentNumber", "courseCode"])
        .default("registeredAt"),

      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .strict(),
});
