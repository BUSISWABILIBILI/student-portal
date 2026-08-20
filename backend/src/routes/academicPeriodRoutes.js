import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";

import { listActiveAcademicPeriodsController } from "../controllers/academicPeriodController.js";

const router = Router();

router.use(authenticate);

router.get(
  "/active",
  authorize("admin", "student"),
  listActiveAcademicPeriodsController,
);

export default router;
