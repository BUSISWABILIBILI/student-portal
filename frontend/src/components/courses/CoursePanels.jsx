import { useEffect, useState } from "react";

import api, { getErrorMessage } from "../../lib/api";
import {
  COURSE_FILTER_INITIAL_STATE,
  COURSE_FORM_INITIAL_STATE,
} from "./courseState";

export function CourseFilterPanel({ filters, onChange, onReset, role }) {
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

export function AdminCoursePanel({ editingCourse, onCancelEdit, onSaved }) {
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
