const nullableNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

const formatResult = (result) => {
  if (!result) {
    return null;
  }

  return {
    id: result.id,

    enrollmentId: result.enrollment_id,

    courseworkMark: nullableNumber(result.coursework_mark),

    examinationMark: nullableNumber(result.examination_mark),

    finalMark: nullableNumber(result.final_mark),

    grade: result.grade || null,

    gradePoint: nullableNumber(result.grade_point),

    outcome: result.outcome,

    publicationStatus: result.publication_status,

    remarks: result.remarks || null,

    publishedAt: result.published_at || null,

    createdAt: result.created_at,

    updatedAt: result.updated_at,

    student: {
      userId: result.user_id,

      studentProfileId: result.student_profile_id,

      studentNumber: result.student_number,

      firstName: result.first_name,

      lastName: result.last_name,

      fullName: `${result.first_name} ${result.last_name}`,

      email: result.email,

      programme: result.programme,

      yearLevel: result.year_level,
    },

    course: {
      id: result.course_id,

      courseCode: result.course_code,

      courseName: result.course_name,

      department: result.department,

      creditValue: Number(result.credit_value),
    },

    academicPeriod: {
      id: result.academic_period_id,

      name: result.academic_period_name,

      academicYear: result.academic_year,
    },
  };
};

export default formatResult;
