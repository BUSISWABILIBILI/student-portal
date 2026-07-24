import AppError from "../utils/AppError.js";
import formatAnnouncement from "../utils/formatAnnouncement.js";

import {
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  findAnnouncementById,
  findAnnouncements,
  findStudentProfileById,
  findVisibleAnnouncements,
  publishAnnouncementRecord,
  unpublishAnnouncementRecord,
  updateAnnouncementRecord,
} from "../repositories/announcementRepository.js";

import { findStudentProfileByUserId } from "../repositories/enrollmentRepository.js";

import { createAuditLog } from "../repositories/auditLogRepository.js";

const normalizeTarget = ({ targetType, targetRole, targetStudentId }) => ({
  targetType,

  targetRole: targetType === "role" ? targetRole : null,

  targetStudentId: targetType === "student" ? targetStudentId : null,
});

const validateTargetStudent = async ({ targetType, targetStudentId }) => {
  if (targetType !== "student") {
    return;
  }

  const student = await findStudentProfileById(targetStudentId);

  if (!student) {
    throw new AppError("Target student was not found.", 404);
  }

  if (!student.is_active) {
    throw new AppError(
      "Announcements cannot be assigned to an inactive student.",
      400,
    );
  }
};

export const createAnnouncement = async (
  input,
  administrator,
  requestMetadata,
) => {
  await validateTargetStudent(input);

  const target = normalizeTarget(input);

  const announcement = await createAnnouncementRecord({
    title: input.title,
    content: input.content,

    targetType: target.targetType,

    targetRole: target.targetRole,

    targetStudentId: target.targetStudentId,

    priority: input.priority,

    publishAt: input.publishAt ? new Date(input.publishAt) : null,

    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,

    createdBy: administrator.id,
  });

  await createAuditLog({
    userId: administrator.id,

    action: "announcement_created",

    entityType: "announcement",

    entityId: announcement.id,

    metadata: {
      title: announcement.title,

      targetType: announcement.target_type,

      priority: announcement.priority,
    },

    ipAddress: requestMetadata.ipAddress,
  });

  return formatAnnouncement(announcement);
};

export const editAnnouncement = async (
  announcementId,
  changes,
  administrator,
  requestMetadata,
) => {
  const existing = await findAnnouncementById(announcementId);

  if (!existing) {
    throw new AppError("Announcement not found.", 404);
  }

  const merged = {
    title: changes.title ?? existing.title,

    content: changes.content ?? existing.content,

    targetType: changes.targetType ?? existing.target_type,

    targetRole:
      changes.targetRole !== undefined
        ? changes.targetRole
        : existing.target_role,

    targetStudentId:
      changes.targetStudentId !== undefined
        ? changes.targetStudentId
        : existing.target_student_id,

    priority: changes.priority ?? existing.priority,

    publishAt:
      changes.publishAt !== undefined ? changes.publishAt : existing.publish_at,

    expiresAt:
      changes.expiresAt !== undefined ? changes.expiresAt : existing.expires_at,
  };

  const target = normalizeTarget(merged);

  await validateTargetStudent({
    targetType: target.targetType,

    targetStudentId: target.targetStudentId,
  });

  const updated = await updateAnnouncementRecord(announcementId, {
    ...merged,
    ...target,
  });

  await createAuditLog({
    userId: administrator.id,

    action: "announcement_updated",

    entityType: "announcement",

    entityId: announcementId,

    metadata: {
      changedFields: Object.keys(changes),
    },

    ipAddress: requestMetadata.ipAddress,
  });

  return formatAnnouncement(updated);
};

export const publishAnnouncement = async (
  announcementId,
  administrator,
  requestMetadata,
) => {
  const existing = await findAnnouncementById(announcementId);

  if (!existing) {
    throw new AppError("Announcement not found.", 404);
  }

  if (existing.expires_at && new Date(existing.expires_at) <= new Date()) {
    throw new AppError("An expired announcement cannot be published.", 400);
  }

  const publishAt = existing.publish_at
    ? new Date(existing.publish_at)
    : new Date();

  const announcement = await publishAnnouncementRecord(
    announcementId,
    publishAt,
  );

  await createAuditLog({
    userId: administrator.id,

    action: "announcement_published",

    entityType: "announcement",

    entityId: announcementId,

    metadata: {
      publishAt,
    },

    ipAddress: requestMetadata.ipAddress,
  });

  return formatAnnouncement(announcement);
};

export const unpublishAnnouncement = async (
  announcementId,
  administrator,
  requestMetadata,
) => {
  const existing = await findAnnouncementById(announcementId);

  if (!existing) {
    throw new AppError("Announcement not found.", 404);
  }

  const announcement = await unpublishAnnouncementRecord(announcementId);

  await createAuditLog({
    userId: administrator.id,

    action: "announcement_unpublished",

    entityType: "announcement",

    entityId: announcementId,

    metadata: null,

    ipAddress: requestMetadata.ipAddress,
  });

  return formatAnnouncement(announcement);
};

export const removeAnnouncement = async (
  announcementId,
  administrator,
  requestMetadata,
) => {
  const existing = await findAnnouncementById(announcementId);

  if (!existing) {
    throw new AppError("Announcement not found.", 404);
  }

  await deleteAnnouncementRecord(announcementId);

  await createAuditLog({
    userId: administrator.id,

    action: "announcement_deleted",

    entityType: "announcement",

    entityId: announcementId,

    metadata: {
      title: existing.title,
    },

    ipAddress: requestMetadata.ipAddress,
  });
};

export const getAnnouncement = async (announcementId) => {
  const announcement = await findAnnouncementById(announcementId);

  if (!announcement) {
    throw new AppError("Announcement not found.", 404);
  }

  return formatAnnouncement(announcement);
};

export const getAnnouncements = async (filters) => {
  const response = await findAnnouncements(filters);

  const totalPages = Math.ceil(response.total / filters.limit);

  return {
    announcements: response.announcements.map(formatAnnouncement),

    pagination: {
      page: filters.page,
      limit: filters.limit,

      totalItems: response.total,

      totalPages,

      hasPreviousPage: filters.page > 1,

      hasNextPage: filters.page < totalPages,
    },
  };
};

export const getMyAnnouncements = async (user, filters) => {
  let studentProfileId = null;

  if (user.role === "student") {
    const profile = await findStudentProfileByUserId(user.id);

    studentProfileId = profile?.id || null;
  }

  const announcements = await findVisibleAnnouncements({
    userId: user.id,
    role: user.role,
    studentProfileId,
    limit: filters.limit,
    priority: filters.priority,
  });

  return announcements.map(formatAnnouncement);
};
