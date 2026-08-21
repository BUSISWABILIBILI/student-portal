import { useEffect, useMemo, useState } from "react";
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
  StatGrid,
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
  formatNumber,
  formatOptionalShortDate,
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
import { DashboardPage } from "./screens/DashboardScreen";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", roles: ["admin", "student"] },
  { to: "/courses", label: "Courses", roles: ["admin", "student"] },
  { to: "/enrollments", label: "Enrollments", roles: ["admin", "student"] },
  { to: "/results", label: "Results", roles: ["admin", "student"] },
  { to: "/announcements", label: "Announcements", roles: ["admin", "student"] },
  { to: "/account", label: "Account", roles: ["admin", "student"] },
  { to: "/users", label: "Users", roles: ["admin"] },
];

const EMPTY_COURSES = { courses: [] };
const EMPTY_ACADEMIC_PERIODS = { academicPeriods: [] };
const EMPTY_ENROLLMENTS = { courses: [] };
const EMPTY_ADMIN_ENROLLMENTS = { enrollments: [] };
const EMPTY_RESULTS = { results: [] };
const EMPTY_ANNOUNCEMENTS = { announcements: [] };
const EMPTY_USERS = { users: [] };
const COURSE_FORM_INITIAL_STATE = {
  courseCode: "",
  courseName: "",
  department: "",
  creditValue: "12",
  capacity: "50",
  isActive: true,
  description: "",
};
const COURSE_FILTER_INITIAL_STATE = {
  courseSearch: "",
  courseDepartment: "",
  courseStatus: "",
  courseAvailability: "",
  courseSortBy: "courseCode",
  courseSortOrder: "asc",
};
const ENROLLMENT_FILTER_INITIAL_STATE = {
  enrollmentSearch: "",
  enrollmentStatus: "",
  enrollmentResultStatus: "all",
  enrollmentSortBy: "registeredAt",
  enrollmentSortOrder: "desc",
};
const STUDENT_ENROLLMENT_FILTER_INITIAL_STATE = {
  myEnrollmentStatus: "",
};
const RESULT_FORM_INITIAL_STATE = {
  enrollmentId: "",
  courseworkMark: "",
  examinationMark: "",
  remarks: "",
};
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
const RESULT_FILTER_INITIAL_STATE = {
  search: "",
  outcome: "",
  publicationStatus: "",
  sortBy: "createdAt",
  sortOrder: "desc",
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

function CoursesPage() {
  const { user } = useAuth();
  const [selectedAcademicPeriodId, setSelectedAcademicPeriodId] = useState("");
  const [courseFilters, setCourseFilters] = useState(
    COURSE_FILTER_INITIAL_STATE,
  );
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const coursePath = buildCoursePath(courseFilters, user.role);
  const courseResource = useApiResource(coursePath, EMPTY_COURSES);
  const periodResource = useApiResource(
    "/academic-periods/active",
    EMPTY_ACADEMIC_PERIODS,
    {
      enabled: user.role === "student",
    },
  );
  const academicPeriods = useMemo(
    () => periodResource.data.academicPeriods || [],
    [periodResource.data],
  );
  const selectedPeriod = academicPeriods.find(
    (period) => String(period.id) === selectedAcademicPeriodId,
  );
  const enrollmentResource = useApiResource(
    selectedAcademicPeriodId
      ? `/enrollments/me?academicPeriodId=${selectedAcademicPeriodId}`
      : null,
    EMPTY_ENROLLMENTS,
    {
      enabled: user.role === "student" && Boolean(selectedAcademicPeriodId),
    },
  );
  const [editingCourse, setEditingCourse] = useState(null);
  const enrollments = enrollmentResource.data.courses || [];
  const registeredCourseIds = new Set(
    enrollments
      .filter((enrollment) => enrollment.status === "registered")
      .map((enrollment) => enrollment.course.id),
  );
  const courses = courseResource.data.courses || [];
  const isEnrollmentLoading =
    user.role === "student" &&
    Boolean(selectedAcademicPeriodId) &&
    enrollmentResource.isLoading;
  const isLoading =
    courseResource.isLoading ||
    (user.role === "student" && periodResource.isLoading) ||
    isEnrollmentLoading;
  const error =
    courseResource.error ||
    (user.role === "student" ? periodResource.error : "");

  useEffect(() => {
    if (user.role !== "student" || academicPeriods.length === 0) {
      return;
    }

    const selectedPeriodExists = academicPeriods.some(
      (period) => String(period.id) === selectedAcademicPeriodId,
    );

    if (!selectedAcademicPeriodId || !selectedPeriodExists) {
      setSelectedAcademicPeriodId(String(academicPeriods[0].id));
    }
  }, [academicPeriods, selectedAcademicPeriodId, user.role]);

  const handleCourseFilterChange = (event) => {
    const { name, value } = event.target;

    setCourseFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetCourseFilters = () => {
    setCourseFilters(COURSE_FILTER_INITIAL_STATE);
  };

  const refreshCourseWorkflow = () => {
    courseResource.refetch();

    if (user.role === "student" && selectedAcademicPeriodId) {
      enrollmentResource.refetch();
    }
  };

  const handleCourseSaved = (message) => {
    setNotice(message);
    setActionError("");
    setEditingCourse(null);
    courseResource.refetch();
  };

  const handleToggleCourseStatus = async (course) => {
    setNotice("");
    setActionError("");
    setBusyKey(`course-${course.id}`);

    try {
      const response = await api.patch(`/courses/${course.id}`, {
        isActive: !course.isActive,
      });

      setNotice(response.data.message);
      courseResource.refetch();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  const handleRegisterCourse = async (course) => {
    if (!selectedAcademicPeriodId) {
      setActionError("Choose an active academic period before registering.");
      return;
    }

    setNotice("");
    setActionError("");
    setBusyKey(`register-${course.id}`);

    try {
      const response = await api.post("/enrollments", {
        courseId: course.id,
        academicPeriodId: Number(selectedAcademicPeriodId),
      });

      setNotice(response.data.message);
      refreshCourseWorkflow();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  const handleCancelRegistration = async (course) => {
    if (!selectedAcademicPeriodId) {
      setActionError("Choose an active academic period before cancelling.");
      return;
    }

    setNotice("");
    setActionError("");
    setBusyKey(`cancel-${course.id}`);

    try {
      const response = await api.patch(
        `/enrollments/${course.id}/cancel`,
        {},
        {
          params: {
            academicPeriodId: Number(selectedAcademicPeriodId),
          },
        },
      );

      setNotice(response.data.message);
      refreshCourseWorkflow();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <>
      <SectionHeader eyebrow="Academic" title="Courses">
        {user.role === "student" && academicPeriods.length > 0 && (
          <label className="compact-field">
            Academic period
            <select
              onChange={(event) => {
                setNotice("");
                setActionError("");
                setSelectedAcademicPeriodId(event.target.value);
              }}
              value={selectedAcademicPeriodId}
            >
              {academicPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </SectionHeader>
      <CourseFilterPanel
        filters={courseFilters}
        onChange={handleCourseFilterChange}
        onReset={handleResetCourseFilters}
        role={user.role}
      />
      {user.role === "admin" && (
        <AdminCoursePanel
          editingCourse={editingCourse}
          onCancelEdit={() => setEditingCourse(null)}
          onSaved={handleCourseSaved}
        />
      )}
      {notice && <p className="inline-success">{notice}</p>}
      {actionError && <ErrorState message={actionError} />}
      {isLoading && <PageLoader label="Loading courses" />}
      {error && <ErrorState message={error} />}
      {!isLoading &&
        !error &&
        user.role === "student" &&
        academicPeriods.length === 0 && (
          <EmptyState
            title="No active academic period"
            message="Course registration will open when an active academic period is configured."
          />
        )}
      {!isLoading &&
        !error &&
        courses.length === 0 &&
        (user.role !== "student" || academicPeriods.length > 0) && (
        <EmptyState
          title="No courses found"
          message="Courses added by administrators will appear here."
        />
      )}
      {!isLoading && !error && courses.length > 0 && (
        <div className="course-grid">
          {courses.map((course) => {
            const isRegistered = registeredCourseIds.has(course.id);
            const isRegistrationBusy = [
              `register-${course.id}`,
              `cancel-${course.id}`,
            ].includes(busyKey);
            const statusLabel = getStudentCourseStatus({
              course,
              isRegistered,
              selectedPeriod,
            });

            return (
            <article className="course-card" key={course.id}>
              <div className="course-card-header">
                <span className="course-code">{course.courseCode}</span>
                <span className={course.isActive ? "pill" : "pill muted-pill"}>
                  {course.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <h2>{course.courseName}</h2>
              <p>{course.description || "No description provided."}</p>
              <div className="meta-row">
                <span>{course.department || "Unassigned"}</span>
                <span>{course.creditValue} credits</span>
              </div>
              <div className="capacity-bar" aria-label="Course capacity">
                <span
                  style={{
                    width: `${Math.min(
                      (course.enrolledCount / Math.max(course.capacity, 1)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              <div className="meta-row">
                <span>{course.enrolledCount} enrolled</span>
                <span>{course.availablePlaces} places open</span>
              </div>
              {user.role === "admin" && (
                <div className="card-actions">
                  <button
                    className="ghost-button compact-button"
                    disabled={Boolean(busyKey)}
                    onClick={() => {
                      setNotice("");
                      setActionError("");
                      setEditingCourse(course);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="ghost-button compact-button"
                    disabled={busyKey === `course-${course.id}`}
                    onClick={() => handleToggleCourseStatus(course)}
                    type="button"
                  >
                    {course.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}
              {user.role === "student" && (
                <div className="card-actions">
                  <span className="hint-text">{statusLabel}</span>
                  {isRegistered ? (
                    <button
                      className="ghost-button compact-button"
                      disabled={
                        isRegistrationBusy ||
                        !selectedPeriod?.registrationOpen
                      }
                      onClick={() => handleCancelRegistration(course)}
                      type="button"
                    >
                      {busyKey === `cancel-${course.id}`
                        ? "Cancelling"
                        : "Cancel registration"}
                    </button>
                  ) : (
                    <button
                      className="primary-button compact-button"
                      disabled={
                        isRegistrationBusy ||
                        !selectedPeriod?.registrationOpen ||
                        course.isFull
                      }
                      onClick={() => handleRegisterCourse(course)}
                      type="button"
                    >
                      {busyKey === `register-${course.id}`
                        ? "Registering"
                        : "Register"}
                    </button>
                  )}
                </div>
              )}
            </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function CourseFilterPanel({ filters, onChange, onReset, role }) {
  const hasActiveFilters =
    filters.courseSearch ||
    filters.courseDepartment ||
    filters.courseAvailability ||
    (role === "admin" && filters.courseStatus) ||
    filters.courseSortBy !== COURSE_FILTER_INITIAL_STATE.courseSortBy ||
    filters.courseSortOrder !== COURSE_FILTER_INITIAL_STATE.courseSortOrder;

  return (
    <section className="data-section filter-panel" aria-label="Course filters">
      <div className="filter-grid">
        <label>
          Search
          <input
            name="courseSearch"
            onChange={onChange}
            placeholder="Code, name, description"
            value={filters.courseSearch}
          />
        </label>
        <label>
          Department
          <input
            name="courseDepartment"
            onChange={onChange}
            placeholder="Exact department"
            value={filters.courseDepartment}
          />
        </label>
        <label>
          Availability
          <select
            name="courseAvailability"
            onChange={onChange}
            value={filters.courseAvailability}
          >
            <option value="">All courses</option>
            <option value="available">Available</option>
            <option value="full">Full</option>
          </select>
        </label>
        {role === "admin" && (
          <label>
            Status
            <select
              name="courseStatus"
              onChange={onChange}
              value={filters.courseStatus}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        )}
        <label>
          Sort by
          <select
            name="courseSortBy"
            onChange={onChange}
            value={filters.courseSortBy}
          >
            <option value="courseCode">Course code</option>
            <option value="courseName">Course name</option>
            <option value="department">Department</option>
            <option value="creditValue">Credits</option>
            <option value="capacity">Capacity</option>
            <option value="createdAt">Created date</option>
          </select>
        </label>
        <label>
          Order
          <select
            name="courseSortOrder"
            onChange={onChange}
            value={filters.courseSortOrder}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
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

function buildCoursePath(filters, role) {
  const params = new URLSearchParams({
    limit: "50",
    sortBy: filters.courseSortBy,
    sortOrder: filters.courseSortOrder,
  });
  const search = filters.courseSearch.trim();
  const department = filters.courseDepartment.trim();

  if (search) {
    params.set("search", search);
  }

  if (department) {
    params.set("department", department);
  }

  if (filters.courseAvailability) {
    params.set("availability", filters.courseAvailability);
  }

  if (role === "admin" && filters.courseStatus) {
    params.set("status", filters.courseStatus);
  }

  return `/courses?${params.toString()}`;
}

function EnrollmentsPage() {
  const [filters, setFilters] = useState(ENROLLMENT_FILTER_INITIAL_STATE);
  const enrollmentPath = buildEnrollmentPath(filters);
  const enrollmentResource = useApiResource(
    enrollmentPath,
    EMPTY_ADMIN_ENROLLMENTS,
  );
  const enrollments = enrollmentResource.data.enrollments || [];

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(ENROLLMENT_FILTER_INITIAL_STATE);
  };

  return (
    <>
      <SectionHeader eyebrow="Academic" title="Enrollment registry" />
      <EnrollmentFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      {enrollmentResource.isLoading && (
        <PageLoader label="Loading enrollments" />
      )}
      {enrollmentResource.error && (
        <ErrorState message={enrollmentResource.error} />
      )}
      {!enrollmentResource.isLoading &&
        !enrollmentResource.error &&
        enrollments.length === 0 && (
          <EmptyState
            title="No enrollments found"
            message="Student registrations matching this view will appear here."
          />
        )}
      {!enrollmentResource.isLoading &&
        !enrollmentResource.error &&
        enrollments.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Academic period</th>
                  <th>Status</th>
                  <th>Result</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>
                      <strong>{enrollment.student.name}</strong>
                      <span className="table-subtext">
                        {enrollment.student.studentNumber}
                      </span>
                    </td>
                    <td>
                      <strong>{enrollment.course.courseCode}</strong>
                      <span className="table-subtext">
                        {enrollment.course.courseName}
                      </span>
                    </td>
                    <td>
                      <strong>{enrollment.academicPeriod.name}</strong>
                      <span className="table-subtext">
                        {enrollment.academicPeriod.academicYear}
                      </span>
                    </td>
                    <td>
                      <span
                        className={getEnrollmentStatusPillClass(enrollment)}
                      >
                        {enrollment.status}
                      </span>
                    </td>
                    <td>{formatEnrollmentResult(enrollment)}</td>
                    <td>{formatShortDate(enrollment.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

function EnrollmentFilterPanel({ filters, onChange, onReset }) {
  const hasActiveFilters =
    filters.enrollmentSearch ||
    filters.enrollmentStatus ||
    filters.enrollmentResultStatus !==
      ENROLLMENT_FILTER_INITIAL_STATE.enrollmentResultStatus ||
    filters.enrollmentSortBy !==
      ENROLLMENT_FILTER_INITIAL_STATE.enrollmentSortBy ||
    filters.enrollmentSortOrder !==
      ENROLLMENT_FILTER_INITIAL_STATE.enrollmentSortOrder;

  return (
    <section
      className="data-section filter-panel"
      aria-label="Enrollment filters"
    >
      <div className="filter-grid">
        <label>
          Search
          <input
            name="enrollmentSearch"
            onChange={onChange}
            placeholder="Student or course"
            value={filters.enrollmentSearch}
          />
        </label>
        <label>
          Status
          <select
            name="enrollmentStatus"
            onChange={onChange}
            value={filters.enrollmentStatus}
          >
            <option value="">All statuses</option>
            <option value="registered">Registered</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Result
          <select
            name="enrollmentResultStatus"
            onChange={onChange}
            value={filters.enrollmentResultStatus}
          >
            <option value="all">All results</option>
            <option value="pending">Pending capture</option>
            <option value="captured">Captured</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            name="enrollmentSortBy"
            onChange={onChange}
            value={filters.enrollmentSortBy}
          >
            <option value="registeredAt">Registered date</option>
            <option value="studentName">Student name</option>
            <option value="studentNumber">Student number</option>
            <option value="courseCode">Course code</option>
          </select>
        </label>
        <label>
          Order
          <select
            name="enrollmentSortOrder"
            onChange={onChange}
            value={filters.enrollmentSortOrder}
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

function buildEnrollmentPath(filters) {
  const params = new URLSearchParams({
    limit: "50",
    resultStatus: filters.enrollmentResultStatus,
    sortBy: filters.enrollmentSortBy,
    sortOrder: filters.enrollmentSortOrder,
  });
  const search = filters.enrollmentSearch.trim();

  if (search) {
    params.set("search", search);
  }

  if (filters.enrollmentStatus) {
    params.set("status", filters.enrollmentStatus);
  }

  return `/enrollments?${params.toString()}`;
}

function getEnrollmentStatusPillClass(enrollment) {
  if (enrollment.status === "registered") {
    return "pill";
  }

  if (enrollment.status === "completed") {
    return "pill warning-pill";
  }

  return "pill muted-pill";
}

function formatEnrollmentResult(enrollment) {
  if (!enrollment.result) {
    return <span className="pill warning-pill">Pending capture</span>;
  }

  return (
    <div className="stacked-cell">
      <span
        className={
          enrollment.result.publicationStatus === "published"
            ? "pill"
            : "pill muted-pill"
        }
      >
        {enrollment.result.publicationStatus}
      </span>
      <span className="table-subtext">
        {formatMark(enrollment.result.finalMark)} {enrollment.result.outcome}
      </span>
    </div>
  );
}

function StudentEnrollmentsPage() {
  const [filters, setFilters] = useState(
    STUDENT_ENROLLMENT_FILTER_INITIAL_STATE,
  );
  const enrollmentPath = buildStudentEnrollmentPath(filters);
  const enrollmentResource = useApiResource(enrollmentPath, EMPTY_ENROLLMENTS);
  const enrollments = enrollmentResource.data.courses || [];

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(STUDENT_ENROLLMENT_FILTER_INITIAL_STATE);
  };

  return (
    <>
      <SectionHeader eyebrow="Academic" title="My enrollments" />
      <StudentEnrollmentFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      {enrollmentResource.isLoading && (
        <PageLoader label="Loading enrollments" />
      )}
      {enrollmentResource.error && (
        <ErrorState message={enrollmentResource.error} />
      )}
      {!enrollmentResource.isLoading &&
        !enrollmentResource.error &&
        enrollments.length === 0 && (
          <EmptyState
            title="No enrollments found"
            message="Course registrations matching this view will appear here."
          />
        )}
      {!enrollmentResource.isLoading &&
        !enrollmentResource.error &&
        enrollments.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Academic period</th>
                  <th>Status</th>
                  <th>Credits</th>
                  <th>Registered</th>
                  <th>Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>
                      <strong>{enrollment.course.courseCode}</strong>
                      <span className="table-subtext">
                        {enrollment.course.courseName}
                      </span>
                    </td>
                    <td>
                      <strong>{enrollment.academicPeriod.name}</strong>
                      <span className="table-subtext">
                        {enrollment.academicPeriod.academicYear}
                      </span>
                    </td>
                    <td>
                      <span
                        className={getEnrollmentStatusPillClass(enrollment)}
                      >
                        {enrollment.status}
                      </span>
                    </td>
                    <td>{enrollment.course.creditValue}</td>
                    <td>{formatShortDate(enrollment.registeredAt)}</td>
                    <td>{formatOptionalShortDate(enrollment.cancelledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

function StudentEnrollmentFilterPanel({ filters, onChange, onReset }) {
  const hasActiveFilters =
    filters.myEnrollmentStatus !==
    STUDENT_ENROLLMENT_FILTER_INITIAL_STATE.myEnrollmentStatus;

  return (
    <section
      className="data-section filter-panel"
      aria-label="My enrollment filters"
    >
      <div className="filter-grid">
        <label>
          Status
          <select
            name="myEnrollmentStatus"
            onChange={onChange}
            value={filters.myEnrollmentStatus}
          >
            <option value="">All statuses</option>
            <option value="registered">Registered</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
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

function buildStudentEnrollmentPath(filters) {
  const params = new URLSearchParams();

  if (filters.myEnrollmentStatus) {
    params.set("status", filters.myEnrollmentStatus);
  }

  const query = params.toString();

  return query ? `/enrollments/me?${query}` : "/enrollments/me";
}

function AdminCoursePanel({ editingCourse, onCancelEdit, onSaved }) {
  const [form, setForm] = useState(COURSE_FORM_INITIAL_STATE);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingCourse);

  useEffect(() => {
    if (!editingCourse) {
      setForm(COURSE_FORM_INITIAL_STATE);
      setError("");
      return;
    }

    setForm({
      courseCode: editingCourse.courseCode,
      courseName: editingCourse.courseName,
      department: editingCourse.department || "",
      creditValue: String(editingCourse.creditValue),
      capacity: String(editingCourse.capacity),
      isActive: editingCourse.isActive,
      description: editingCourse.description || "",
    });
    setError("");
  }, [editingCourse]);

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildPayload = () => ({
    courseCode: form.courseCode,
    courseName: form.courseName,
    department: form.department,
    creditValue: Number(form.creditValue),
    capacity: Number(form.capacity),
    isActive: form.isActive,
    description: form.description || null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = isEditing
        ? await api.patch(`/courses/${editingCourse.id}`, buildPayload())
        : await api.post("/courses", buildPayload());

      setForm(COURSE_FORM_INITIAL_STATE);
      onSaved(response.data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="data-section course-editor"
      aria-labelledby="course-form-title"
    >
      <div className="editor-heading">
        <div>
          <p className="eyebrow">Course setup</p>
          <h2 id="course-form-title">
            {isEditing ? "Edit course" : "New course"}
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
        <div className="form-grid">
          <label>
            Code
            <input
              name="courseCode"
              onChange={handleChange}
              required
              value={form.courseCode}
            />
          </label>
          <label>
            Name
            <input
              name="courseName"
              onChange={handleChange}
              required
              value={form.courseName}
            />
          </label>
          <label>
            Department
            <input
              name="department"
              onChange={handleChange}
              required
              value={form.department}
            />
          </label>
          <label>
            Credits
            <input
              min="1"
              name="creditValue"
              onChange={handleChange}
              required
              type="number"
              value={form.creditValue}
            />
          </label>
          <label>
            Capacity
            <input
              min="1"
              name="capacity"
              onChange={handleChange}
              required
              type="number"
              value={form.capacity}
            />
          </label>
          <label className="checkbox-field">
            <input
              checked={form.isActive}
              name="isActive"
              onChange={handleChange}
              type="checkbox"
            />
            Active
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            onChange={handleChange}
            rows="3"
            value={form.description}
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
              ? "Update course"
              : "Create course"}
        </button>
      </form>
    </section>
  );
}

function getStudentCourseStatus({ course, isRegistered, selectedPeriod }) {
  if (!selectedPeriod) {
    return "No active period";
  }

  if (isRegistered) {
    return `Registered for ${selectedPeriod.name}`;
  }

  if (!selectedPeriod.registrationOpen) {
    return "Registration closed";
  }

  if (course.isFull) {
    return "Course full";
  }

  return "Available";
}

function ResultsPage() {
  const { user } = useAuth();
  const [resultFilters, setResultFilters] = useState(
    RESULT_FILTER_INITIAL_STATE,
  );
  const path =
    user.role === "admin"
      ? buildAdminResultPath(resultFilters)
      : buildStudentResultPath(resultFilters);
  const resultResource = useApiResource(path, EMPTY_RESULTS);
  const enrollmentResource = useApiResource(
    "/enrollments?limit=100&status=registered&resultStatus=pending&sortBy=studentName&sortOrder=asc",
    EMPTY_ADMIN_ENROLLMENTS,
    {
      enabled: user.role === "admin",
    },
  );
  const [editingResult, setEditingResult] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const results = resultResource.data.results || [];
  const pendingEnrollments = enrollmentResource.data.enrollments || [];
  const isLoading =
    resultResource.isLoading ||
    (user.role === "admin" && enrollmentResource.isLoading);
  const error =
    resultResource.error ||
    (user.role === "admin" ? enrollmentResource.error : "");

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setResultFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setResultFilters(RESULT_FILTER_INITIAL_STATE);
  };

  const handleResultSaved = (message) => {
    setNotice(message);
    setActionError("");
    setEditingResult(null);
    resultResource.refetch();

    if (user.role === "admin") {
      enrollmentResource.refetch();
    }
  };

  const handlePublicationChange = async (result) => {
    const isPublished = result.publicationStatus === "published";

    setNotice("");
    setActionError("");
    setBusyKey(`result-${result.id}`);

    try {
      const response = await api.patch(
        `/results/${result.id}/${isPublished ? "unpublish" : "publish"}`,
      );

      setNotice(response.data.message);
      resultResource.refetch();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <>
      <SectionHeader eyebrow="Academic" title="Results" />
      <ResultFilterPanel
        filters={resultFilters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        role={user.role}
      />
      {user.role === "admin" && (
        <AdminResultPanel
          editingResult={editingResult}
          onCancelEdit={() => setEditingResult(null)}
          onSaved={handleResultSaved}
          pendingEnrollments={pendingEnrollments}
        />
      )}
      {user.role === "student" && resultResource.data.academicSummary && (
        <ResultSummary summary={resultResource.data.academicSummary} />
      )}
      {notice && <p className="inline-success">{notice}</p>}
      {actionError && <ErrorState message={actionError} />}
      {isLoading && <PageLoader label="Loading results" />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && results.length === 0 && (
        <EmptyState
          title="No results available"
          message="Result records will appear here once they are captured and published."
        />
      )}
      {!isLoading &&
        !error &&
        user.role === "student" &&
        results.length > 0 && <TranscriptResults results={results} />}
      {!isLoading &&
        !error &&
        user.role === "admin" &&
        results.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {user.role === "admin" && <th>Student</th>}
                <th>Course</th>
                <th>Final mark</th>
                <th>Grade</th>
                <th>Status</th>
                {user.role === "admin" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  {user.role === "admin" && (
                    <td>{result.student?.name || "Unknown student"}</td>
                  )}
                  <td>
                    <strong>{result.course.courseCode}</strong>
                    <span className="table-subtext">
                      {result.course.courseName}
                    </span>
                  </td>
                  <td>{formatMark(result.finalMark)}</td>
                  <td>{result.grade || "Pending"}</td>
                  <td>
                    <span className={getOutcomePillClass(result)}>
                      {result.publicationStatus === "published"
                        ? result.outcome
                        : "draft"}
                    </span>
                  </td>
                  {user.role === "admin" && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="ghost-button compact-button"
                          disabled={Boolean(busyKey)}
                          onClick={() => {
                            setNotice("");
                            setActionError("");
                            setEditingResult(result);
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="primary-button compact-button"
                          disabled={
                            busyKey === `result-${result.id}` ||
                            result.outcome === "incomplete"
                          }
                          onClick={() => handlePublicationChange(result)}
                          type="button"
                        >
                          {result.publicationStatus === "published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TranscriptResults({ results }) {
  const transcriptPeriods = groupResultsByAcademicPeriod(results);

  return (
    <section
      className="dashboard-section"
      aria-labelledby="transcript-results-title"
    >
      <h2 id="transcript-results-title">Transcript results</h2>
      {transcriptPeriods.map((period) => (
        <div className="data-section" key={period.key}>
          <div className="editor-heading">
            <div>
              <p className="eyebrow">Academic period</p>
              <h3>{period.label}</h3>
            </div>
            <span className="pill muted-pill">
              {formatNumber(period.credits)} credits
            </span>
          </div>
          <div className="table-wrap plain-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Credits</th>
                  <th>Coursework</th>
                  <th>Exam</th>
                  <th>Final</th>
                  <th>Grade</th>
                  <th>Grade points</th>
                  <th>Outcome</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {period.results.map((result) => (
                  <tr key={result.id}>
                    <td>
                      <strong>{result.course.courseCode}</strong>
                      <span className="table-subtext">
                        {result.course.courseName}
                      </span>
                    </td>
                    <td>{formatNumber(result.course.creditValue)}</td>
                    <td>{formatMark(result.courseworkMark)}</td>
                    <td>{formatMark(result.examinationMark)}</td>
                    <td>{formatMark(result.finalMark)}</td>
                    <td>{result.grade || "Pending"}</td>
                    <td>{formatGradePoint(result.gradePoint)}</td>
                    <td>
                      <span className={getOutcomePillClass(result)}>
                        {result.outcome}
                      </span>
                    </td>
                    <td>{formatOptionalShortDate(result.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}

function groupResultsByAcademicPeriod(results) {
  const periods = new Map();

  results.forEach((result) => {
    const key = result.academicPeriod.id || result.academicPeriod.label;
    const label = result.academicPeriod.label || "Unknown period";

    if (!periods.has(key)) {
      periods.set(key, {
        key,
        label,
        credits: 0,
        results: [],
      });
    }

    const period = periods.get(key);

    period.credits += Number(result.course.creditValue || 0);
    period.results.push(result);
  });

  return [...periods.values()];
}

function ResultFilterPanel({ filters, onChange, onReset, role }) {
  const hasActiveFilters =
    filters.search ||
    filters.outcome ||
    filters.publicationStatus ||
    filters.sortBy !== RESULT_FILTER_INITIAL_STATE.sortBy ||
    filters.sortOrder !== RESULT_FILTER_INITIAL_STATE.sortOrder;

  return (
    <section className="data-section filter-panel" aria-label="Result filters">
      <div className="filter-grid">
        {role === "admin" && (
          <label>
            Search
            <input
              name="search"
              onChange={onChange}
              placeholder="Student, number, course"
              value={filters.search}
            />
          </label>
        )}
        <label>
          Outcome
          <select name="outcome" onChange={onChange} value={filters.outcome}>
            <option value="">All outcomes</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        {role === "admin" && (
          <label>
            Publication
            <select
              name="publicationStatus"
              onChange={onChange}
              value={filters.publicationStatus}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        )}
        {role === "admin" && (
          <>
            <label>
              Sort by
              <select name="sortBy" onChange={onChange} value={filters.sortBy}>
                <option value="createdAt">Created date</option>
                <option value="studentName">Student name</option>
                <option value="studentNumber">Student number</option>
                <option value="courseCode">Course code</option>
                <option value="finalMark">Final mark</option>
              </select>
            </label>
            <label>
              Order
              <select
                name="sortOrder"
                onChange={onChange}
                value={filters.sortOrder}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
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

function buildAdminResultPath(filters) {
  const params = new URLSearchParams({
    limit: "20",
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const search = filters.search.trim();

  if (search) {
    params.set("search", search);
  }

  if (filters.outcome) {
    params.set("outcome", filters.outcome);
  }

  if (filters.publicationStatus) {
    params.set("publicationStatus", filters.publicationStatus);
  }

  return `/results?${params.toString()}`;
}

function buildStudentResultPath(filters) {
  const params = new URLSearchParams();

  if (filters.outcome) {
    params.set("outcome", filters.outcome);
  }

  const query = params.toString();

  return query ? `/results/me?${query}` : "/results/me";
}

function AdminResultPanel({
  editingResult,
  onCancelEdit,
  onSaved,
  pendingEnrollments,
}) {
  const [form, setForm] = useState(RESULT_FORM_INITIAL_STATE);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(editingResult);

  useEffect(() => {
    if (!editingResult) {
      setForm(RESULT_FORM_INITIAL_STATE);
      setError("");
      return;
    }

    setForm({
      enrollmentId: String(editingResult.enrollmentId),
      courseworkMark: markToInputValue(editingResult.courseworkMark),
      examinationMark: markToInputValue(editingResult.examinationMark),
      remarks: editingResult.remarks || "",
    });
    setError("");
  }, [editingResult]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const buildPayload = () => ({
    courseworkMark: inputMarkToPayload(form.courseworkMark),
    examinationMark: inputMarkToPayload(form.examinationMark),
    remarks: form.remarks || null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      const response = isEditing
        ? await api.patch(`/results/${editingResult.id}`, payload)
        : await api.post("/results", {
            enrollmentId: Number(form.enrollmentId),
            ...payload,
          });

      setForm(RESULT_FORM_INITIAL_STATE);
      onSaved(response.data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="data-section result-editor" aria-labelledby="result-form-title">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">Assessment</p>
          <h2 id="result-form-title">
            {isEditing ? "Edit result" : "Capture result"}
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
        <div className="form-grid results-form-grid">
          <label>
            Enrollment
            <select
              disabled={isEditing}
              name="enrollmentId"
              onChange={handleChange}
              required={!isEditing}
              value={form.enrollmentId}
            >
              <option value="">
                {pendingEnrollments.length > 0
                  ? "Choose an enrollment"
                  : "No pending enrollments"}
              </option>
              {pendingEnrollments.map((enrollment) => (
                <option key={enrollment.id} value={enrollment.id}>
                  {formatEnrollmentOption(enrollment)}
                </option>
              ))}
              {isEditing && (
                <option value={editingResult.enrollmentId}>
                  {formatResultEnrollmentLabel(editingResult)}
                </option>
              )}
            </select>
          </label>
          <label>
            Coursework
            <input
              max="100"
              min="0"
              name="courseworkMark"
              onChange={handleChange}
              step="0.01"
              type="number"
              value={form.courseworkMark}
            />
          </label>
          <label>
            Examination
            <input
              max="100"
              min="0"
              name="examinationMark"
              onChange={handleChange}
              step="0.01"
              type="number"
              value={form.examinationMark}
            />
          </label>
        </div>
        <label>
          Remarks
          <textarea
            name="remarks"
            onChange={handleChange}
            rows="3"
            value={form.remarks}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button
          className="primary-button form-action"
          disabled={isSubmitting || (!isEditing && !form.enrollmentId)}
          type="submit"
        >
          {isSubmitting
            ? isEditing
              ? "Updating"
              : "Capturing"
            : isEditing
              ? "Update result"
              : "Capture result"}
        </button>
      </form>
    </section>
  );
}

function ResultSummary({ summary }) {
  return (
    <StatGrid
      stats={[
        { label: "Published results", value: summary.totalPublishedResults },
        { label: "Completed courses", value: summary.completedCourses },
        { label: "Passed courses", value: summary.passedCourses },
        { label: "Earned credits", value: summary.earnedCredits },
        { label: "Average mark", value: summary.averageMark || 0 },
        { label: "GPA", value: summary.gpa || 0 },
      ]}
    />
  );
}

function formatMark(value) {
  if (value === null || value === undefined) {
    return "Incomplete";
  }

  return `${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

function formatGradePoint(value) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function markToInputValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function inputMarkToPayload(value) {
  if (value === "") {
    return null;
  }

  return Number(value);
}

function formatEnrollmentOption(enrollment) {
  return [
    enrollment.student.name,
    enrollment.student.studentNumber,
    enrollment.course.courseCode,
    enrollment.academicPeriod.name,
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatResultEnrollmentLabel(result) {
  return [
    result.student?.name,
    result.student?.studentNumber,
    result.course.courseCode,
    result.academicPeriod.label,
  ]
    .filter(Boolean)
    .join(" - ");
}

function getOutcomePillClass(result) {
  if (result.publicationStatus !== "published") {
    return "pill muted-pill";
  }

  if (result.outcome === "pass") {
    return "pill";
  }

  if (result.outcome === "fail") {
    return "pill danger-pill";
  }

  return "pill warning-pill";
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
