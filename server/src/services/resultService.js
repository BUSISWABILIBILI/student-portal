import AppError from "../utils/AppError.js";
import calculateGrade from "../utils/calculateGrade.js";
import formatResult from "../utils/formatResult.js";

import {
  createResultRecord,
  findEnrollmentForResult,
  findPublishedResultsForStudent,
  findResultByEnrollmentId,
  findResultById,
  findResults,
  publishResultRecord,
  unpublishResultRecord,
  updateResultRecord,
} from "../repositories/resultRepository.js";

import { createAuditLog } from "../repositories/auditLogRepository.js";

const getResultValues = (existingResult, changes) => {
  const courseworkMark =
    changes.courseworkMark !== undefined
      ? changes.courseworkMark
      : (existingResult?.coursework_mark ?? null);

  const examinationMark =
    changes.examinationMark !== undefined
      ? changes.examinationMark
      : (existingResult?.examination_mark ?? null);

  const remarks =
    changes.remarks !== undefined
      ? changes.remarks
      : (existingResult?.remarks ?? null);

  const calculation = calculateGrade({
    courseworkMark,
    examinationMark,
  });

  return {
    courseworkMark,
    examinationMark,
    remarks,
    ...calculation,
  };
};

export const captureResult = async (
  resultData,
  administrator,
  requestMetadata,
) => {
  const enrollment = await findEnrollmentForResult(resultData.enrollmentId);

  if (!enrollment) {
    throw new AppError("Enrollment not found.", 404);
  }

  if (enrollment.status === "cancelled") {
    throw new AppError(
      "Results cannot be captured for a cancelled enrollment.",
      400,
    );
  }

  const existingResult = await findResultByEnrollmentId(
    resultData.enrollmentId,
  );

  if (existingResult) {
    throw new AppError(
      "A result already exists for this enrollment. Update the existing result instead.",
      409,
    );
  }

  const values = getResultValues(null, resultData);

  const result = await createResultRecord({
    enrollmentId: resultData.enrollmentId,

    courseworkMark: values.courseworkMark,

    examinationMark: values.examinationMark,

    finalMark: values.finalMark,

    grade: values.grade,

    gradePoint: values.gradePoint,

    outcome: values.outcome,

    remarks: values.remarks,

    capturedBy: administrator.id,
  });

  await createAuditLog({
    userId: administrator.id,
    action: "result_captured",
    entityType: "result",
    entityId: result.id,
    metadata: {
      enrollmentId: resultData.enrollmentId,

      finalMark: values.finalMark,

      outcome: values.outcome,
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatResult(result);
};

export const editResult = async (
  resultId,
  changes,
  administrator,
  requestMetadata,
) => {
  const existingResult = await findResultById(resultId);

  if (!existingResult) {
    throw new AppError("Result not found.", 404);
  }

  const values = getResultValues(existingResult, changes);

  const updatedResult = await updateResultRecord(resultId, values);

  await createAuditLog({
    userId: administrator.id,
    action: "result_updated",
    entityType: "result",
    entityId: resultId,
    metadata: {
      changedFields: Object.keys(changes),

      finalMark: values.finalMark,

      outcome: values.outcome,
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatResult(updatedResult);
};

export const publishResult = async (
  resultId,
  administrator,
  requestMetadata,
) => {
  const result = await findResultById(resultId);

  if (!result) {
    throw new AppError("Result not found.", 404);
  }

  if (result.outcome === "incomplete" || result.final_mark === null) {
    throw new AppError("An incomplete result cannot be published.", 400);
  }

  if (result.publication_status === "published") {
    return formatResult(result);
  }

  const publishedResult = await publishResultRecord(resultId);

  await createAuditLog({
    userId: administrator.id,
    action: "result_published",
    entityType: "result",
    entityId: resultId,
    metadata: {
      finalMark: result.final_mark,

      outcome: result.outcome,
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatResult(publishedResult);
};

export const unpublishResult = async (
  resultId,
  administrator,
  requestMetadata,
) => {
  const result = await findResultById(resultId);

  if (!result) {
    throw new AppError("Result not found.", 404);
  }

  if (result.publication_status === "draft") {
    return formatResult(result);
  }

  const draftResult = await unpublishResultRecord(resultId);

  await createAuditLog({
    userId: administrator.id,
    action: "result_unpublished",
    entityType: "result",
    entityId: resultId,
    metadata: null,
    ipAddress: requestMetadata.ipAddress,
  });

  return formatResult(draftResult);
};

export const getResult = async (resultId) => {
  const result = await findResultById(resultId);

  if (!result) {
    throw new AppError("Result not found.", 404);
  }

  return formatResult(result);
};

export const getResults = async (filters) => {
  const response = await findResults(filters);

  const totalPages = Math.ceil(response.total / filters.limit);

  return {
    results: response.results.map(formatResult),

    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems: response.total,
      totalPages,
      hasPreviousPage: filters.page > 1,
      hasNextPage: filters.page < totalPages,
    },

    filters: {
      search: filters.search,

      academicPeriodId: filters.academicPeriodId || null,

      courseId: filters.courseId || null,

      outcome: filters.outcome || null,

      publicationStatus: filters.publicationStatus || null,

      sortBy: filters.sortBy,

      sortOrder: filters.sortOrder,
    },
  };
};

const calculateAcademicSummary = (results) => {
  const completedResults = results.filter(
    (result) => result.outcome !== "incomplete" && result.final_mark !== null,
  );

  const attemptedCredits = completedResults.reduce(
    (total, result) => total + Number(result.credit_value),
    0,
  );

  const passedResults = completedResults.filter(
    (result) => result.outcome === "pass",
  );

  const earnedCredits = passedResults.reduce(
    (total, result) => total + Number(result.credit_value),
    0,
  );

  const weightedGradePoints = completedResults.reduce(
    (total, result) =>
      total + Number(result.grade_point) * Number(result.credit_value),
    0,
  );

  const gpa =
    attemptedCredits > 0
      ? Number((weightedGradePoints / attemptedCredits).toFixed(2))
      : null;

  const averageMark =
    completedResults.length > 0
      ? Number(
          (
            completedResults.reduce(
              (total, result) => total + Number(result.final_mark),
              0,
            ) / completedResults.length
          ).toFixed(2),
        )
      : null;

  return {
    totalPublishedResults: results.length,

    completedCourses: completedResults.length,

    passedCourses: passedResults.length,

    failedCourses: completedResults.filter(
      (result) => result.outcome === "fail",
    ).length,

    attemptedCredits,
    earnedCredits,
    outstandingCredits: attemptedCredits - earnedCredits,

    averageMark,
    gpa,
  };
};

export const getMyResults = async (userId, filters) => {
  const results = await findPublishedResultsForStudent(userId, filters);

  return {
    results: results.map(formatResult),

    academicSummary: calculateAcademicSummary(results),
  };
};
