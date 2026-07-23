import AppError from "../utils/AppError.js";
import formatCourse from "../utils/formatCourse.js";

import {
  createCourseRecord,
  findCourseByCode,
  findCourseById,
  findCourses,
  updateCourseRecord,
} from "../repositories/courseRepository.js";

import { createAuditLog } from "../repositories/auditLogRepository.js";

export const createCourse = async (
  courseData,
  administrator,
  requestMetadata,
) => {
  const existingCourse = await findCourseByCode(courseData.courseCode);

  if (existingCourse) {
    throw new AppError("A course with this code already exists.", 409);
  }

  const course = await createCourseRecord({
    ...courseData,
    createdBy: administrator.id,
  });

  await createAuditLog({
    userId: administrator.id,
    action: "course_created",
    entityType: "course",
    entityId: course.id,
    metadata: {
      courseCode: course.course_code,
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatCourse(course);
};

export const getCourses = async (filters, options = {}) => {
  const finalFilters = {
    ...filters,
  };

  if (options.activeOnly) {
    finalFilters.status = "active";
  }

  const result = await findCourses(finalFilters);

  const totalPages = Math.ceil(result.total / finalFilters.limit);

  return {
    courses: result.courses.map(formatCourse),

    pagination: {
      page: finalFilters.page,
      limit: finalFilters.limit,
      totalItems: result.total,
      totalPages,
      hasPreviousPage: finalFilters.page > 1,
      hasNextPage: finalFilters.page < totalPages,
    },
  };
};

export const getCourse = async (courseId) => {
  const course = await findCourseById(courseId);

  if (!course) {
    throw new AppError("Course not found.", 404);
  }

  return formatCourse(course);
};

export const editCourse = async (
  courseId,
  changes,
  administrator,
  requestMetadata,
) => {
  const existingCourse = await findCourseById(courseId);

  if (!existingCourse) {
    throw new AppError("Course not found.", 404);
  }

  if (changes.courseCode && changes.courseCode !== existingCourse.course_code) {
    const matchingCourse = await findCourseByCode(changes.courseCode);

    if (matchingCourse) {
      throw new AppError("A course with this code already exists.", 409);
    }
  }

  if (
    changes.capacity !== undefined &&
    changes.capacity < Number(existingCourse.enrolled_count)
  ) {
    throw new AppError(
      "Course capacity cannot be lower than the current number of registered students.",
      400,
    );
  }

  const updatedCourse = await updateCourseRecord(courseId, changes);

  await createAuditLog({
    userId: administrator.id,
    action: "course_updated",
    entityType: "course",
    entityId: courseId,
    metadata: {
      changedFields: Object.keys(changes),
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatCourse(updatedCourse);
};
