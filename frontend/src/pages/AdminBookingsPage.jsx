import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import TicketDetailsModal from "../components/TicketDetailsModal";
import api from "../services/api";
import "./AdminBookingsPage.css";

const sortBookingsNewestFirst = (bookingList) =>
  [...bookingList].sort((left, right) => (right.id ?? 0) - (left.id ?? 0));

function AdminBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [ticketModalBooking, setTicketModalBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get("/bookings");
      setBookings(sortBookingsNewestFirst(response.data));
    } catch (err) {
      setError("Failed to load bookings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (booking) => {
    setError("");
    setSuccess("");
    setCancelModal(booking);
  };

  const handleCancelBooking = async () => {
    if (!cancelModal) {
      return;
    }

    try {
      setCancelLoading(true);
      const response = await api.put(`/bookings/${cancelModal.id}/cancel?cancelledBy=ADMIN`);
      setSuccess(response.data.message);
      setCancelModal(null);
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel booking.");
      console.error(err);
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    if (status === "BOOKED") {
      return "CONFIRMED";
    }

    if (status === "CANCELLED") {
      return "CANCELLED";
    }

    return status;
  };

  const getRouteLabel = (booking) => {
    if (booking?.schedule?.route) {
      return `${booking.schedule.route.fromCity} -> ${booking.schedule.route.toCity}`;
    }

    return booking?.bookingId ?? "this booking";
  };

  return (
    <div className="abp-page">
      <div className="abp-shell">
        <div className="abp-top-action-bar">
          <div
            className="abp-brand"
            onClick={() => { navigate("/"); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
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
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1e3a8a" }}>BusGo</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="abp-secondary-btn" onClick={() => navigate("/admin/dashboard")}>
              Admin Dashboard
            </button>
            <button className="abp-secondary-btn" onClick={() => navigate("/admin/schedules")}>
              Add Schedule
            </button>
          </div>
        </div>

        <h1 className="abp-title">Admin - All Bookings</h1>
        <p className="abp-subtitle">View instant bookings in a simpler summary table and open full ticket details when needed.</p>

        {loading && <p className="abp-empty-text">Loading bookings...</p>}
        {error && <p className="abp-error-text">{error}</p>}
        {success && <p className="abp-empty-text" style={{ color: "#15803d", marginBottom: "1rem" }}>{success}</p>}

        {!loading && bookings.length === 0 && (
          <p className="abp-empty-text">No bookings found.</p>
        )}

        {!loading && bookings.length > 0 && (
          <div className="abp-table-wrapper">
            <table className="abp-booking-table">
              <thead>
                <tr>
                  <th>Starting Point</th>
                  <th>Dropping Point</th>
                  <th>Journey Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.schedule?.route?.fromCity ?? "-"}</td>
                    <td>{booking.schedule?.route?.toCity ?? "-"}</td>
                    <td>{booking.schedule?.travelDate ?? "-"}</td>
                    <td>
                      <span
                        className={
                          booking.status === "BOOKED"
                            ? "abp-status abp-status-booked"
                            : "abp-status abp-status-cancelled"
                        }
                      >
                        {getStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td>
                      <div className="abp-action-group">
                        <button
                          className="abp-view-btn"
                          onClick={() => setTicketModalBooking(booking)}
                        >
                          View Ticket
                        </button>

                        {booking.status !== "CANCELLED" ? (
                          <button
                            className="abp-cancel-btn"
                            onClick={() => openCancelModal(booking)}
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="abp-cancelled-label">
                            {booking.cancelledBy === "ADMIN" ? "Refunded by admin" : "Refund processed"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmationModal
          open={!!cancelModal}
          icon="X"
          title="Confirm Cancellation"
          message={`Are you sure you want to cancel ${cancelModal ? getRouteLabel(cancelModal) : "this booking"}?`}
          note="This cancellation is being done by admin, so 100% of the amount will be refunded."
          cancelLabel="Cancel"
          confirmLabel="Yes, Cancel"
          confirmVariant="danger"
          loading={cancelLoading}
          onCancel={() => !cancelLoading && setCancelModal(null)}
          onConfirm={handleCancelBooking}
        />

        <TicketDetailsModal
          open={!!ticketModalBooking}
          booking={ticketModalBooking}
          onClose={() => setTicketModalBooking(null)}
        />
      </div>
    </div>
  );
}

export default AdminBookingsPage;
