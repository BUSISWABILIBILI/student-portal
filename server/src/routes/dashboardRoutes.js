import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";

import {
  adminDashboardController,
  studentDashboardController,
} from "../controllers/dashboardController.js";

const router = Router();

router.use(authenticate);

router.get("/admin", authorize("admin"), adminDashboardController);

router.get("/student", authorize("student"), studentDashboardController);

export default router;
