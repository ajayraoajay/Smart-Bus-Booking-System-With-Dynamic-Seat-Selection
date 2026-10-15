import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./UserProfilePage.css";

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    if (phone && !/^\d{10}$/.test(phone)) { setError("Phone must be 10 digits."); return; }

    setLoading(true);
    try {
      await api.put(`/users/${user.id}/profile`, { name, email, phone });
      
      login({ ...user, name, email, phone });
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upp-page">
      <div
        className="upp-header-logo"
        onClick={() => { navigate("/"); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "1.5rem",
          justifyContent: "center",
        }}
        title="Go to Home"
      >
        <div style={{ width: "36px", height: "36px" }}>
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
        <span style={{ fontSize: "1.4rem", fontWeight: "800", color: "#1e3a8a" }}>BusGo</span>
      </div>
      <div className="upp-card">
        
        <button className="upp-back" onClick={() => navigate("/user/dashboard")}>
          ← Back to Dashboard
        </button>

        
        <div className="upp-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="40" height="40">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h2 className="upp-title">Update Profile</h2>
        <p className="upp-subtitle">Update your personal information</p>

        {error   && <div className="upp-error">⚠️ {error}</div>}
        {success && <div className="upp-success">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="upp-form">
          <div className="upp-field">
            <label>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="upp-field">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="upp-field">
            <label>Phone Number</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" maxLength={10} />
          </div>

          <div className="upp-actions">
            <button type="submit" className="upp-save-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="upp-cancel-btn" onClick={() => navigate("/user/dashboard")}>
              Cancel
            </button>
          </div>
        </form>

        
        <div className="upp-links">
          <button onClick={() => navigate("/user/change-password")}>🔒 Change Password</button>
        </div>
      </div>
    </div>
  );
}
