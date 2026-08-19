import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import api, { ACCESS_TOKEN_KEY, getErrorMessage } from "./lib/api";

const AuthContext = createContext(null);

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", roles: ["admin", "student"] },
  { to: "/courses", label: "Courses", roles: ["admin", "student"] },
  { to: "/results", label: "Results", roles: ["admin", "student"] },
  { to: "/announcements", label: "Announcements", roles: ["admin", "student"] },
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
  priority: "normal",
  publishAt: "",
  expiresAt: "",
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const getInitials = (user) => {
  const first = user?.firstName?.[0] || "";
  const last = user?.lastName?.[0] || "";

  return `${first}${last}` || "SP";
};

function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    window.localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsBooting(false);
      return;
    }

    let cancelled = false;

    const loadCurrentUser = async () => {
      try {
        const response = await api.get("/auth/me");

        if (!cancelled) {
          setUser(response.data.data.user);
        }
      } catch {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);

        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback(async ({ email, password }) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const nextToken = response.data.data.accessToken;
    const nextUser = response.data.data.user;

    window.localStorage.setItem(ACCESS_TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);

    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await api.post("/auth/logout");
      }
    } finally {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isBooting,
      signIn,
      signOut,
      token,
      user,
    }),
    [isBooting, signIn, signOut, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ children }) {
  const { isAuthenticated, isBooting } = useAuth();
  const location = useLocation();

  if (isBooting) {
    return <PageLoader label="Checking session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function PageLoader({ label = "Loading" }) {
  return (
    <main className="center-stage">
      <div className="loader" aria-label={label} />
      <p>{label}</p>
    </main>
  );
}

function LoginPage() {
  const { isAuthenticated, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "admin@studentportal.local",
    password: "Admin@123",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn(form);

      navigate(location.state?.from?.pathname || "/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Student Portal</p>
          <h1 id="login-title">Sign in</h1>
          <p className="muted">
            Use your portal account to manage courses, registrations, results,
            and announcements.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

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
            <Route element={<ResultsPage />} path="/results" />
            <Route element={<AnnouncementsPage />} path="/announcements" />
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

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="section-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return <p className="inline-error">{message}</p>;
}

function StatGrid({ stats }) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{formatNumber(stat.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function useApiResource(path, fallbackValue, options = {}) {
  const { enabled = true } = options;
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [state, setState] = useState({
    data: fallbackValue,
    error: "",
    isLoading: true,
  });

  useEffect(() => {
    if (!enabled || !path) {
      setState({
        data: fallbackValue,
        error: "",
        isLoading: false,
      });

      return undefined;
    }

    let cancelled = false;

    const loadResource = async () => {
      setState({
        data: fallbackValue,
        error: "",
        isLoading: true,
      });

      try {
        const response = await api.get(path);

        if (!cancelled) {
          setState({
            data: response.data.data,
            error: "",
            isLoading: false,
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setState({
            data: fallbackValue,
            error: getErrorMessage(requestError),
            isLoading: false,
          });
        }
      }
    };

    loadResource();

    return () => {
      cancelled = true;
    };
  }, [enabled, fallbackValue, path, refreshIndex]);

  const refetch = useCallback(() => {
    setRefreshIndex((current) => current + 1);
  }, []);

  return {
    ...state,
    refetch,
  };
}

function DashboardPage() {
  const { user } = useAuth();
  const path =
    user.role === "admin" ? "/dashboard/admin" : "/dashboard/student";
  const { data, error, isLoading } = useApiResource(path, null);

  if (isLoading) {
    return <PageLoader label="Loading dashboard" />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (user.role === "admin") {
    const dashboard = data.dashboard;

    return (
      <>
        <SectionHeader eyebrow="Overview" title="Institution dashboard" />
        <StatGrid
          stats={[
            { label: "Users", value: dashboard.users.total },
            { label: "Students", value: dashboard.users.students },
            { label: "Active courses", value: dashboard.courses.active },
            { label: "Registrations", value: dashboard.enrollments.registered },
            { label: "Published results", value: dashboard.results.published },
            {
              label: "Announcements",
              value: dashboard.announcements.published,
            },
          ]}
        />
        <RecentStudents students={dashboard.recentStudents} />
      </>
    );
  }

  const dashboard = data.dashboard;

  return (
    <>
      <SectionHeader eyebrow="Overview" title="My dashboard" />
      <StatGrid
        stats={[
          { label: "Registered courses", value: dashboard.enrollments.registered },
          { label: "Completed courses", value: dashboard.enrollments.completed },
          { label: "Published results", value: dashboard.academicPerformance.publishedResults },
          { label: "Earned credits", value: dashboard.academicPerformance.earnedCredits },
          { label: "Average mark", value: dashboard.academicPerformance.averageMark || 0 },
          { label: "GPA", value: dashboard.academicPerformance.gpa || 0 },
        ]}
      />
      <RecentResults results={dashboard.recentResults} />
    </>
  );
}

function RecentStudents({ students }) {
  if (!students.length) {
    return (
      <EmptyState
        title="No recent students"
        message="Student activity will appear here as accounts are created."
      />
    );
  }

  return (
    <section className="data-section">
      <h2>Recent students</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Student number</th>
              <th>Programme</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.fullName}</td>
                <td>{student.studentNumber}</td>
                <td>{student.programme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentResults({ results }) {
  if (!results.length) {
    return (
      <EmptyState
        title="No published results"
        message="Published academic results will appear here."
      />
    );
  }

  return (
    <section className="data-section">
      <h2>Recent results</h2>
      <div className="item-list">
        {results.map((result) => (
          <article className="list-item" key={result.id}>
            <div>
              <strong>{result.course.courseCode}</strong>
              <span>{result.course.courseName}</span>
            </div>
            <span className="pill">{result.finalMark}%</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function CoursesPage() {
  const { user } = useAuth();
  const [selectedAcademicPeriodId, setSelectedAcademicPeriodId] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const courseResource = useApiResource(
    "/courses?limit=50&sortBy=courseCode",
    EMPTY_COURSES,
  );
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

  const refreshCourseWorkflow = () => {
    courseResource.refetch();

    if (user.role === "student" && selectedAcademicPeriodId) {
      enrollmentResource.refetch();
    }
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
      {user.role === "admin" && (
        <AdminCoursePanel onCreated={courseResource.refetch} />
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

function AdminCoursePanel({ onCreated }) {
  const [form, setForm] = useState(COURSE_FORM_INITIAL_STATE);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/courses", {
        courseCode: form.courseCode,
        courseName: form.courseName,
        department: form.department,
        creditValue: Number(form.creditValue),
        capacity: Number(form.capacity),
        isActive: form.isActive,
        description: form.description || null,
      });

      setForm(COURSE_FORM_INITIAL_STATE);
      setMessage(response.data.message);
      onCreated();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="data-section course-editor" aria-labelledby="course-form-title">
      <div>
        <p className="eyebrow">Course setup</p>
        <h2 id="course-form-title">New course</h2>
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
        {message && <p className="inline-success">{message}</p>}
        <button className="primary-button form-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating" : "Create course"}
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
  const path = user.role === "admin" ? "/results?limit=20" : "/results/me";
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
      {!isLoading && !error && results.length > 0 && (
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
  const path =
    user.role === "admin"
      ? "/announcements?limit=50&sortOrder=desc"
      : "/announcements/me?limit=20";
  const announcementResource = useApiResource(path, EMPTY_ANNOUNCEMENTS);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const announcements = announcementResource.data.announcements || [];

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
      {user.role === "admin" && (
        <AdminAnnouncementPanel
          editingAnnouncement={editingAnnouncement}
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
          message="Published announcements will appear here."
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

function AdminAnnouncementPanel({
  editingAnnouncement,
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
    priority: form.priority,
    publishAt: dateTimeLocalToIso(form.publishAt),
    expiresAt: dateTimeLocalToIso(form.expiresAt),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
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

function isoToDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatAnnouncementDate(value) {
  if (!value) {
    return "not scheduled";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getAnnouncementTargetLabel(announcement) {
  if (announcement.targetType === "all") {
    return "Everyone";
  }

  if (announcement.targetType === "role") {
    return announcement.targetRole === "admin" ? "Administrators" : "Students";
  }

  if (announcement.targetStudent) {
    return announcement.targetStudent.fullName;
  }

  return "Targeted";
}

function getAnnouncementPillClass(announcement) {
  if (announcement.priority === "urgent") {
    return "pill danger-pill";
  }

  if (announcement.priority === "high") {
    return "pill warning-pill";
  }

  if (announcement.priority === "low") {
    return "pill muted-pill";
  }

  return "pill";
}

function UsersPage() {
  const { data, error, isLoading } = useApiResource(
    "/users?limit=20",
    EMPTY_USERS,
  );

  return (
    <>
      <SectionHeader eyebrow="Administration" title="Users" />
      {isLoading && <PageLoader label="Loading users" />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && data.users.length === 0 && (
        <EmptyState
          title="No users found"
          message="User accounts created by administrators will appear here."
        />
      )}
      {!isLoading && !error && data.users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((userRecord) => (
                <tr key={userRecord.id}>
                  <td>{userRecord.fullName}</td>
                  <td>{userRecord.email}</td>
                  <td>{userRecord.role}</td>
                  <td>{userRecord.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
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
