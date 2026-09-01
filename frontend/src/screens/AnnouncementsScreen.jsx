import { useEffect, useState } from "react";

import { useAuth } from "../app/authContext";
import {
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeader,
} from "../components/ui";
import { useApiResource } from "../hooks/useApiResource";
import api, { getErrorMessage } from "../lib/api";
import {
  formatAnnouncementDate,
  getAnnouncementPillClass,
  getAnnouncementTargetLabel,
} from "../utils/announcements";

const EMPTY_ANNOUNCEMENTS = { announcements: [] };
const EMPTY_USERS = { users: [] };
const ANNOUNCEMENT_FORM_INITIAL_STATE = {
  title: "",
  content: "",
  targetType: "all",
  targetRole: "student",
  targetStudentId: "",
  priority: "normal",
  publishAt: "",
  expiresAt: "",
};
const ANNOUNCEMENT_FILTER_INITIAL_STATE = {
  announcementSearch: "",
  announcementPublicationStatus: "",
  announcementPriority: "",
  announcementTargetType: "",
  announcementSortOrder: "desc",
};

export function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcementFilters, setAnnouncementFilters] = useState(
    ANNOUNCEMENT_FILTER_INITIAL_STATE,
  );
  const path = buildAnnouncementPath(announcementFilters, user.role);
  const announcementResource = useApiResource(path, EMPTY_ANNOUNCEMENTS);
  const studentResource = useApiResource(
    "/users?limit=100&role=student&status=active&sortBy=lastName&sortOrder=asc",
    EMPTY_USERS,
    {
      enabled: user.role === "admin",
    },
  );
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const announcements = announcementResource.data.announcements || [];
  const activeStudents = (studentResource.data.users || []).filter(
    (student) => student.studentProfile?.id,
  );

  const handleAnnouncementFilterChange = (event) => {
    const { name, value } = event.target;

    setAnnouncementFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetAnnouncementFilters = () => {
    setAnnouncementFilters(ANNOUNCEMENT_FILTER_INITIAL_STATE);
  };

  const handleAnnouncementSaved = (message) => {
    setNotice(message);
    setActionError("");
    setEditingAnnouncement(null);
    announcementResource.refetch();
  };

  const handlePublicationChange = async (announcement) => {
    const isPublished = announcement.publicationStatus === "published";

    setNotice("");
    setActionError("");
    setBusyKey(`announcement-${announcement.id}`);

    try {
      const response = await api.patch(
        `/announcements/${announcement.id}/${
          isPublished ? "unpublish" : "publish"
        }`,
      );

      setNotice(response.data.message);
      announcementResource.refetch();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteAnnouncement = async (announcement) => {
    const confirmed = window.confirm(
      `Delete "${announcement.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setNotice("");
    setActionError("");
    setBusyKey(`delete-announcement-${announcement.id}`);

    try {
      const response = await api.delete(`/announcements/${announcement.id}`);

      setNotice(response.data.message);
      announcementResource.refetch();

      if (editingAnnouncement?.id === announcement.id) {
        setEditingAnnouncement(null);
      }
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <>
      <SectionHeader eyebrow="Messages" title="Announcements" />
      <AnnouncementFilterPanel
        filters={announcementFilters}
        onChange={handleAnnouncementFilterChange}
        onReset={handleResetAnnouncementFilters}
        role={user.role}
      />
      {user.role === "admin" && (
        <AdminAnnouncementPanel
          activeStudents={activeStudents}
          editingAnnouncement={editingAnnouncement}
          isLoadingStudents={studentResource.isLoading}
          onCancelEdit={() => setEditingAnnouncement(null)}
          onSaved={handleAnnouncementSaved}
        />
      )}
      {notice && <p className="inline-success">{notice}</p>}
      {actionError && <ErrorState message={actionError} />}
      {announcementResource.isLoading && (
        <PageLoader label="Loading announcements" />
      )}
      {announcementResource.error && (
        <ErrorState message={announcementResource.error} />
      )}
      {!announcementResource.isLoading &&
        !announcementResource.error &&
        announcements.length === 0 && (
          <EmptyState
            title="No announcements"
            message={
              user.role === "admin"
                ? "Announcements matching this view will appear here."
                : "Published announcements will appear here."
            }
          />
        )}
      {!announcementResource.isLoading &&
        !announcementResource.error &&
        announcements.length > 0 && (
          <div className="item-list">
            {announcements.map((announcement) => (
              <article
                className="list-item announcement announcement-list-item"
                key={announcement.id}
              >
                <div className="announcement-main">
                  <div className="announcement-heading">
                    <strong>{announcement.title}</strong>
                    <span className={getAnnouncementPillClass(announcement)}>
                      {announcement.priority}
                    </span>
                  </div>
                  <span>{announcement.content}</span>
                  <div className="announcement-meta">
                    <span>{getAnnouncementTargetLabel(announcement)}</span>
                    <span>
                      {announcement.publicationStatus === "published"
                        ? `Published ${formatAnnouncementDate(
                            announcement.publishAt,
                          )}`
                        : "Draft"}
                    </span>
                    {announcement.expiresAt && (
                      <span>
                        Expires {formatAnnouncementDate(announcement.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>
                {user.role === "admin" && (
                  <div className="announcement-actions">
                    <button
                      className="ghost-button compact-button"
                      disabled={Boolean(busyKey)}
                      onClick={() => {
                        setNotice("");
                        setActionError("");
                        setEditingAnnouncement(announcement);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="primary-button compact-button"
                      disabled={busyKey === `announcement-${announcement.id}`}
                      onClick={() => handlePublicationChange(announcement)}
                      type="button"
                    >
                      {announcement.publicationStatus === "published"
                        ? "Unpublish"
                        : "Publish"}
                    </button>
                    <button
                      className="ghost-button compact-button danger-action"
                      disabled={
                        busyKey === `delete-announcement-${announcement.id}`
                      }
                      onClick={() => handleDeleteAnnouncement(announcement)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
    </>
  );
}

function AnnouncementFilterPanel({ filters, onChange, onReset, role }) {
  const hasActiveFilters =
    filters.announcementPriority ||
    (role === "admin" &&
      (filters.announcementSearch ||
        filters.announcementPublicationStatus ||
        filters.announcementTargetType ||
        filters.announcementSortOrder !==
          ANNOUNCEMENT_FILTER_INITIAL_STATE.announcementSortOrder));

  return (
    <section
      className="data-section filter-panel"
      aria-label="Announcement filters"
    >
      <div className="filter-grid">
        {role === "admin" && (
          <label>
            Search
            <input
              name="announcementSearch"
              onChange={onChange}
              placeholder="Title or content"
              value={filters.announcementSearch}
            />
          </label>
        )}
        <label>
          Priority
          <select
            name="announcementPriority"
            onChange={onChange}
            value={filters.announcementPriority}
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
        {role === "admin" && (
          <>
            <label>
              Publication
              <select
                name="announcementPublicationStatus"
                onChange={onChange}
                value={filters.announcementPublicationStatus}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label>
              Target
              <select
                name="announcementTargetType"
                onChange={onChange}
                value={filters.announcementTargetType}
              >
                <option value="">All targets</option>
                <option value="all">Everyone</option>
                <option value="role">Role</option>
                <option value="student">Specific student</option>
              </select>
            </label>
            <label>
              Order
              <select
                name="announcementSortOrder"
                onChange={onChange}
                value={filters.announcementSortOrder}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </>
        )}
      </div>
      <button
        className="ghost-button compact-button"
        disabled={!hasActiveFilters}
        onClick={onReset}
        type="button"
      >
        Reset filters
      </button>
    </section>
  );
}

function buildAnnouncementPath(filters, role) {
  if (role === "student") {
    const params = new URLSearchParams({
      limit: "20",
    });

    if (filters.announcementPriority) {
      params.set("priority", filters.announcementPriority);
    }

    return `/announcements/me?${params.toString()}`;
  }

  const params = new URLSearchParams({
    limit: "50",
    sortOrder: filters.announcementSortOrder,
  });
  const search = filters.announcementSearch.trim();

  if (search) {
    params.set("search", search);
  }

  if (filters.announcementPublicationStatus) {
    params.set("publicationStatus", filters.announcementPublicationStatus);
  }

  if (filters.announcementPriority) {
    params.set("priority", filters.announcementPriority);
  }

  if (filters.announcementTargetType) {
    params.set("targetType", filters.announcementTargetType);
  }

  return `/announcements?${params.toString()}`;
}

function AdminAnnouncementPanel({
  activeStudents,
  editingAnnouncement,
  isLoadingStudents,
  onCancelEdit,
  onSaved,
}) {
  const [form, setForm] = useState(ANNOUNCEMENT_FORM_INITIAL_STATE);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingAnnouncement);

  useEffect(() => {
    if (!editingAnnouncement) {
      setForm(ANNOUNCEMENT_FORM_INITIAL_STATE);
      setError("");
      return;
    }

    setForm({
      title: editingAnnouncement.title,
      content: editingAnnouncement.content,
      targetType: editingAnnouncement.targetType,
      targetRole: editingAnnouncement.targetRole || "student",
      targetStudentId: editingAnnouncement.targetStudent
        ? String(editingAnnouncement.targetStudent.id)
        : "",
      priority: editingAnnouncement.priority,
      publishAt: isoToDateTimeLocal(editingAnnouncement.publishAt),
      expiresAt: isoToDateTimeLocal(editingAnnouncement.expiresAt),
    });
    setError("");
  }, [editingAnnouncement]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const buildPayload = () => ({
    title: form.title,
    content: form.content,
    targetType: form.targetType,
    targetRole: form.targetType === "role" ? form.targetRole : null,
    targetStudentId:
      form.targetType === "student" ? Number(form.targetStudentId) : null,
    priority: form.priority,
    publishAt: dateTimeLocalToIso(form.publishAt),
    expiresAt: dateTimeLocalToIso(form.expiresAt),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (form.targetType === "student" && !form.targetStudentId) {
        throw new Error("Choose a student for this announcement.");
      }

      const response = isEditing
        ? await api.patch(
            `/announcements/${editingAnnouncement.id}`,
            buildPayload(),
          )
        : await api.post("/announcements", buildPayload());

      setForm(ANNOUNCEMENT_FORM_INITIAL_STATE);
      onSaved(response.data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudentIsAvailable = activeStudents.some(
    (student) => String(student.studentProfile.id) === form.targetStudentId,
  );
  const showEditingTargetStudent =
    isEditing &&
    editingAnnouncement.targetStudent &&
    !selectedStudentIsAvailable;

  return (
    <section
      className="data-section announcement-editor"
      aria-labelledby="announcement-form-title"
    >
      <div className="editor-heading">
        <div>
          <p className="eyebrow">Broadcast</p>
          <h2 id="announcement-form-title">
            {isEditing ? "Edit announcement" : "New announcement"}
          </h2>
        </div>
        {isEditing && (
          <button
            className="ghost-button compact-button"
            onClick={onCancelEdit}
            type="button"
          >
            Cancel edit
          </button>
        )}
      </div>
      <form className="resource-form" onSubmit={handleSubmit}>
        <div className="form-grid announcement-form-grid">
          <label>
            Title
            <input
              name="title"
              onChange={handleChange}
              required
              value={form.title}
            />
          </label>
          <label>
            Priority
            <select
              name="priority"
              onChange={handleChange}
              value={form.priority}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            Target
            <select
              name="targetType"
              onChange={handleChange}
              value={form.targetType}
            >
              <option value="all">Everyone</option>
              <option value="role">Role</option>
              <option value="student">Specific student</option>
            </select>
          </label>
          <label>
            Role
            <select
              disabled={form.targetType !== "role"}
              name="targetRole"
              onChange={handleChange}
              value={form.targetRole}
            >
              <option value="student">Students</option>
              <option value="admin">Administrators</option>
            </select>
          </label>
          <label>
            Student
            <select
              disabled={form.targetType !== "student" || isLoadingStudents}
              name="targetStudentId"
              onChange={handleChange}
              required={form.targetType === "student"}
              value={form.targetStudentId}
            >
              <option value="">
                {isLoadingStudents ? "Loading students" : "Choose a student"}
              </option>
              {showEditingTargetStudent && (
                <option value={editingAnnouncement.targetStudent.id}>
                  {formatAnnouncementStudentOption({
                    fullName: editingAnnouncement.targetStudent.fullName,
                    studentProfile: {
                      studentNumber:
                        editingAnnouncement.targetStudent.studentNumber,
                    },
                  })}
                </option>
              )}
              {activeStudents.map((student) => (
                <option
                  key={student.studentProfile.id}
                  value={student.studentProfile.id}
                >
                  {formatAnnouncementStudentOption(student)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Publish at
            <input
              name="publishAt"
              onChange={handleChange}
              type="datetime-local"
              value={form.publishAt}
            />
          </label>
          <label>
            Expires at
            <input
              name="expiresAt"
              onChange={handleChange}
              type="datetime-local"
              value={form.expiresAt}
            />
          </label>
        </div>
        <label>
          Content
          <textarea
            name="content"
            onChange={handleChange}
            required
            rows="5"
            value={form.content}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button
          className="primary-button form-action"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? isEditing
              ? "Updating"
              : "Creating"
            : isEditing
              ? "Update announcement"
              : "Create announcement"}
        </button>
      </form>
    </section>
  );
}

function dateTimeLocalToIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function formatAnnouncementStudentOption(student) {
  return [student.fullName, student.studentProfile?.studentNumber]
    .filter(Boolean)
    .join(" - ");
}

function isoToDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
