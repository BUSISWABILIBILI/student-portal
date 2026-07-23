import pool from "../config/database.js";

import AppError from "../utils/AppError.js";

import {
  countRegisteredStudents,
  findCourseById,
} from "../repositories/courseRepository.js";

import { findAcademicPeriodById } from "../repositories/academicPeriodRepository.js";

import {
  cancelEnrollmentRecord,
  createEnrollment,
  findEnrollment,
  findStudentEnrollments,
  findStudentProfileByUserId,
  reactivateEnrollment,
} from "../repositories/enrollmentRepository.js";

import { createAuditLog } from "../repositories/auditLogRepository.js";

const isDateWithinRange = (date, startDate, endDate) => {
  const currentDate = new Date(date);

  const start = new Date(`${startDate}T00:00:00`);

  const end = new Date(`${endDate}T23:59:59`);

  return currentDate >= start && currentDate <= end;
};

const formatEnrollment = (enrollment) => ({
  id: enrollment.id,
  status: enrollment.status,
  registeredAt: enrollment.registered_at,
  cancelledAt: enrollment.cancelled_at,
  course: {
    id: enrollment.course_id,
    courseCode: enrollment.course_code,
    courseName: enrollment.course_name,
    description: enrollment.description,
    department: enrollment.department,
    creditValue: Number(enrollment.credit_value),
  },
  academicPeriod: {
    id: enrollment.academic_period_id,
    name: enrollment.academic_period_name,
    academicYear: enrollment.academic_year,
  },
});

export const registerStudentForCourse = async (
  userId,
  registrationData,
  requestMetadata,
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const studentProfile = await findStudentProfileByUserId(userId, connection);

    if (!studentProfile) {
      throw new AppError("Student profile not found.", 404);
    }

    const academicPeriod = await findAcademicPeriodById(
      registrationData.academicPeriodId,
      connection,
    );

    if (!academicPeriod) {
      throw new AppError("Academic period not found.", 404);
    }

    if (!academicPeriod.is_active) {
      throw new AppError("This academic period is not active.", 400);
    }

    if (
      !academicPeriod.registration_start_date ||
      !academicPeriod.registration_end_date
    ) {
      throw new AppError(
        "Registration dates have not been configured for this academic period.",
        400,
      );
    }

    const registrationOpen = isDateWithinRange(
      new Date(),
      academicPeriod.registration_start_date,
      academicPeriod.registration_end_date,
    );

    if (!registrationOpen) {
      throw new AppError("Course registration is currently closed.", 400);
    }

    const course = await findCourseById(registrationData.courseId, connection);

    if (!course) {
      throw new AppError("Course not found.", 404);
    }

    if (!course.is_active) {
      throw new AppError("This course is not available for registration.", 400);
    }

    const existingEnrollment = await findEnrollment(
      studentProfile.id,
      registrationData.courseId,
      registrationData.academicPeriodId,
      connection,
    );

    if (existingEnrollment?.status === "registered") {
      throw new AppError("You are already registered for this course.", 409);
    }

    if (existingEnrollment?.status === "completed") {
      throw new AppError("You have already completed this course.", 409);
    }

    const registeredCount = await countRegisteredStudents(
      registrationData.courseId,
      registrationData.academicPeriodId,
      connection,
    );

    if (registeredCount >= Number(course.capacity)) {
      throw new AppError(
        "This course has reached its registration capacity.",
        409,
      );
    }

    let enrollmentId;

    if (existingEnrollment?.status === "cancelled") {
      await reactivateEnrollment(existingEnrollment.id, connection);

      enrollmentId = existingEnrollment.id;
    } else {
      enrollmentId = await createEnrollment(
        {
          studentProfileId: studentProfile.id,
          courseId: registrationData.courseId,
          academicPeriodId: registrationData.academicPeriodId,
        },
        connection,
      );
    }

    await createAuditLog(
      {
        userId,
        action: "course_registration_created",
        entityType: "enrollment",
        entityId: enrollmentId,
        metadata: {
          courseId: registrationData.courseId,
          academicPeriodId: registrationData.academicPeriodId,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return {
      enrollmentId,
      courseId: registrationData.courseId,
      courseCode: course.course_code,
      courseName: course.course_name,
      academicPeriodId: academicPeriod.id,
      academicPeriodName: academicPeriod.name,
      status: "registered",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const cancelStudentCourse = async (
  userId,
  courseId,
  academicPeriodId,
  requestMetadata,
) => {
  const studentProfile = await findStudentProfileByUserId(userId);

  if (!studentProfile) {
    throw new AppError("Student profile not found.", 404);
  }

  const enrollment = await findEnrollment(
    studentProfile.id,
    courseId,
    academicPeriodId,
  );

  if (!enrollment) {
    throw new AppError("Course registration not found.", 404);
  }

  if (enrollment.status === "cancelled") {
    throw new AppError(
      "This course registration has already been cancelled.",
      409,
    );
  }

  if (enrollment.status === "completed") {
    throw new AppError("A completed course cannot be cancelled.", 400);
  }

  const academicPeriod = await findAcademicPeriodById(academicPeriodId);

  if (!academicPeriod || !academicPeriod.registration_end_date) {
    throw new AppError("Registration period information is unavailable.", 400);
  }

  const cancellationOpen = isDateWithinRange(
    new Date(),
    academicPeriod.registration_start_date,
    academicPeriod.registration_end_date,
  );

  if (!cancellationOpen) {
    throw new AppError("Course cancellation is currently closed.", 400);
  }

  await cancelEnrollmentRecord(enrollment.id);

  await createAuditLog({
    userId,
    action: "course_registration_cancelled",
    entityType: "enrollment",
    entityId: enrollment.id,
    metadata: {
      courseId,
      academicPeriodId,
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return {
    enrollmentId: enrollment.id,
    courseId,
    academicPeriodId,
    status: "cancelled",
  };
};

export const getStudentCourses = async (userId, filters) => {
  const studentProfile = await findStudentProfileByUserId(userId);

  if (!studentProfile) {
    throw new AppError("Student profile not found.", 404);
  }

  const enrollments = await findStudentEnrollments(studentProfile.id, filters);

  return enrollments.map(formatEnrollment);
};
