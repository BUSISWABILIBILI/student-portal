import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../app/authContext";
import api, { getErrorMessage } from "../lib/api";

const RESET_REQUEST_INITIAL_STATE = {
  email: "",
};

const RESET_PASSWORD_INITIAL_STATE = {
  token: "",
  newPassword: "",
};

export function LoginPage() {
  const { clearSessionMessage, isAuthenticated, sessionMessage, signIn } =
    useAuth();
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
    clearSessionMessage();
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

          {sessionMessage && !error && (
            <p className="inline-notice">{sessionMessage}</p>
          )}
          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>
        </form>

        <Link className="auth-link" to="/forgot-password">
          Forgot password?
        </Link>
      </section>
    </main>
  );
}

export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState(RESET_REQUEST_INITIAL_STATE);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
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
    setMessage("");
    setResetToken("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/password-reset/request", form);

      setMessage(response.data.message);
      setResetToken(response.data.data?.resetToken || "");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="forgot-title">
        <div>
          <p className="eyebrow">Student Portal</p>
          <h1 id="forgot-title">Reset password</h1>
          <p className="muted">
            Enter your account email to prepare a password reset.
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

          {error && <p className="form-error">{error}</p>}
          {message && <p className="inline-success">{message}</p>}
          {resetToken && (
            <label>
              Reset token
              <textarea readOnly rows="3" value={resetToken} />
            </label>
          )}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Preparing" : "Prepare reset"}
          </button>
        </form>

        <div className="auth-link-row">
          <Link className="auth-link" to="/reset-password">
            Enter reset token
          </Link>
          <Link className="auth-link" to="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

export function ResetPasswordPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState(() => ({
    ...RESET_PASSWORD_INITIAL_STATE,
    token: new URLSearchParams(location.search).get("token") || "",
  }));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/password-reset/confirm", form);

      setMessage(response.data.message);
      setForm(RESET_PASSWORD_INITIAL_STATE);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="reset-title">
        <div>
          <p className="eyebrow">Student Portal</p>
          <h1 id="reset-title">New password</h1>
          <p className="muted">
            Use your reset token to choose a new account password.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Reset token
            <textarea
              name="token"
              onChange={handleChange}
              required
              rows="3"
              value={form.token}
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

          {error && <p className="form-error">{error}</p>}
          {message && <p className="inline-success">{message}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Resetting" : "Reset password"}
          </button>
        </form>

        <Link className="auth-link" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
