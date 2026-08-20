import {
  createCourse,
  editCourse,
  getCourse,
  getCourses,
} from "../services/courseService.js";

const getRequestMetadata = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

export const createCourseController = async (req, res) => {
  const course = await createCourse(
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(201).json({
    success: true,
    message: "Course created successfully.",
    data: {
      course,
    },
  });
};

export const listCoursesController = async (req, res) => {
  const result = await getCourses(req.validated.query, {
    activeOnly: req.user.role === "student",
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getCourseController = async (req, res) => {
  const course = await getCourse(req.validated.params.courseId);

  res.status(200).json({
    success: true,
    data: {
      course,
    },
  });
};

export const updateCourseController = async (req, res) => {
  const course = await editCourse(
    req.validated.params.courseId,
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Course updated successfully.",
    data: {
      course,
    },
  });
};
