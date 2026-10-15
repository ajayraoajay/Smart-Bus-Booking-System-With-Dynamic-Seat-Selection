import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./SchedulePage.css";

const formatTimeValue = (value) => (value ? value.substring(0, 5) : "—");

const getBusLayoutLabel = (busType) => (busType === "Sleeper" ? "Sleeper" : "Seater");
const isTodayOrFuture = (travelDate) => {
  if (!travelDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduleDate = new Date(`${travelDate}T00:00:00`);
  return !Number.isNaN(scheduleDate.getTime()) && scheduleDate >= today;
};

export default function SchedulePage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await api.get(`/schedules/route/${routeId}`);
        setSchedules(response.data.filter((schedule) => isTodayOrFuture(schedule.travelDate)));
      } catch (err) {
        setError("Failed to load schedules.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [routeId]);

  const handleBookNow = (scheduleId) => {
    if (isAdmin) {
      navigate("/admin/dashboard");
      return;
    }

    if (!isLoggedIn) {
      navigate("/login", { state: { redirectTo: `/booking/${scheduleId}` } });
      return;
    }

    navigate(`/booking/${scheduleId}`);
  };

  return (
    <div className="schedule-page">
      <div className="schedule-page-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          &larr; Back to Routes
        </button>
        <div className="schedule-page-title">
          <h1>Available Schedules</h1>
          <p>Choose a bus schedule for your selected route</p>
        </div>
      </div>

      <div className="schedule-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading schedules...</p>
          </div>
        )}

        {error && <div className="error-banner">Warning: {error}</div>}

        {!loading && !error && schedules.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">Bus</div>
            <h3>No Schedules Found</h3>
            <p>There are no schedules available for this route at the moment.</p>
            <button className="back-btn-sm" onClick={() => navigate("/")}>Back</button>
          </div>
        )}

        <div className="schedule-grid">
          {schedules.map((schedule) => (
            <div className="schedule-card" key={schedule.id}>
              <div className="schedule-card-top">
                <div className="schedule-bus-badge">
                  Bus {schedule.busNumber}
                </div>
                <div className="schedule-card-badges">
                  <span className={schedule.acType === "A/C" ? "ac-badge ac-yes" : "ac-badge ac-no"}>
                    {schedule.acType === "A/C" ? "A/C" : "Non-A/C"}
                  </span>
                  <span className={getBusLayoutLabel(schedule.busType) === "Sleeper" ? "layout-badge layout-badge-sleeper" : "layout-badge layout-badge-seater"}>
                    {getBusLayoutLabel(schedule.busType)}
                  </span>
                </div>
              </div>

              <div className="schedule-details">
                <div className="schedule-detail-row">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">{schedule.travelDate}</span>
                </div>
                <div className="schedule-detail-row">
                  <span className="detail-label">Departure</span>
                  <span className="detail-value">{formatTimeValue(schedule.departureTime)}</span>
                </div>
                <div className="schedule-detail-row">
                  <span className="detail-label">Arrival</span>
                  <span className="detail-value">{formatTimeValue(schedule.arrivalTime)}</span>
                </div>
                <div className="schedule-detail-row">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{schedule.duration || "—"}</span>
                </div>
                <div className="schedule-detail-row">
                  <span className="detail-label">Bus Layout</span>
                  <span className="detail-value">{getBusLayoutLabel(schedule.busType)}</span>
                </div>
                <div className="schedule-detail-row">
                  <span className="detail-label">Total Seats</span>
                  <span className="detail-value">{schedule.totalSeats}</span>
                </div>
              </div>

              <button className="book-now-btn" onClick={() => handleBookNow(schedule.id)}>
                Book Now &rarr;
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
