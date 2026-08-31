import { useEffect, useState } from "react";

import { useAuth } from "../app/authContext";
import {
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeader,
  StatGrid,
} from "../components/ui";
import { useApiResource } from "../hooks/useApiResource";
import api, { getErrorMessage } from "../lib/api";
import {
  formatNumber,
  formatOptionalShortDate,
} from "../utils/formatters";
import {
  formatGradePoint,
  formatMark,
  getOutcomePillClass,
} from "../utils/results";

const EMPTY_ADMIN_ENROLLMENTS = { enrollments: [] };
const EMPTY_RESULTS = { results: [] };
const RESULT_FORM_INITIAL_STATE = {
  enrollmentId: "",
  courseworkMark: "",
  examinationMark: "",
  remarks: "",
};
const RESULT_FILTER_INITIAL_STATE = {
  search: "",
  outcome: "",
  publicationStatus: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function ResultsPage() {
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
    <section
      className="data-section result-editor"
      aria-labelledby="result-form-title"
    >
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
