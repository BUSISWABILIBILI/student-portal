import pool from "../config/database.js";

import { createAuditLog } from "../repositories/auditLogRepository.js";
import {
  createResultRecord,
  findEnrollmentForResultById,
  findPublishedResultsForStudent,
  findResultByEnrollmentId,
  findResultById,
  findResults,
  publishResultRecord,
  unpublishResultRecord,
  updateResultRecord,
} from "../repositories/resultRepository.js";

import AppError from "../utils/AppError.js";
import calculateGrade from "../utils/calculateGrade.js";
import formatResult from "../utils/formatResult.js";

const roundToTwoDecimals = (value) => Number(value.toFixed(2));

const calculateWeightedGpa = (results) => {
  const attemptedCredits = results.reduce(
    (total, result) => total + Number(result.credits || 0),
    0,
  );

  if (attemptedCredits === 0) {
    return 0;
  }

  const weightedGradePoints = results.reduce(
    (total, result) =>
      total + Number(result.grade_point || 0) * Number(result.credits || 0),
    0,
  );

  return roundToTwoDecimals(weightedGradePoints / attemptedCredits);
};

const ensureResultExists = (result) => {
  if (!result) {
    throw new AppError("Result not found.", 404);
  }
};

const getChangedFields = (changes) => Object.keys(changes);

const buildAcademicSummary = (results) => {
  const completedResults = results.filter(
    (result) => result.outcome !== "incomplete" && result.final_mark !== null,
  );

  const passedResults = completedResults.filter(
    (result) => result.outcome === "pass",
  );

  const failedResults = completedResults.filter(
    (result) => result.outcome === "fail",
  );

  const attemptedCredits = completedResults.reduce(
    (total, result) => total + Number(result.credits || 0),
    0,
  );

  const earnedCredits = passedResults.reduce(
    (total, result) => total + Number(result.credits || 0),
    0,
  );

  const averageMark =
    completedResults.length > 0
      ? roundToTwoDecimals(
          completedResults.reduce(
            (total, result) => total + Number(result.final_mark),
            0,
          ) / completedResults.length,
        )
      : 0;

  return {
    totalPublishedResults: results.length,
    completedCourses: completedResults.length,
    passedCourses: passedResults.length,
    failedCourses: failedResults.length,
    attemptedCredits,
    earnedCredits,
    outstandingCredits: attemptedCredits - earnedCredits,
    averageMark,
    gpa: calculateWeightedGpa(completedResults),
  };
};

export const captureResult = async (
  resultData,
  administrator,
  requestMetadata,
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const enrollment = await findEnrollmentForResultById(
      resultData.enrollmentId,
      connection,
    );

    if (!enrollment) {
      throw new AppError("Enrollment not found.", 404);
    }

    if (enrollment.enrollment_status !== "registered") {
      throw new AppError(
        "Results can only be captured for registered enrollments.",
        400,
      );
    }

    const existingResult = await findResultByEnrollmentId(
      resultData.enrollmentId,
      connection,
    );

    if (existingResult) {
      throw new AppError(
        "A result already exists for this enrollment. Update the existing result instead.",
        409,
      );
    }

    const courseworkMark = resultData.courseworkMark ?? null;

    const examinationMark = resultData.examinationMark ?? null;

    const calculatedResult = calculateGrade({
      courseworkMark,
      examinationMark,
    });

    const result = await createResultRecord(
      {
        enrollmentId: resultData.enrollmentId,
        courseworkMark,
        examinationMark,
        ...calculatedResult,
        remarks: resultData.remarks ?? null,
        capturedBy: administrator.id,
      },
      connection,
    );

    await createAuditLog(
      {
        userId: administrator.id,
        action: "result_captured",
        entityType: "result",
        entityId: result.id,
        metadata: {
          enrollmentId: result.enrollment_id,
          courseCode: result.course_code,
          finalMark: result.final_mark,
          outcome: result.outcome,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return formatResult(result);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getResults = async (filters) => {
  const result = await findResults(filters);

  const totalPages = Math.ceil(result.total / filters.limit);

  return {
    results: result.results.map(formatResult),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems: result.total,
      totalPages,
      hasPreviousPage: filters.page > 1,
      hasNextPage: filters.page < totalPages,
    },
  };
};

export const getResult = async (resultId) => {
  const result = await findResultById(resultId);

  ensureResultExists(result);

  return formatResult(result);
};

export const editResult = async (
  resultId,
  changes,
  administrator,
  requestMetadata,
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingResult = await findResultById(resultId, connection);

    ensureResultExists(existingResult);

    const courseworkMark =
      changes.courseworkMark !== undefined
        ? changes.courseworkMark
        : existingResult.coursework_mark;

    const examinationMark =
      changes.examinationMark !== undefined
        ? changes.examinationMark
        : existingResult.examination_mark;

    const calculatedResult = calculateGrade({
      courseworkMark,
      examinationMark,
    });

    const updatedResult = await updateResultRecord(
      resultId,
      {
        courseworkMark,
        examinationMark,
        ...calculatedResult,
        remarks:
          changes.remarks !== undefined
            ? changes.remarks
            : existingResult.remarks,
        publicationStatus: "draft",
        publishedAt: null,
      },
      connection,
    );

    await createAuditLog(
      {
        userId: administrator.id,
        action: "result_updated",
        entityType: "result",
        entityId: resultId,
        metadata: {
          changedFields: getChangedFields(changes),
          previousPublicationStatus: existingResult.publication_status,
          finalMark: updatedResult.final_mark,
          outcome: updatedResult.outcome,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return formatResult(updatedResult);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const publishResult = async (
  resultId,
  administrator,
  requestMetadata,
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingResult = await findResultById(resultId, connection);

    ensureResultExists(existingResult);

    if (existingResult.outcome === "incomplete") {
      throw new AppError("An incomplete result cannot be published.", 400);
    }

    const result = await publishResultRecord(resultId, connection);

    await createAuditLog(
      {
        userId: administrator.id,
        action: "result_published",
        entityType: "result",
        entityId: resultId,
        metadata: {
          enrollmentId: result.enrollment_id,
          finalMark: result.final_mark,
          outcome: result.outcome,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return formatResult(result);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const unpublishResult = async (
  resultId,
  administrator,
  requestMetadata,
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingResult = await findResultById(resultId, connection);

    ensureResultExists(existingResult);

    const result = await unpublishResultRecord(resultId, connection);

    await createAuditLog(
      {
        userId: administrator.id,
        action: "result_unpublished",
        entityType: "result",
        entityId: resultId,
        metadata: {
          enrollmentId: result.enrollment_id,
          previousPublicationStatus: existingResult.publication_status,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return formatResult(result);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getMyResults = async (userId, filters) => {
  const results = await findPublishedResultsForStudent(userId, filters);

  return {
    results: results.map((result) =>
      formatResult(result, {
        includeStudent: false,
        includeCapturedBy: false,
      }),
    ),
    academicSummary: buildAcademicSummary(results),
  };
};
