import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminNavbar from "../components/AdminNavbar";
import UserNavbar from "../components/UserNavbar";
import "./NotFoundPage.css";

export default function NotFoundPage({ role: propRole }) {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin } = useAuth();

  const effectiveRole = propRole || (isLoggedIn ? (isAdmin ? "admin" : "user") : "guest");
  const isAdminPanel = effectiveRole === "admin";
  const isUserPanel = effectiveRole === "user";

  const handleAction = () => {
    if (isAdminPanel) {
      navigate("/admin/dashboard");
    } else {
      navigate("/");
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const getButtonText = () => {
    if (isAdminPanel) {
      return "Return to Dashboard";
    }
    return "Return to Home";
  };

  return (
    <div className="not-found-page-wrapper">
      {isAdminPanel && <AdminNavbar />}
      {isUserPanel && <UserNavbar />}

      <main className="not-found-content-container">
        <h1 className="not-found-title">Oops!</h1>

        <div className="not-found-image-wrap">
          <img
            src="/images/404.png"
            alt="Page not found"
            className="not-found-image"
            onError={(e) => {
              e.currentTarget.src =
                "https://assets.airtel.in/static-assets/selfcare/images/404/group-158@2x.png";
            }}
          />
        </div>

        <h2 className="not-found-message">
          Page you are looking for could not be found.
        </h2>

        <button className="not-found-action-btn" onClick={handleAction}>
          {getButtonText()}
        </button>
      </main>
    </div>
  );
}
