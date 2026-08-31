import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider, ProtectedRoute } from "./app/auth";
import { useAuth } from "./app/authContext";
import {
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeader,
} from "./components/ui";
import { useApiResource } from "./hooks/useApiResource";
import api, { getErrorMessage } from "./lib/api";
import {
  formatAnnouncementDate,
  getAnnouncementPillClass,
  getAnnouncementTargetLabel,
} from "./utils/announcements";
import {
  dateToInputValue,
  formatShortDate,
  getInitials,
  optionalDateValue,
  optionalTextValue,
} from "./utils/formatters";
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
} from "./screens/AuthScreens";
import { AccountPage } from "./screens/AccountScreen";
import { CoursesPage } from "./screens/CoursesScreen";
import { DashboardPage } from "./screens/DashboardScreen";
import {
  EnrollmentsPage,
  StudentEnrollmentsPage,
} from "./screens/EnrollmentsScreen";
import { ResultsPage } from "./screens/ResultsScreen";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", roles: ["admin", "student"] },
  { to: "/courses", label: "Courses", roles: ["admin", "student"] },
  { to: "/enrollments", label: "Enrollments", roles: ["admin", "student"] },
  { to: "/results", label: "Results", roles: ["admin", "student"] },
  { to: "/announcements", label: "Announcements", roles: ["admin", "student"] },
  { to: "/account", label: "Account", roles: ["admin", "student"] },
  { to: "/users", label: "Users", roles: ["admin"] },
];

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
const USER_FORM_INITIAL_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  programme: "",
  yearLevel: "1",
  dateOfBirth: "",
  gender: "",
  phoneNumber: "",
  addressLine: "",
  city: "",
  province: "",
  postalCode: "",
  admissionDate: "",
};
const USER_FILTER_INITIAL_STATE = {
  userSearch: "",
  userRole: "",
  userStatus: "",
  userSortBy: "createdAt",
  userSortOrder: "desc",
};
function AppShell() {
  const { signOut, user } = useAuth();
  const visibleItems = navigationItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">SP</div>
          <div>
            <strong>Student Portal</strong>
            <span>{user.role === "admin" ? "Administrator" : "Student"}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {visibleItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Signed in</p>
            <h2>{user.firstName} {user.lastName}</h2>
          </div>

          <div className="account-block">
            <div className="avatar" aria-hidden="true">
              {getInitials(user)}
            </div>
            <button className="ghost-button" onClick={signOut} type="button">
              Sign out
            </button>
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route element={<DashboardPage />} path="/dashboard" />
            <Route element={<CoursesPage />} path="/courses" />
            <Route
              element={
                user.role === "admin" ? (
                  <EnrollmentsPage />
                ) : (
                  <StudentEnrollmentsPage />
                )
              }
              path="/enrollments"
            />
            <Route element={<ResultsPage />} path="/results" />
            <Route element={<AnnouncementsPage />} path="/announcements" />
            <Route element={<AccountPage />} path="/account" />
            <Route
              element={
                user.role === "admin" ? (
                  <UsersPage />
                ) : (
                  <Navigate replace to="/dashboard" />
                )
              }
              path="/users"
            />
            <Route element={<Navigate replace to="/dashboard" />} path="*" />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AnnouncementsPage() {
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
                    disabled={busyKey === `delete-announcement-${announcement.id}`}
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

function UsersPage() {
  const { user } = useAuth();
  const [userFilters, setUserFilters] = useState(USER_FILTER_INITIAL_STATE);
  const userPath = buildUserPath(userFilters);
  const userResource = useApiResource(userPath, EMPTY_USERS);
  const [editingUser, setEditingUser] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const users = userResource.data.users || [];

  const handleUserSaved = (message) => {
    setNotice(message);
    setActionError("");
    setEditingUser(null);
    userResource.refetch();
  };

  const handleUserFilterChange = (event) => {
    const { name, value } = event.target;

    setUserFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetUserFilters = () => {
    setUserFilters(USER_FILTER_INITIAL_STATE);
  };

  const handleStatusChange = async (userRecord) => {
    setNotice("");
    setActionError("");
    setBusyKey(`user-${userRecord.id}`);

    try {
      const response = await api.patch(`/users/${userRecord.id}/status`, {
        isActive: !userRecord.isActive,
      });

      setNotice(response.data.message);
      userResource.refetch();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <>
      <SectionHeader eyebrow="Administration" title="Users" />
      <UserFilterPanel
        filters={userFilters}
        onChange={handleUserFilterChange}
        onReset={handleResetUserFilters}
      />
      <AdminUserPanel
        editingUser={editingUser}
        onCancelEdit={() => setEditingUser(null)}
        onSaved={handleUserSaved}
      />
      {notice && <p className="inline-success">{notice}</p>}
      {actionError && <ErrorState message={actionError} />}
      {userResource.isLoading && <PageLoader label="Loading users" />}
      {userResource.error && <ErrorState message={userResource.error} />}
      {!userResource.isLoading && !userResource.error && users.length === 0 && (
        <EmptyState
          title="No users found"
          message="User accounts matching this view will appear here."
        />
      )}
      {!userResource.isLoading && !userResource.error && users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Student number</th>
                <th>Programme</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userRecord) => (
                <tr key={userRecord.id}>
                  <td>
                    <strong>{userRecord.fullName}</strong>
                    <span className="table-subtext">
                      Joined {formatShortDate(userRecord.createdAt)}
                    </span>
                  </td>
                  <td>{userRecord.email}</td>
                  <td>{userRecord.studentProfile?.studentNumber || "N/A"}</td>
                  <td>{userRecord.studentProfile?.programme || "N/A"}</td>
                  <td>{userRecord.role}</td>
                  <td>
                    <span
                      className={userRecord.isActive ? "pill" : "pill muted-pill"}
                    >
                      {userRecord.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="ghost-button compact-button"
                        disabled={Boolean(busyKey)}
                        onClick={() => {
                          setNotice("");
                          setActionError("");
                          setEditingUser(userRecord);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="ghost-button compact-button"
                        disabled={
                          busyKey === `user-${userRecord.id}` ||
                          (userRecord.id === user.id && userRecord.isActive)
                        }
                        onClick={() => handleStatusChange(userRecord)}
                        type="button"
                      >
                        {userRecord.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function UserFilterPanel({ filters, onChange, onReset }) {
  const hasActiveFilters =
    filters.userSearch ||
    filters.userRole ||
    filters.userStatus ||
    filters.userSortBy !== USER_FILTER_INITIAL_STATE.userSortBy ||
    filters.userSortOrder !== USER_FILTER_INITIAL_STATE.userSortOrder;

  return (
    <section className="data-section filter-panel" aria-label="User filters">
      <div className="filter-grid">
        <label>
          Search
          <input
            name="userSearch"
            onChange={onChange}
            placeholder="Name, email, number"
            value={filters.userSearch}
          />
        </label>
        <label>
          Role
          <select name="userRole" onChange={onChange} value={filters.userRole}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="student">Student</option>
          </select>
        </label>
        <label>
          Status
          <select
            name="userStatus"
            onChange={onChange}
            value={filters.userStatus}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            name="userSortBy"
            onChange={onChange}
            value={filters.userSortBy}
          >
            <option value="createdAt">Created date</option>
            <option value="firstName">First name</option>
            <option value="lastName">Last name</option>
            <option value="email">Email</option>
            <option value="lastLoginAt">Last login</option>
          </select>
        </label>
        <label>
          Order
          <select
            name="userSortOrder"
            onChange={onChange}
            value={filters.userSortOrder}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
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

function buildUserPath(filters) {
  const params = new URLSearchParams({
    limit: "50",
    sortBy: filters.userSortBy,
    sortOrder: filters.userSortOrder,
  });
  const search = filters.userSearch.trim();

  if (search) {
    params.set("search", search);
  }

  if (filters.userRole) {
    params.set("role", filters.userRole);
  }

  if (filters.userStatus) {
    params.set("status", filters.userStatus);
  }

  return `/users?${params.toString()}`;
}

function AdminUserPanel({ editingUser, onCancelEdit, onSaved }) {
  const [form, setForm] = useState(USER_FORM_INITIAL_STATE);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingUser);
  const isStudent = !isEditing || editingUser.role === "student";

  useEffect(() => {
    if (!editingUser) {
      setForm(USER_FORM_INITIAL_STATE);
      setError("");
      return;
    }

    const profile = editingUser.studentProfile || {};

    setForm({
      firstName: editingUser.firstName,
      lastName: editingUser.lastName,
      email: editingUser.email,
      password: "",
      programme: profile.programme || "",
      yearLevel: profile.yearLevel ? String(profile.yearLevel) : "1",
      dateOfBirth: dateToInputValue(profile.dateOfBirth),
      gender: profile.gender || "",
      phoneNumber: profile.phoneNumber || "",
      addressLine: profile.addressLine || "",
      city: profile.city || "",
      province: profile.province || "",
      postalCode: profile.postalCode || "",
      admissionDate: dateToInputValue(profile.admissionDate),
    });
    setError("");
  }, [editingUser]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const buildAccountPayload = () => ({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
  });

  const buildStudentPayload = () => ({
    programme: form.programme,
    yearLevel: Number(form.yearLevel),
    dateOfBirth: optionalDateValue(form.dateOfBirth),
    gender: form.gender || null,
    phoneNumber: optionalTextValue(form.phoneNumber),
    addressLine: optionalTextValue(form.addressLine),
    city: optionalTextValue(form.city),
    province: optionalTextValue(form.province),
    postalCode: optionalTextValue(form.postalCode),
    admissionDate: optionalDateValue(form.admissionDate),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isEditing) {
        const accountResponse = await api.patch(
          `/users/${editingUser.id}`,
          buildAccountPayload(),
        );

        if (isStudent) {
          await api.patch(
            `/users/${editingUser.id}/student-profile`,
            buildStudentPayload(),
          );
        }

        onSaved(
          isStudent
            ? "User account and student profile updated successfully."
            : accountResponse.data.message,
        );
      } else {
        const response = await api.post("/users/students", {
          ...buildAccountPayload(),
          password: form.password,
          ...buildStudentPayload(),
        });

        setForm(USER_FORM_INITIAL_STATE);
        onSaved(response.data.message);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="data-section user-editor" aria-labelledby="user-form-title">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">Directory</p>
          <h2 id="user-form-title">
            {isEditing ? "Edit user" : "New student"}
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
        <div className="form-grid user-form-grid">
          <label>
            First name
            <input
              name="firstName"
              onChange={handleChange}
              required
              value={form.firstName}
            />
          </label>
          <label>
            Last name
            <input
              name="lastName"
              onChange={handleChange}
              required
              value={form.lastName}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              onChange={handleChange}
              required
              type="email"
              value={form.email}
            />
          </label>
          {!isEditing && (
            <label>
              Temporary password
              <input
                name="password"
                onChange={handleChange}
                required
                type="password"
                value={form.password}
              />
            </label>
          )}
          {isStudent && (
            <>
              <label>
                Programme
                <input
                  name="programme"
                  onChange={handleChange}
                  required
                  value={form.programme}
                />
              </label>
              <label>
                Year level
                <input
                  max="10"
                  min="1"
                  name="yearLevel"
                  onChange={handleChange}
                  required
                  type="number"
                  value={form.yearLevel}
                />
              </label>
              <label>
                Date of birth
                <input
                  name="dateOfBirth"
                  onChange={handleChange}
                  type="date"
                  value={form.dateOfBirth}
                />
              </label>
              <label>
                Gender
                <select name="gender" onChange={handleChange} value={form.gender}>
                  <option value="">Unspecified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
              <label>
                Phone
                <input
                  name="phoneNumber"
                  onChange={handleChange}
                  value={form.phoneNumber}
                />
              </label>
              <label>
                Admission date
                <input
                  name="admissionDate"
                  onChange={handleChange}
                  type="date"
                  value={form.admissionDate}
                />
              </label>
            </>
          )}
        </div>
        {isStudent && (
          <div className="form-grid address-form-grid">
            <label>
              Address
              <input
                name="addressLine"
                onChange={handleChange}
                value={form.addressLine}
              />
            </label>
            <label>
              City
              <input name="city" onChange={handleChange} value={form.city} />
            </label>
            <label>
              Province
              <input
                name="province"
                onChange={handleChange}
                value={form.province}
              />
            </label>
            <label>
              Postal code
              <input
                name="postalCode"
                onChange={handleChange}
                value={form.postalCode}
              />
            </label>
          </div>
        )}
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
              ? "Update user"
              : "Create student"}
        </button>
      </form>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<ForgotPasswordPage />} path="/forgot-password" />
          <Route element={<ResetPasswordPage />} path="/reset-password" />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
            path="/*"
          />
          <Route element={<Navigate replace to="/dashboard" />} path="*" />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
