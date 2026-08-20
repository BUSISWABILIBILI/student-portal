import { z } from "zod";

const courseIdSchema = z.coerce
  .number()
  .int("Course ID must be an integer.")
  .positive("Course ID must be positive.");

const academicPeriodIdSchema = z.coerce
  .number()
  .int("Academic period ID must be an integer.")
  .positive("Academic period ID must be positive.");

const courseCodeSchema = z
  .string()
  .trim()
  .min(2, "Course code must contain at least 2 characters.")
  .max(20, "Course code must not exceed 20 characters.")
  .regex(
    /^[a-z0-9-]+$/i,
    "Course code can only include letters, numbers, and hyphens.",
  )
  .transform((value) => value.toUpperCase());

const courseNameSchema = z
  .string()
  .trim()
  .min(2, "Course name must contain at least 2 characters.")
  .max(150, "Course name must not exceed 150 characters.");

const departmentSchema = z
  .string()
  .trim()
  .min(2, "Department must contain at least 2 characters.")
  .max(150, "Department must not exceed 150 characters.");

const creditValueSchema = z.coerce
  .number()
  .min(1, "Credit value must be at least 1.")
  .max(120, "Credit value must not exceed 120.");

const capacitySchema = z.coerce
  .number()
  .int("Capacity must be an integer.")
  .min(1, "Capacity must be at least 1.")
  .max(10000, "Capacity must not exceed 10000.");

const createDescriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description must not exceed 2000 characters.")
  .optional()
  .nullable()
  .transform((value) => value || null);

const updateDescriptionSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  },
  z
    .string()
    .trim()
    .max(2000, "Description must not exceed 2000 characters.")
    .nullable()
    .optional(),
);

const optionalQueryText = (maximumLength) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }, z.string().max(maximumLength).optional());

const stripUndefinedFields = (body) =>
  Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );

export const listCoursesSchema = z.object({
  body: z.object({}),

  params: z.object({}),

  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),

      limit: z.coerce.number().int().min(1).max(100).default(10),

      search: optionalQueryText(100).default(""),

      department: optionalQueryText(150),

      status: z.enum(["active", "inactive"]).optional(),

      availability: z.enum(["available", "full"]).optional(),

      sortBy: z
        .enum([
          "courseCode",
          "courseName",
          "department",
          "creditValue",
          "capacity",
          "createdAt",
        ])
        .default("courseCode"),

      sortOrder: z.enum(["asc", "desc"]).default("asc"),
    })
    .strict(),
});

export const getCourseSchema = z.object({
  body: z.object({}),

  params: z
    .object({
      courseId: courseIdSchema,
    })
    .strict(),

  query: z.object({}),
});

export const createCourseSchema = z.object({
  body: z
    .object({
      courseCode: courseCodeSchema,

      courseName: courseNameSchema,

      description: createDescriptionSchema,

      department: departmentSchema,

      creditValue: creditValueSchema.default(12),

      capacity: capacitySchema.default(50),

      isActive: z.boolean().default(true),
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});

export const updateCourseSchema = z.object({
  body: z
    .object({
      courseCode: courseCodeSchema.optional(),

      courseName: courseNameSchema.optional(),

      description: updateDescriptionSchema,

      department: departmentSchema.optional(),

      creditValue: creditValueSchema.optional(),

      capacity: capacitySchema.optional(),

      isActive: z.boolean().optional(),
    })
    .strict()
    .transform(stripUndefinedFields)
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one course field to update.",
    }),

  params: z
    .object({
      courseId: courseIdSchema,
    })
    .strict(),

  query: z.object({}),
});

export const registerCourseSchema = z.object({
  body: z
    .object({
      courseId: courseIdSchema,

      academicPeriodId: academicPeriodIdSchema,
    })
    .strict(),

  params: z.object({}),
  query: z.object({}),
});

export const cancelRegistrationSchema = z.object({
  body: z.object({}),

  params: z
    .object({
      courseId: courseIdSchema,
    })
    .strict(),

  query: z
    .object({
      academicPeriodId: academicPeriodIdSchema,
    })
    .strict(),
});
