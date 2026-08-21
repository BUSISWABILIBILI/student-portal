import { useState } from "react";

import { useAuth } from "../app/authContext";
import { SectionHeader } from "../components/ui";
import api, { getErrorMessage } from "../lib/api";

const CHANGE_PASSWORD_INITIAL_STATE = {
  currentPassword: "",
  newPassword: "",
};

export function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(CHANGE_PASSWORD_INITIAL_STATE);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.patch("/auth/me/password", form);

      setMessage(response.data.message);
      setForm(CHANGE_PASSWORD_INITIAL_STATE);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SectionHeader eyebrow="Security" title="Account" />
      <section className="data-section account-security">
        <div>
          <p className="eyebrow">Signed in as</p>
          <h2>{user.fullName}</h2>
          <p className="muted">{user.email}</p>
        </div>
        <form className="resource-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Current password
              <input
                autoComplete="current-password"
                name="currentPassword"
                onChange={handleChange}
                required
                type="password"
                value={form.currentPassword}
              />
            </label>
            <label>
              New password
              <input
                autoComplete="new-password"
                name="newPassword"
                onChange={handleChange}
                required
                type="password"
                value={form.newPassword}
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="inline-success">{message}</p>}
          <button
            className="primary-button form-action"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Changing" : "Change password"}
          </button>
        </form>
      </section>
    </>
  );
}
