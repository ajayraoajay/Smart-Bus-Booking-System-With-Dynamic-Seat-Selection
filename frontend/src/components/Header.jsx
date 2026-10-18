import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const { user, isAdmin, isLoggedIn, logout, darkMode, toggleDarkMode } = useAuth();

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  const handleLogoClick = () => {
    navigate("/");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className="header" ref={headerRef}>
      {/* Mobile Backdrop for outside clicks */}
      {menuOpen && <div className="header-backdrop" onClick={() => setMenuOpen(false)} />}
      
      <div className="header-logo" onClick={handleLogoClick}>
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <span className="logo-text">BusGo</span>
      </div>

      {/* Navigation Links */}
      <nav className={`header-nav ${menuOpen ? "open" : ""}`}>
        {navLinks.map((link) => (
          <a
            key={link.path}
            className={`nav-link ${location.pathname === link.path ? "active" : ""}`}
            onClick={() => { navigate(link.path); setMenuOpen(false); }}
          >
            {link.label}
          </a>
        ))}

        {/* Mobile-only action items */}
        <div className="header-mobile-actions">
          {/* Switch button with dark mode and light mode text ABOVE login/signup button */}
          <button
            className="mobile-theme-switch-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle theme mode"
          >
            <div className="mobile-theme-switch-left">
              {darkMode ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <div className={`theme-switch-pill ${darkMode ? "active" : ""}`}>
              <span className="theme-switch-thumb" />
            </div>
          </button>

          {isAdmin && (
            <button className="btn-admin" onClick={() => { navigate("/admin/dashboard"); setMenuOpen(false); }}>
              🛡️ Admin Panel
            </button>
          )}

          {isLoggedIn ? (
            <>
              <div className="header-mobile-user-row">
                <span className="header-username">👤 {user.name}</span>
              </div>
              {!isAdmin && (
                <button className="btn-dashboard" onClick={() => { navigate("/user/dashboard"); setMenuOpen(false); }}>
                  Dashboard
                </button>
              )}
              <button className="btn-outline mobile-auth-btn" onClick={() => { logout(); navigate("/"); setMenuOpen(false); }}>
                Logout
              </button>
            </>
          ) : (
            <button className="btn-outline mobile-auth-btn" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15M10 17L15 12L10 7M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </nav>

      {/* Action Buttons (Desktop) */}
      <div className="header-actions">
        {/* Theme button same as in admin dashboard to left of Login / Sign Up or User actions */}
        <button
          className="header-theme-toggle"
          onClick={toggleDarkMode}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          )}
          <span>{darkMode ? "Light" : "Dark"}</span>
        </button>

        {isAdmin && (
          <button className="btn-admin" onClick={() => navigate("/admin/dashboard")}>
            🛡️ Admin Panel
          </button>
        )}

        {isLoggedIn ? (
          <div className="header-user">
            {!isAdmin && (
              <button className="btn-dashboard" onClick={() => navigate("/user/dashboard")}>
                Dashboard
              </button>
            )}
            <span className="header-username">👤 {user.name}</span>
            <button className="btn-outline" onClick={() => { logout(); navigate("/"); }}>
              Logout
            </button>
          </div>
        ) : (
          <button className="btn-outline" onClick={() => navigate("/login")}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15M10 17L15 12L10 7M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Login / Sign Up
          </button>
        )}
      </div>

      {/* Mobile Right Controls - Hamburger toggles between Menu and Close X icon */}
      <div className="header-mobile-controls">
        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

