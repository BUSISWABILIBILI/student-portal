import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";

import {
  createStudent,
  getUserById,
  listUsers,
  updateProfile,
  updateStatus,
  updateUser,
} from "../controllers/userController.js";

import {
  createStudentSchema,
  getUserSchema,
  listUsersSchema,
  updateStudentProfileSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../validators/userValidators.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", validateRequest(listUsersSchema), listUsers);

router.post("/students", validateRequest(createStudentSchema), createStudent);

router.get("/:userId", validateRequest(getUserSchema), getUserById);

router.patch("/:userId", validateRequest(updateUserSchema), updateUser);

router.patch(
  "/:userId/student-profile",
  validateRequest(updateStudentProfileSchema),
  updateProfile,
);

router.patch(
  "/:userId/status",
  validateRequest(updateUserStatusSchema),
  updateStatus,
);

export default router;
