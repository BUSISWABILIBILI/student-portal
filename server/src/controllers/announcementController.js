import {
  createAnnouncement,
  editAnnouncement,
  getAnnouncement,
  getAnnouncements,
  getMyAnnouncements,
  publishAnnouncement,
  removeAnnouncement,
  unpublishAnnouncement,
} from "../services/announcementService.js";

const getRequestMetadata = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

export const createAnnouncementController = async (req, res) => {
  const announcement = await createAnnouncement(
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(201).json({
    success: true,
    message: "Announcement created successfully.",
    data: {
      announcement,
    },
  });
};

export const listAnnouncementsController = async (req, res) => {
  const result = await getAnnouncements(req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getAnnouncementController = async (req, res) => {
  const announcement = await getAnnouncement(
    req.validated.params.announcementId,
  );

  res.status(200).json({
    success: true,
    data: {
      announcement,
    },
  });
};

export const updateAnnouncementController = async (req, res) => {
  const announcement = await editAnnouncement(
    req.validated.params.announcementId,
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Announcement updated successfully.",
    data: {
      announcement,
    },
  });
};

export const publishAnnouncementController = async (req, res) => {
  const announcement = await publishAnnouncement(
    req.validated.params.announcementId,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Announcement published successfully.",
    data: {
      announcement,
    },
  });
};

export const unpublishAnnouncementController = async (req, res) => {
  const announcement = await unpublishAnnouncement(
    req.validated.params.announcementId,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Announcement returned to draft.",
    data: {
      announcement,
    },
  });
};

export const deleteAnnouncementController = async (req, res) => {
  await removeAnnouncement(
    req.validated.params.announcementId,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Announcement deleted successfully.",
  });
};

export const listMyAnnouncementsController = async (req, res) => {
  const announcements = await getMyAnnouncements(req.user, req.validated.query);

  res.status(200).json({
    success: true,
    data: {
      announcements,
    },
  });
};
