import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../pages/AdminDashboardPage.css";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const { logout, darkMode, toggleDarkMode } = useAuth();
  const [admMenuOpen, setAdmMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="adm-topbar">
      <div className="adm-topbar-main">
        <div
          className="adm-topbar-left"
          onClick={() => {
            navigate("/admin/dashboard");
            window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          }}
          style={{ cursor: "pointer" }}
          title="Go to Admin Dashboard"
        >
          <div className="adm-logo-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="#2563EB" />
              <path
                d="M5 8C5 6.9 5.9 6 7 6H17C18.1 6 19 6.9 19 8V15C19 15.6 18.6 16 18 16H17V17.5C17 17.8 16.8 18 16.5 18H15.5C15.2 18 15 17.8 15 17.5V16H9V17.5C9 17.8 8.8 18 8.5 18H7.5C7.2 18 7 17.8 7 17.5V16H6C5.4 16 5 15.6 5 15V8Z"
                fill="white"
              />
              <rect x="7" y="8.5" width="10" height="4" rx="1" fill="#2563EB" />
              <circle cx="8.5" cy="14.5" r="1" fill="#2563EB" />
              <circle cx="15.5" cy="14.5" r="1" fill="#2563EB" />
            </svg>
          </div>
          <span className="adm-logo-text">BusGo</span>
        </div>

        <div className="adm-topbar-right">
          <button
            className="adm-theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
            <span>{darkMode ? "Light" : "Dark"}</span>
          </button>

          <div className="adm-desktop-actions">
            <button
              className="adm-change-pw-btn"
              onClick={() => navigate("/admin/change-password")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Change Password</span>
            </button>
            <button className="adm-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <button
            className={`adm-hamburger ${admMenuOpen ? "open" : ""}`}
            onClick={() => setAdmMenuOpen(!admMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {admMenuOpen && (
        <div className="adm-mobile-menu">
          <button
            className="adm-mobile-menu-item"
            onClick={() => {
              setAdmMenuOpen(false);
              navigate("/admin/change-password");
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Change Password</span>
          </button>
          <button
            className="adm-mobile-menu-item logout"
            onClick={() => {
              setAdmMenuOpen(false);
              handleLogout();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
