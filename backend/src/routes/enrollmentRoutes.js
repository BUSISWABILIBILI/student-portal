import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";

import {
  cancelCourseController,
  listEnrollmentsController,
  listMyCoursesController,
  registerCourseController,
} from "../controllers/enrollmentController.js";

import {
  cancelRegistrationSchema,
  registerCourseSchema,
} from "../validators/courseValidators.js";
import { listEnrollmentsSchema } from "../validators/enrollmentValidators.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("admin"),
  validateRequest(listEnrollmentsSchema),
  listEnrollmentsController,
);

router.get("/me", authorize("student"), listMyCoursesController);

router.post(
  "/",
  authorize("student"),
  validateRequest(registerCourseSchema),
  registerCourseController,
);

router.patch(
  "/:courseId/cancel",
  authorize("student"),
  validateRequest(cancelRegistrationSchema),
  cancelCourseController,
);

export default router;
