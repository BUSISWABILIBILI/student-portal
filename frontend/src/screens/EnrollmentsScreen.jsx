import { useState } from "react";

import {
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeader,
} from "../components/ui";
import { useApiResource } from "../hooks/useApiResource";
import {
  formatOptionalShortDate,
  formatShortDate,
} from "../utils/formatters";
import { formatMark } from "../utils/results";

const EMPTY_ENROLLMENTS = { courses: [] };
const EMPTY_ADMIN_ENROLLMENTS = { enrollments: [] };
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

export function EnrollmentsPage() {
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

export function StudentEnrollmentsPage() {
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

function buildStudentEnrollmentPath(filters) {
  const params = new URLSearchParams();

  if (filters.myEnrollmentStatus) {
    params.set("status", filters.myEnrollmentStatus);
  }

  const query = params.toString();

  return query ? `/enrollments/me?${query}` : "/enrollments/me";
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
