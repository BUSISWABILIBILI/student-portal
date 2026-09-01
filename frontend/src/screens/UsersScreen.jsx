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
  dateToInputValue,
  formatShortDate,
  optionalDateValue,
  optionalTextValue,
} from "../utils/formatters";

const EMPTY_USERS = { users: [] };
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

export function UsersPage() {
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
                      className={
                        userRecord.isActive ? "pill" : "pill muted-pill"
                      }
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
    <section
      className="data-section user-editor"
      aria-labelledby="user-form-title"
    >
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
                <select
                  name="gender"
                  onChange={handleChange}
                  value={form.gender}
                >
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
