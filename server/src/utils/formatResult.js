const numberOrNull = (value) =>
  value === null || value === undefined ? null : Number(value);

const formatAcademicPeriodLabel = (academicYear, semester) => {
  if (!academicYear || !semester) {
    return null;
  }

  return `${academicYear} ${semester}`;
};

const formatResult = (
  result,
  { includeStudent = true, includeCapturedBy = true } = {},
) => {
  if (!result) {
    return null;
  }

  return {
    id: result.id,
    enrollmentId: result.enrollment_id,
    courseworkMark: numberOrNull(result.coursework_mark),
    examinationMark: numberOrNull(result.examination_mark),
    finalMark: numberOrNull(result.final_mark),
    grade: result.grade,
    gradePoint: numberOrNull(result.grade_point),
    outcome: result.outcome,
    publicationStatus: result.publication_status,
    remarks: result.remarks,
    publishedAt: result.published_at,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
    ...(includeStudent && {
      student: {
        id: result.student_id,
        firstName: result.student_first_name,
        lastName: result.student_last_name,
        name: `${result.student_first_name} ${result.student_last_name}`,
        email: result.student_email,
        studentNumber: result.student_number || null,
        programme: result.programme || null,
        yearLevel: result.year_level || null,
      },
    }),
    course: {
      id: result.course_id,
      courseCode: result.course_code,
      courseName: result.course_name,
      department: result.department || null,
      creditValue: Number(result.credits || 0),
    },
    academicPeriod: {
      id: result.academic_period_id,
      academicYear: result.academic_year,
      semester: result.semester,
      label: formatAcademicPeriodLabel(result.academic_year, result.semester),
    },
    ...(includeCapturedBy && {
      capturedBy: result.captured_by
        ? {
            id: result.captured_by,
            firstName: result.captured_by_first_name,
            lastName: result.captured_by_last_name,
            email: result.captured_by_email,
          }
        : null,
    }),
  };
};

export default formatResult;
