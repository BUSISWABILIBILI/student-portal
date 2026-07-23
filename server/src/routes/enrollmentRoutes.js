import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";

import {
  cancelCourseController,
  listMyCoursesController,
  registerCourseController,
} from "../controllers/enrollmentController.js";

import {
  cancelRegistrationSchema,
  registerCourseSchema,
} from "../validators/courseValidators.js";

const router = Router();

router.use(authenticate, authorize("student"));

router.get("/me", listMyCoursesController);

router.post(
  "/",
  validateRequest(registerCourseSchema),
  registerCourseController,
);

router.patch(
  "/:courseId/cancel",
  validateRequest(cancelRegistrationSchema),
  cancelCourseController,
);

export default router;
