const COURSEWORK_WEIGHT = 0.4;
const EXAMINATION_WEIGHT = 0.6;
const PASS_MARK = 50;

const roundToTwoDecimals = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const getGradeDetails = (finalMark) => {
  if (finalMark >= 80) {
    return {
      grade: "A",
      gradePoint: 4,
    };
  }

  if (finalMark >= 70) {
    return {
      grade: "B",
      gradePoint: 3,
    };
  }

  if (finalMark >= 60) {
    return {
      grade: "C",
      gradePoint: 2,
    };
  }

  if (finalMark >= 50) {
    return {
      grade: "D",
      gradePoint: 1,
    };
  }

  return {
    grade: "F",
    gradePoint: 0,
  };
};

const calculateGrade = ({ courseworkMark, examinationMark }) => {
  const hasCoursework = courseworkMark !== null && courseworkMark !== undefined;

  const hasExamination =
    examinationMark !== null && examinationMark !== undefined;

  if (!hasCoursework || !hasExamination) {
    return {
      finalMark: null,
      grade: null,
      gradePoint: null,
      outcome: "incomplete",
    };
  }

  const finalMark = roundToTwoDecimals(
    Number(courseworkMark) * COURSEWORK_WEIGHT +
      Number(examinationMark) * EXAMINATION_WEIGHT,
  );

  const gradeDetails = getGradeDetails(finalMark);

  return {
    finalMark,
    grade: gradeDetails.grade,
    gradePoint: gradeDetails.gradePoint,
    outcome: finalMark >= PASS_MARK ? "pass" : "fail",
  };
};

export { COURSEWORK_WEIGHT, EXAMINATION_WEIGHT, PASS_MARK };

export default calculateGrade;
