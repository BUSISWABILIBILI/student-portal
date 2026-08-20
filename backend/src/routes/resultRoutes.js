import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";

import {
  captureResultController,
  getResultController,
  listMyResultsController,
  listResultsController,
  publishResultController,
  unpublishResultController,
  updateResultController,
} from "../controllers/resultController.js";

import {
  captureResultSchema,
  listResultsSchema,
  myResultsSchema,
  resultIdSchema,
  updateResultSchema,
} from "../validators/resultValidators.js";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  authorize("student"),
  validateRequest(myResultsSchema),
  listMyResultsController,
);

router.get(
  "/",
  authorize("admin"),
  validateRequest(listResultsSchema),
  listResultsController,
);

router.post(
  "/",
  authorize("admin"),
  validateRequest(captureResultSchema),
  captureResultController,
);

router.get(
  "/:resultId",
  authorize("admin"),
  validateRequest(resultIdSchema),
  getResultController,
);

router.patch(
  "/:resultId",
  authorize("admin"),
  validateRequest(updateResultSchema),
  updateResultController,
);

router.patch(
  "/:resultId/publish",
  authorize("admin"),
  validateRequest(resultIdSchema),
  publishResultController,
);

router.patch(
  "/:resultId/unpublish",
  authorize("admin"),
  validateRequest(resultIdSchema),
  unpublishResultController,
);

export default router;
