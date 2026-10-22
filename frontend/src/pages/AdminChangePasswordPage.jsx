import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./ChangePasswordPage.css";

const EyeOpen = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function getPasswordErrors(password) {
  const errors = [];
  if (password.length < 8) {
    errors.push("at least 8 characters");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("at least one number (0-9)");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("at least one special character/symbol");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("at least one uppercase letter (A-Z)");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("at least one lowercase letter (a-z)");
  }
  return errors;
}

const isFirefox = typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);

export default function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const isNewPwAllOk =
    newPw.length >= 8 &&
    /[0-9]/.test(newPw) &&
    /[^a-zA-Z0-9]/.test(newPw) &&
    /[A-Z]/.test(newPw) &&
    /[a-z]/.test(newPw);

  const handleCurrentPwChange = (val) => {
    setCurrentPw(val);
    if (error === "Please enter your current password." && val) {
      setError("");
    } else if (error.startsWith("Current password is incorrect.") && val) {
      setError("");
    } else if (
      error === "New password cannot be the same as your current password. Please choose a different password." &&
      newPw !== val
    ) {
      setError("");
    }
  };

  const handleNewPwChange = (val) => {
    setNewPw(val);
    if (error === "Please enter your new password." && val) {
      setError("");
    } else if (error.startsWith("Password must include:") && getPasswordErrors(val).length === 0) {
      setError("");
    } else if (
      error === "New password cannot be the same as your current password. Please choose a different password." &&
      val !== currentPw
    ) {
      setError("");
    } else if (error === "Passwords do not match. Please re-enter." && confirmPw && val === confirmPw) {
      setError("");
    }
  };

  const handleConfirmPwChange = (val) => {
    setConfirmPw(val);
    if (error === "Please confirm your new password." && val) {
      setError("");
    } else if (error === "Passwords do not match. Please re-enter." && val === newPw) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPw) {
      setError("Please enter your current password.");
      document.getElementById("adm-current-key")?.focus();
      return;
    }

    if (!newPw) {
      setError("Please enter your new password.");
      document.getElementById("adm-new-key")?.focus();
      return;
    }

    const passwordErrors = getPasswordErrors(newPw);
    if (passwordErrors.length > 0) {
      setError(`Password must include: ${passwordErrors.join(", ")}.`);
      document.getElementById("adm-new-key")?.focus();
      return;
    }

    if (newPw === currentPw) {
      setError("New password cannot be the same as your current password. Please choose a different password.");
      document.getElementById("adm-new-key")?.focus();
      return;
    }

    if (!confirmPw) {
      setError("Please confirm your new password.");
      document.getElementById("adm-confirm-key")?.focus();
      return;
    }

    if (newPw !== confirmPw) {
      setError("Passwords do not match. Please re-enter.");
      document.getElementById("adm-confirm-key")?.focus();
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/${user.id}/change-password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setSuccess("Password changed successfully! Redirecting to dashboard...");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setConfirmActive(false);
      setTimeout(() => navigate("/admin/dashboard"), 1800);
    } catch (err) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to change password. Please try again.";

      if (serverMsg.toLowerCase().includes("current password is incorrect")) {
        setError(
          "Current password is incorrect. Forgot your password? Log out and reset it using “Forgot Password” on the login page."
        );
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cpp-page">
      <div className="cpp-card">
        <button className="cpp-back" onClick={() => navigate("/admin/dashboard")}>
          ← Back to Dashboard
        </button>

        <div className="cpp-lock-icon">
          <div className="cpp-lock-circle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="28"
              height="28"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
          </div>
        </div>

        <h2 className="cpp-title">Change Password</h2>
        <p className="cpp-subtitle">Update your admin account password</p>

        {error && <div className="cpp-error">⚠️ {error}</div>}
        {success && <div className="cpp-success">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="cpp-form" noValidate autoComplete="off">
          <div className="cpp-field">
            <label>Current Password</label>
            <div className="cpp-pw-wrap">
              <input
                id="adm-current-key"
                name="adm-current-key"
                type={isFirefox ? (showCurrent ? "text" : "password") : "text"}
                style={!isFirefox && !showCurrent ? { WebkitTextSecurity: "disc" } : {}}
                value={currentPw}
                onChange={(e) => handleCurrentPwChange(e.target.value)}
                placeholder="Enter current password"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <button
                type="button"
                className="cpp-eye"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOpen /> : <EyeClosed />}
              </button>
            </div>
          </div>

          <div className="cpp-field">
            <label>New Password</label>
            <div className="cpp-pw-wrap">
              <input
                id="adm-new-key"
                name="adm-new-key"
                type={isFirefox ? (showNew ? "text" : "password") : "text"}
                style={!isFirefox && !showNew ? { WebkitTextSecurity: "disc" } : {}}
                value={newPw}
                onChange={(e) => handleNewPwChange(e.target.value)}
                onFocus={() => setConfirmActive(false)}
                placeholder="Enter new password"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <button
                type="button"
                className="cpp-eye"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOpen /> : <EyeClosed />}
              </button>
            </div>

            {newPw && !(confirmActive && isNewPwAllOk) && (
              <div className="cpp-requirements">
                <span className={`cpp-req-item ${newPw.length >= 8 ? "met" : "unmet"}`}>
                  {newPw.length >= 8 ? "OK" : "NO"} At least 8 characters
                </span>
                <span className={`cpp-req-item ${/[0-9]/.test(newPw) ? "met" : "unmet"}`}>
                  {/[0-9]/.test(newPw) ? "OK" : "NO"} At least one number (0-9)
                </span>
                <span className={`cpp-req-item ${/[^a-zA-Z0-9]/.test(newPw) ? "met" : "unmet"}`}>
                  {/[^a-zA-Z0-9]/.test(newPw) ? "OK" : "NO"} At least one special character/symbol
                </span>
                <span className={`cpp-req-item ${/[A-Z]/.test(newPw) ? "met" : "unmet"}`}>
                  {/[A-Z]/.test(newPw) ? "OK" : "NO"} At least one uppercase letter (A-Z)
                </span>
                <span className={`cpp-req-item ${/[a-z]/.test(newPw) ? "met" : "unmet"}`}>
                  {/[a-z]/.test(newPw) ? "OK" : "NO"} At least one lowercase letter (a-z)
                </span>
              </div>
            )}
          </div>

          <div className="cpp-field">
            <label>Confirm New Password</label>
            <div className="cpp-pw-wrap">
              <input
                id="adm-confirm-key"
                name="adm-confirm-key"
                type={isFirefox ? (showConfirm ? "text" : "password") : "text"}
                style={!isFirefox && !showConfirm ? { WebkitTextSecurity: "disc" } : {}}
                value={confirmPw}
                onChange={(e) => handleConfirmPwChange(e.target.value)}
                onFocus={() => setConfirmActive(true)}
                onClick={() => setConfirmActive(true)}
                placeholder="Confirm new password"
                className={confirmPw && confirmPw !== newPw ? "cpp-mismatch" : ""}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <button
                type="button"
                className="cpp-eye"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOpen /> : <EyeClosed />}
              </button>
            </div>
            {confirmPw && confirmPw !== newPw && (
              <span className="cpp-hint">⚠️ Passwords do not match.</span>
            )}
          </div>

          <div className="cpp-actions">
            <button type="submit" className="cpp-save-btn" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </button>
            <button
              type="button"
              className="cpp-cancel-btn"
              onClick={() => navigate("/admin/dashboard")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
