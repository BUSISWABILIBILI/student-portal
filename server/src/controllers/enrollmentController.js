import {
  cancelStudentCourse,
  getStudentCourses,
  registerStudentForCourse,
} from "../services/enrollmentService.js";

const getRequestMetadata = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

export const registerCourseController = async (req, res) => {
  const registration = await registerStudentForCourse(
    req.user.id,
    req.validated.body,
    getRequestMetadata(req),
  );

  res.status(201).json({
    success: true,
    message: "Course registration completed successfully.",
    data: {
      registration,
    },
  });
};

export const cancelCourseController = async (req, res) => {
  const registration = await cancelStudentCourse(
    req.user.id,
    req.validated.params.courseId,
    req.validated.query.academicPeriodId,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Course registration cancelled successfully.",
    data: {
      registration,
    },
  });
};

export const listMyCoursesController = async (req, res) => {
  const courses = await getStudentCourses(req.user.id, {
    status: req.query.status,
    academicPeriodId: req.query.academicPeriodId
      ? Number(req.query.academicPeriodId)
      : undefined,
  });

  res.status(200).json({
    success: true,
    data: {
      courses,
    },
  });
};
