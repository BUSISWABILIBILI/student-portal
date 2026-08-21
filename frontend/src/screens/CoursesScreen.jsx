import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../app/authContext";
import {
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeader,
} from "../components/ui";
import { useApiResource } from "../hooks/useApiResource";
import api, { getErrorMessage } from "../lib/api";

const EMPTY_COURSES = { courses: [] };
const EMPTY_ACADEMIC_PERIODS = { academicPeriods: [] };
const EMPTY_ENROLLMENTS = { courses: [] };
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

export function CoursesPage() {
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
                  <span
                    className={course.isActive ? "pill" : "pill muted-pill"}
                  >
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
