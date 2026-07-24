import { Router } from "express";

import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";

import {
  createAnnouncementController,
  deleteAnnouncementController,
  getAnnouncementController,
  listAnnouncementsController,
  listMyAnnouncementsController,
  publishAnnouncementController,
  unpublishAnnouncementController,
  updateAnnouncementController,
} from "../controllers/announcementController.js";

import {
  announcementIdSchema,
  createAnnouncementSchema,
  listAnnouncementsSchema,
  myAnnouncementsSchema,
  updateAnnouncementSchema,
} from "../validators/announcementValidators.js";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  validateRequest(myAnnouncementsSchema),
  listMyAnnouncementsController,
);

router.get(
  "/",
  authorize("admin"),
  validateRequest(listAnnouncementsSchema),
  listAnnouncementsController,
);

router.post(
  "/",
  authorize("admin"),
  validateRequest(createAnnouncementSchema),
  createAnnouncementController,
);

router.get(
  "/:announcementId",
  authorize("admin"),
  validateRequest(announcementIdSchema),
  getAnnouncementController,
);

router.patch(
  "/:announcementId",
  authorize("admin"),
  validateRequest(updateAnnouncementSchema),
  updateAnnouncementController,
);

router.patch(
  "/:announcementId/publish",
  authorize("admin"),
  validateRequest(announcementIdSchema),
  publishAnnouncementController,
);

router.patch(
  "/:announcementId/unpublish",
  authorize("admin"),
  validateRequest(announcementIdSchema),
  unpublishAnnouncementController,
);

router.delete(
  "/:announcementId",
  authorize("admin"),
  validateRequest(announcementIdSchema),
  deleteAnnouncementController,
);

export default router;
