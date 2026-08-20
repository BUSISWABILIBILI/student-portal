import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";

import {
  createCourseController,
  getCourseController,
  listCoursesController,
  updateCourseController,
} from "../controllers/courseController.js";

import {
  createCourseSchema,
  getCourseSchema,
  listCoursesSchema,
  updateCourseSchema,
} from "../validators/courseValidators.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("admin", "student"),
  validateRequest(listCoursesSchema),
  listCoursesController,
);

router.get(
  "/:courseId",
  authorize("admin", "student"),
  validateRequest(getCourseSchema),
  getCourseController,
);

router.post(
  "/",
  authorize("admin"),
  validateRequest(createCourseSchema),
  createCourseController,
);

router.patch(
  "/:courseId",
  authorize("admin"),
  validateRequest(updateCourseSchema),
  updateCourseController,
);

export default router;
