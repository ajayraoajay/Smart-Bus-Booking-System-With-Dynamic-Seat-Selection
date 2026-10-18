import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./LoginPage.css";

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

const TicketIcon = () => (
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
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

const ShieldIcon = () => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ClockIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const MobileLogo = ({ onClick }) => (
  <div className="auth-mobile-logo" onClick={onClick} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
    <div className="auth-mobile-logo-icon">
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <rect width="24" height="24" rx="6" fill="#2563eb" />
        <path
          d="M5 8C5 6.9 5.9 6 7 6H17C18.1 6 19 6.9 19 8V15C19 15.6 18.6 16 18 16H17V17.5C17 17.8 16.8 18 16.5 18H15.5C15.2 18 15 17.8 15 17.5V16H9V17.5C9 17.8 8.8 18 8.5 18H7.5C7.2 18 7 17.8 7 17.5V16H6C5.4 16 5 15.6 5 15V8Z"
          fill="white"
        />
        <rect x="7" y="8.5" width="10" height="4" rx="1" fill="rgba(255,255,255,0.3)" />
        <circle cx="8.5" cy="14.5" r="1" fill="rgba(255,255,255,0.5)" />
        <circle cx="15.5" cy="14.5" r="1" fill="rgba(255,255,255,0.5)" />
      </svg>
    </div>
    <span className="auth-mobile-logo-text">BusGo</span>
  </div>
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

export default function SharedLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoggedIn, login } = useAuth();

  const [mode, setMode] = useState("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginToast, setLoginToast] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regConfirmActive, setRegConfirmActive] = useState(false);

  const [fpEmail, setFpEmail] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpNewPw, setFpNewPw] = useState("");
  const [fpConfirmPw, setFpConfirmPw] = useState("");
  const [showFpPw, setShowFpPw] = useState(false);
  const [showFpConfirmPw, setShowFpConfirmPw] = useState(false);
  const [resetCodeHint, setResetCodeHint] = useState("");
  const [fpConfirmActive, setFpConfirmActive] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegPwAllOk =
    regPassword.length >= 8 &&
    /[0-9]/.test(regPassword) &&
    /[^a-zA-Z0-9]/.test(regPassword) &&
    /[A-Z]/.test(regPassword) &&
    /[a-z]/.test(regPassword);

  const isFpNewPwAllOk =
    fpNewPw.length >= 8 &&
    /[0-9]/.test(fpNewPw) &&
    /[^a-zA-Z0-9]/.test(fpNewPw) &&
    /[A-Z]/.test(fpNewPw) &&
    /[a-z]/.test(fpNewPw);

  const getSavedRedirectState = () => {
    let savedState =
      location.state?.redirectState ||
      (location.state?.selectedBoardingPoint || location.state?.selectedDroppingPoint
        ? {
            selectedBoardingPoint: location.state.selectedBoardingPoint,
            selectedDroppingPoint: location.state.selectedDroppingPoint,
          }
        : null);

    if (!savedState) {
      const stored = sessionStorage.getItem("busgo_login_redirect_state");
      if (stored) {
        try {
          savedState = JSON.parse(stored);
        } catch {
          savedState = null;
        }
      }
    }
    return savedState;
  };

  useEffect(() => {
    if (location.state?.redirectTo) {
      sessionStorage.setItem("busgo_login_redirect", location.state.redirectTo);
      const redirectState = location.state.redirectState || (
        location.state.selectedBoardingPoint || location.state.selectedDroppingPoint
          ? {
              selectedBoardingPoint: location.state.selectedBoardingPoint,
              selectedDroppingPoint: location.state.selectedDroppingPoint,
            }
          : null
      );
      if (redirectState) {
        sessionStorage.setItem("busgo_login_redirect_state", JSON.stringify(redirectState));
      }
    } else if (!location.state) {
      sessionStorage.removeItem("busgo_login_redirect");
      sessionStorage.removeItem("busgo_login_redirect_state");
    }
  }, [location.state]);

  useEffect(() => {
    if (!isLoggedIn || loginToast) {
      return;
    }

    const savedRedirect = location.state?.redirectTo || sessionStorage.getItem("busgo_login_redirect");
    const savedState = getSavedRedirectState();

    if (!isAdmin && savedRedirect) {
      sessionStorage.removeItem("busgo_login_redirect");
      navigate(savedRedirect, { state: savedState, replace: true });
    } else {
      sessionStorage.removeItem("busgo_login_redirect");
      sessionStorage.removeItem("busgo_login_redirect_state");
      navigate(isAdmin ? "/admin/dashboard" : "/user/dashboard", { replace: true });
    }
  }, [isAdmin, isLoggedIn, loginToast, navigate, location.state]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode) => {
    clearMessages();
    if (nextMode === "forgot-email" && loginEmail.trim()) {
      setFpEmail(loginEmail.trim());
    }
    setLoginPassword("");
    setRegPassword("");
    setRegConfirm("");
    setRegConfirmActive(false);
    setFpConfirmActive(false);
    setMode(nextMode);
  };

  const clearForgotPasswordState = () => {
    setFpEmail("");
    setFpCode("");
    setFpNewPw("");
    setFpConfirmPw("");
    setShowFpPw(false);
    setShowFpConfirmPw(false);
    setResetCodeHint("");
    setFpConfirmActive(false);
  };

  const handleResendCode = async () => {
    setFpCode("");
    await handleSendCode();
  };

  const showSuccessAndNavigate = (path, navState, userData) => {
    setLoginToast(true);
    setTimeout(() => {
      login(userData);
      setLoginToast(false);
      navigate(path, { state: navState, replace: true });
    }, 800);
  };

  const handleLoginEmailChange = (val) => {
    setLoginEmail(val);
    const trimmed = val.trim();
    if (error === "Please enter your email and password." && trimmed && loginPassword) {
      setError("");
    } else if (error === "Please enter your email address." && trimmed) {
      setError("");
    } else if (error === "Please enter a valid email address." && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("");
    }
  };

  const handleLoginPasswordChange = (val) => {
    setLoginPassword(val);
    if (error === "Please enter your email and password." && loginEmail.trim() && val) {
      setError("");
    } else if (error === "Please enter your password." && val) {
      setError("");
    }
  };

  const handleRegNameChange = (val) => {
    setRegName(val);
    const trimmed = val.trim();
    if (error === "Please enter your full name." && trimmed) {
      setError("");
    } else if (error === "Full name must be at least 2 characters." && trimmed.length >= 2) {
      setError("");
    } else if (error === "Full name can only contain letters and spaces." && trimmed && /^[a-zA-Z\s.'-]+$/.test(trimmed)) {
      setError("");
    }
  };

  const handleRegEmailChange = (val) => {
    setRegEmail(val);
    const trimmed = val.trim();
    if (error === "Please enter your email address." && trimmed) {
      setError("");
    } else if (error === "Please enter a valid email address." && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("");
    }
  };

  const handleRegPhoneChange = (val) => {
    const numeric = val.replace(/\D/g, "").slice(0, 10);
    setRegPhone(numeric);
    if (error === "Please enter your phone number." && numeric) {
      setError("");
    } else if (error === "Phone number must be exactly 10 digits." && numeric.length === 10) {
      setError("");
    }
  };

  const handleRegPasswordChange = (val) => {
    setRegPassword(val);
    if (error === "Please create a password." && val) {
      setError("");
    } else if (error.startsWith("Password must include:") && getPasswordErrors(val).length === 0) {
      setError("");
    } else if (error === "Passwords do not match. Please re-enter." && regConfirm && val === regConfirm) {
      setError("");
    }
  };

  const handleRegConfirmChange = (val) => {
    setRegConfirm(val);
    if (error === "Please confirm your password." && val) {
      setError("");
    } else if (error === "Passwords do not match. Please re-enter." && val === regPassword) {
      setError("");
    }
  };

  const handleFpEmailChange = (val) => {
    setFpEmail(val);
    const trimmed = val.trim();
    if (error === "Please enter your registered email address." && trimmed) {
      setError("");
    } else if (error === "Please enter a valid email address." && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("");
    }
  };

  const handleFpCodeChange = (val) => {
    const numeric = val.replace(/\D/g, "").slice(0, 6);
    setFpCode(numeric);
    if (error === "Please enter the 6-digit verification code." && numeric) {
      setError("");
    } else if (error === "Verification code must be exactly 6 digits." && numeric.length === 6) {
      setError("");
    }
  };

  const handleFpNewPwChange = (val) => {
    setFpNewPw(val);
    if (error === "Please enter your new password." && val) {
      setError("");
    } else if (error.startsWith("Password must include:") && getPasswordErrors(val).length === 0) {
      setError("");
    } else if (error === "Passwords do not match. Please re-enter." && fpConfirmPw && val === fpConfirmPw) {
      setError("");
    }
  };

  const handleFpConfirmPwChange = (val) => {
    setFpConfirmPw(val);
    if (error === "Please confirm your new password." && val) {
      setError("");
    } else if (error === "Passwords do not match. Please re-enter." && val === fpNewPw) {
      setError("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    clearMessages();

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail && !loginPassword) {
      setError("Please enter your email and password.");
      document.getElementById("login-email")?.focus();
      return;
    }
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      document.getElementById("login-email")?.focus();
      return;
    }
    if (!trimmedEmail.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      document.getElementById("login-email")?.focus();
      return;
    }
    if (!loginPassword) {
      setError("Please enter your password.");
      document.getElementById("login-password")?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/login", {
        email: trimmedEmail,
        password: loginPassword,
      });

      const userData = {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        role: response.data.role,
      };

      const savedRedirect = location.state?.redirectTo || sessionStorage.getItem("busgo_login_redirect");
      const savedState = getSavedRedirectState();
      const isAdminRole = String(response.data.role ?? "").toLowerCase() === "admin";
      const nextPath =
        isAdminRole
          ? "/admin/dashboard"
          : (savedRedirect || "/user/dashboard");

      if (savedRedirect) {
        sessionStorage.removeItem("busgo_login_redirect");
      }
      if (isAdminRole || !savedRedirect) {
        sessionStorage.removeItem("busgo_login_redirect_state");
      }

      showSuccessAndNavigate(nextPath, isAdminRole ? undefined : savedState, userData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? "Cannot reach the backend. Make sure the backend is running and restart it after recent changes."
            : "Invalid email or password.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    clearMessages();

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    const trimmedPhone = regPhone.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      document.getElementById("reg-name")?.focus();
      return;
    }
    if (trimmedName.length < 2) {
      setError("Full name must be at least 2 characters.");
      document.getElementById("reg-name")?.focus();
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      setError("Full name can only contain letters and spaces.");
      document.getElementById("reg-name")?.focus();
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      document.getElementById("reg-email")?.focus();
      return;
    }
    if (!trimmedEmail.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      document.getElementById("reg-email")?.focus();
      return;
    }

    if (!trimmedPhone) {
      setError("Please enter your phone number.");
      document.getElementById("reg-phone")?.focus();
      return;
    }
    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Phone number must be exactly 10 digits.");
      document.getElementById("reg-phone")?.focus();
      return;
    }

    if (!regPassword) {
      setError("Please create a password.");
      document.getElementById("reg-password")?.focus();
      return;
    }
    const passwordErrors = getPasswordErrors(regPassword);
    if (passwordErrors.length > 0) {
      setError(`Password must include: ${passwordErrors.join(", ")}.`);
      document.getElementById("reg-password")?.focus();
      return;
    }

    if (!regConfirm) {
      setError("Please confirm your password.");
      document.getElementById("reg-confirm")?.focus();
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Passwords do not match. Please re-enter.");
      document.getElementById("reg-confirm")?.focus();
      return;
    }

    setLoading(true);

    try {
      await api.post("/users/register", {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password: regPassword,
        role: "USER",
      });

      setRegName("");
      setRegEmail("");
      setRegPhone("");
      setRegPassword("");
      setRegConfirm("");
      setShowRegPw(false);
      setShowRegConfirm(false);
      setLoginEmail(trimmedEmail);
      setMode("login");
      setError("");
      setSuccess("Account created successfully! Please log in.");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.request
          ? "Cannot reach the backend. Make sure the backend is running and restart it after recent changes."
          : "Registration failed. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (event) => {
    event?.preventDefault();
    clearMessages();

    const trimmedEmail = fpEmail.trim();
    if (!trimmedEmail) {
      setError("Please enter your registered email address.");
      document.getElementById("fp-email")?.focus();
      return;
    }
    if (!trimmedEmail.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      document.getElementById("fp-email")?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/forgot-password", { email: trimmedEmail });
      const code = response.data.code ?? "";

      setFpCode("");
      setResetCodeHint(code);
      setMode("forgot-verify");
      setError("");
      setSuccess(
        code
          ? "Verification code generated. Use the code below to continue."
          : `Verification code sent to ${trimmedEmail}.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? "Cannot reach the backend. Make sure the backend is running and restart it after recent changes."
            : "Failed to send code.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    clearMessages();

    const trimmedCode = fpCode.trim();
    if (!trimmedCode) {
      setError("Please enter the 6-digit verification code.");
      document.getElementById("fp-code")?.focus();
      return;
    }
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Verification code must be exactly 6 digits.");
      document.getElementById("fp-code")?.focus();
      return;
    }

    setLoading(true);

    try {
      await api.post("/users/verify-code", { email: fpEmail.trim(), code: trimmedCode });
      setMode("forgot-reset");
      setError("");
      setSuccess("Code verified. Create your new password.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? "Cannot reach the backend. Make sure the backend is running and restart it after recent changes."
            : "Invalid verification code.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearMessages();

    if (!fpNewPw) {
      setError("Please enter your new password.");
      document.getElementById("fp-new-key")?.focus();
      return;
    }

    const passwordErrors = getPasswordErrors(fpNewPw);
    if (passwordErrors.length > 0) {
      setError(`Password must include: ${passwordErrors.join(", ")}.`);
      document.getElementById("fp-new-key")?.focus();
      return;
    }

    if (!fpConfirmPw) {
      setError("Please confirm your new password.");
      document.getElementById("fp-confirm-key")?.focus();
      return;
    }

    if (fpNewPw !== fpConfirmPw) {
      setError("Passwords do not match. Please re-enter.");
      document.getElementById("fp-confirm-key")?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/reset-password", {
        email: fpEmail.trim(),
        newPassword: fpNewPw,
      });

      setSuccess(response.data?.message || "Password reset successfully! Please log in.");
      setTimeout(() => {
        clearForgotPasswordState();
        switchMode("login");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? "Cannot reach the backend. Make sure the backend is running and restart it after recent changes."
            : "Failed to reset password.")
      );
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <TicketIcon />, title: "Easy Booking", desc: "Book your tickets in just a few clicks" },
    { icon: <ShieldIcon />, title: "Secure Access", desc: "One login for both admin and user accounts" },
    { icon: <ClockIcon />, title: "Always Ready", desc: "Manage bookings and schedules whenever you need" },
  ];

  return (
    <div className="auth-page">
      {loginToast && (
        <div className="login-success-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Login successful!
        </div>
      )}

      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-logo" onClick={() => { navigate("/"); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }} style={{ cursor: "pointer" }}>
            <div className="auth-logo-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="6" fill="rgba(255,255,255,0.25)" />
                <path
                  d="M5 8C5 6.9 5.9 6 7 6H17C18.1 6 19 6.9 19 8V15C19 15.6 18.6 16 18 16H17V17.5C17 17.8 16.8 18 16.5 18H15.5C15.2 18 15 17.8 15 17.5V16H9V17.5C9 17.8 8.8 18 8.5 18H7.5C7.2 18 7 17.8 7 17.5V16H6C5.4 16 5 15.6 5 15V8Z"
                  fill="white"
                />
                <rect x="7" y="8.5" width="10" height="4" rx="1" fill="rgba(255,255,255,0.3)" />
                <circle cx="8.5" cy="14.5" r="1" fill="rgba(255,255,255,0.5)" />
                <circle cx="15.5" cy="14.5" r="1" fill="rgba(255,255,255,0.5)" />
              </svg>
            </div>
            <span className="auth-logo-text">BusGo</span>
          </div>
          <p className="auth-tagline">Your Journey, Our Priority</p>
          <div className="auth-features">
            {features.map((feature) => (
              <div className="auth-feature-item" key={feature.title}>
                <div className="feature-dot">{feature.icon}</div>
                <div>
                  <p className="feature-title">{feature.title}</p>
                  <p className="feature-desc">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-right">
          {mode === "login" && (
            <div className="auth-form-wrap">
              <h2 className="auth-welcome">Welcome</h2>
              <div className="auth-tabs">
                <button className="auth-tab active">Login</button>
                <button className="auth-tab" onClick={() => switchMode("register")}>
                  Register
                </button>
              </div>
              <div className="auth-role-confirm">
                Sign in once and BusGo will take you to the correct dashboard automatically.
              </div>
              {error && <div className="auth-error">⚠️ {error}</div>}
              {success && <div className="auth-success">Success: {success}</div>}
              <form onSubmit={handleLogin} noValidate>
                <div className="auth-field">
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(event) => handleLoginEmailChange(event.target.value)}
                    onInvalid={(event) => event.preventDefault()}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <div className="pw-wrap">
                    <input
                      id="login-password"
                      type={showLoginPw ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(event) => handleLoginPasswordChange(event.target.value)}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowLoginPw((current) => !current)}>
                      {showLoginPw ? <EyeOpen /> : <EyeClosed />}
                    </button>
                  </div>
                </div>
                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
              <div className="auth-links">
                <button className="auth-link-btn" onClick={() => switchMode("forgot-email")}>
                  Forgot Password?
                </button>
                <span className="auth-link-text">
                  Don't have an account?{" "}
                  <button className="auth-link-btn inline" onClick={() => switchMode("register")}>
                    Register
                  </button>
                </span>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="auth-form-wrap">
              <h2 className="auth-welcome">Create Account</h2>
              <div className="auth-tabs">
                <button className="auth-tab" onClick={() => switchMode("login")}>
                  Login
                </button>
                <button className="auth-tab active">Register</button>
              </div>
              {error && <div className="auth-error">⚠️ {error}</div>}
              {success && <div className="auth-success">Success: {success}</div>}
              <form onSubmit={handleRegister} noValidate>
                <div className="auth-field">
                  <label htmlFor="reg-name">Full Name</label>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="John Perera"
                    value={regName}
                    onChange={(event) => handleRegNameChange(event.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="Enter your email"
                    value={regEmail}
                    onChange={(event) => handleRegEmailChange(event.target.value)}
                    onInvalid={(event) => event.preventDefault()}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-phone">Phone Number</label>
                  <input
                    id="reg-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit number"
                    maxLength={10}
                    value={regPhone}
                    onChange={(event) => handleRegPhoneChange(event.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-password">Password</label>
                  <div className="pw-wrap">
                    <input
                      id="reg-password"
                      type={showRegPw ? "text" : "password"}
                      placeholder="Create a password (min 8 chars)"
                      value={regPassword}
                      onChange={(event) => handleRegPasswordChange(event.target.value)}
                      onFocus={() => setRegConfirmActive(false)}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowRegPw((current) => !current)}>
                      {showRegPw ? <EyeOpen /> : <EyeClosed />}
                    </button>
                  </div>
                  {regPassword && !(regConfirmActive && isRegPwAllOk) && (
                    <div className="pw-requirements">
                      <span className={regPassword.length >= 8 ? "req-met" : "req-unmet"}>
                        {regPassword.length >= 8 ? "OK" : "NO"} At least 8 characters
                      </span>
                      <span className={/[0-9]/.test(regPassword) ? "req-met" : "req-unmet"}>
                        {/[0-9]/.test(regPassword) ? "OK" : "NO"} At least one number (0-9)
                      </span>
                      <span className={/[^a-zA-Z0-9]/.test(regPassword) ? "req-met" : "req-unmet"}>
                        {/[^a-zA-Z0-9]/.test(regPassword) ? "OK" : "NO"} At least one special character/symbol
                      </span>
                      <span className={/[A-Z]/.test(regPassword) ? "req-met" : "req-unmet"}>
                        {/[A-Z]/.test(regPassword) ? "OK" : "NO"} At least one uppercase letter (A-Z)
                      </span>
                      <span className={/[a-z]/.test(regPassword) ? "req-met" : "req-unmet"}>
                        {/[a-z]/.test(regPassword) ? "OK" : "NO"} At least one lowercase letter (a-z)
                      </span>
                    </div>
                  )}
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-confirm">Confirm Password</label>
                  <div className="pw-wrap">
                    <input
                      id="reg-confirm"
                      type={showRegConfirm ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={regConfirm}
                      onChange={(event) => handleRegConfirmChange(event.target.value)}
                      onFocus={() => setRegConfirmActive(true)}
                      onClick={() => setRegConfirmActive(true)}
                      className={regConfirm && regConfirm !== regPassword ? "input-mismatch" : ""}
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      onClick={() => setShowRegConfirm((current) => !current)}
                    >
                      {showRegConfirm ? <EyeOpen /> : <EyeClosed />}
                    </button>
                  </div>
                  {regConfirm && regConfirm !== regPassword && (
                    <span className="pw-mismatch-msg">⚠️ Passwords do not match.</span>
                  )}
                </div>
                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>
              <div className="auth-links">
                <span className="auth-link-text">
                  Already have an account?{" "}
                  <button className="auth-link-btn inline" onClick={() => switchMode("login")}>
                    Login
                  </button>
                </span>
              </div>
            </div>
          )}

          {mode === "forgot-email" && (
            <div className="auth-form-wrap">
              <button
                className="fp-back-btn"
                onClick={() => {
                  clearForgotPasswordState();
                  switchMode("login");
                }}
              >
                &larr; Back to Login
              </button>
              <div className="fp-icon">Mail</div>
              <h2 className="auth-welcome">Forgot Password?</h2>
              <p className="auth-welcome-sub">Enter the email linked to your account to generate a verification code.</p>
              <div className="fp-steps">
                <div className="fp-step active">
                  <span>1</span>
                </div>
                <div className="fp-step-line" />
                <div className="fp-step">
                  <span>2</span>
                </div>
                <div className="fp-step-line" />
                <div className="fp-step">
                  <span>3</span>
                </div>
              </div>
              {error && <div className="auth-error">⚠️ {error}</div>}
              {success && <div className="auth-success">Success: {success}</div>}
              <form onSubmit={handleSendCode} noValidate>
                <div className="auth-field">
                  <label htmlFor="fp-email">Email Address</label>
                  <input
                    id="fp-email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={fpEmail}
                    onChange={(event) => handleFpEmailChange(event.target.value)}
                    onInvalid={(event) => event.preventDefault()}
                  />
                </div>
                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </form>
            </div>
          )}

          {mode === "forgot-verify" && (
            <div className="auth-form-wrap">
              <button className="fp-back-btn" onClick={() => switchMode("forgot-email")}>
                &larr; Back
              </button>
              <div className="fp-icon">Code</div>
              <h2 className="auth-welcome">Enter Verification Code</h2>
              <p className="auth-welcome-sub">
                Enter the code generated for <strong>{fpEmail}</strong>.
              </p>
              <div className="fp-steps">
                <div className="fp-step done">
                  <span>OK</span>
                </div>
                <div className="fp-step-line active" />
                <div className="fp-step active">
                  <span>2</span>
                </div>
                <div className="fp-step-line" />
                <div className="fp-step">
                  <span>3</span>
                </div>
              </div>
              {resetCodeHint && (
                <div className="auth-email-note">
                  Development code:
                  <strong className="fallback-code">{resetCodeHint}</strong>
                </div>
              )}
              {error && <div className="auth-error">⚠️ {error}</div>}
              {success && <div className="auth-success">Success: {success}</div>}
              <form onSubmit={handleVerifyCode} noValidate>
                <div className="auth-field">
                  <label htmlFor="fp-code">Verification Code</label>
                  <input
                    id="fp-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    value={fpCode}
                    onChange={(event) => handleFpCodeChange(event.target.value)}
                    className="code-input"
                  />
                </div>
                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </form>
              <div className="auth-links">
                <span className="auth-link-text">
                  Need a new code?{" "}
                  <button className="auth-link-btn inline" onClick={handleResendCode}>
                    Resend
                  </button>
                </span>
              </div>
            </div>
          )}

          {mode === "forgot-reset" && (
            <div className="auth-form-wrap">
              <button className="fp-back-btn" onClick={() => switchMode("forgot-verify")}>
                &larr; Back
              </button>
              <div className="fp-icon">Lock</div>
              <h2 className="auth-welcome">Reset Password</h2>
              <p className="auth-welcome-sub">Create a strong new password for your account.</p>
              <div className="fp-steps">
                <div className="fp-step done">
                  <span>OK</span>
                </div>
                <div className="fp-step-line active" />
                <div className="fp-step done">
                  <span>OK</span>
                </div>
                <div className="fp-step-line active" />
                <div className="fp-step active">
                  <span>3</span>
                </div>
              </div>
              {error && <div className="auth-error">⚠️ {error}</div>}
              {success && <div className="auth-success">Success: {success}</div>}
              <form onSubmit={handleResetPassword} noValidate autoComplete="off">
                <div className="auth-field">
                  <label htmlFor="fp-new-key">New Password</label>
                  <div className="pw-wrap">
                    <input
                      id="fp-new-key"
                      name="fp-new-key"
                      type={isFirefox ? (showFpPw ? "text" : "password") : "text"}
                      style={!isFirefox && !showFpPw ? { WebkitTextSecurity: "disc" } : {}}
                      placeholder="Enter new password"
                      value={fpNewPw}
                      onChange={(event) => handleFpNewPwChange(event.target.value)}
                      onFocus={() => setFpConfirmActive(false)}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowFpPw((current) => !current)}>
                      {showFpPw ? <EyeOpen /> : <EyeClosed />}
                    </button>
                  </div>
                  {fpNewPw && !(fpConfirmActive && isFpNewPwAllOk) && (
                    <div className="pw-requirements">
                      <span className={fpNewPw.length >= 8 ? "req-met" : "req-unmet"}>
                        {fpNewPw.length >= 8 ? "OK" : "NO"} At least 8 characters
                      </span>
                      <span className={/[0-9]/.test(fpNewPw) ? "req-met" : "req-unmet"}>
                        {/[0-9]/.test(fpNewPw) ? "OK" : "NO"} At least one number (0-9)
                      </span>
                      <span className={/[^a-zA-Z0-9]/.test(fpNewPw) ? "req-met" : "req-unmet"}>
                        {/[^a-zA-Z0-9]/.test(fpNewPw) ? "OK" : "NO"} At least one special character/symbol
                      </span>
                      <span className={/[A-Z]/.test(fpNewPw) ? "req-met" : "req-unmet"}>
                        {/[A-Z]/.test(fpNewPw) ? "OK" : "NO"} At least one uppercase letter (A-Z)
                      </span>
                      <span className={/[a-z]/.test(fpNewPw) ? "req-met" : "req-unmet"}>
                        {/[a-z]/.test(fpNewPw) ? "OK" : "NO"} At least one lowercase letter (a-z)
                      </span>
                    </div>
                  )}
                </div>
                <div className="auth-field">
                  <label htmlFor="fp-confirm-key">Confirm New Password</label>
                  <div className="pw-wrap">
                    <input
                      id="fp-confirm-key"
                      name="fp-confirm-key"
                      type={isFirefox ? (showFpConfirmPw ? "text" : "password") : "text"}
                      style={!isFirefox && !showFpConfirmPw ? { WebkitTextSecurity: "disc" } : {}}
                      placeholder="Confirm new password"
                      value={fpConfirmPw}
                      onChange={(event) => handleFpConfirmPwChange(event.target.value)}
                      onFocus={() => setFpConfirmActive(true)}
                      onClick={() => setFpConfirmActive(true)}
                      className={fpConfirmPw && fpConfirmPw !== fpNewPw ? "input-mismatch" : ""}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-lpignore="true"
                      data-1p-ignore="true"
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      onClick={() => setShowFpConfirmPw((current) => !current)}
                    >
                      {showFpConfirmPw ? <EyeOpen /> : <EyeClosed />}
                    </button>
                  </div>
                  {fpConfirmPw && fpConfirmPw !== fpNewPw && (
                    <span className="pw-mismatch-msg">⚠️ Passwords do not match.</span>
                  )}
                </div>
                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="btn-spinner" />}
                  {loading ? "Saving..." : "Save New Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
