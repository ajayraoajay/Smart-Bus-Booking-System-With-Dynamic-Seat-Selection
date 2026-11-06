import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import TicketDetailsModal from "../components/TicketDetailsModal";
import api from "../services/api";
import {
  getBookingDisplayStatus,
  isBookingBoardingPassed,
} from "./AdminDashboardPage";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const BOOKINGS_PER_PAGE = 10;

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    setBookingPage(1);
  }, [searchQuery]);

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

  const getRouteLabel = (booking) => {
    if (booking?.schedule?.route) {
      return `${booking.schedule.route.fromCity} -> ${booking.schedule.route.toCity}`;
    }

    return booking?.bookingId ?? "this booking";
  };

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const userName = (b.user?.name || b.userName || "").toLowerCase();
    const userEmail = (b.email || b.user?.email || b.userEmail || "").toLowerCase();
    const phone = (b.phoneNumber || b.user?.phone || "").toLowerCase();
    const bookingId = (b.bookingId || "").toLowerCase();
    const scheduleCustomId = (b.schedule?.scheduleId || "").toLowerCase();
    const scheduleNumId = String(b.schedule?.id ?? "").toLowerCase();
    const passengerName = (b.passengerName || "").toLowerCase();

    return (
      userName.includes(q) ||
      userEmail.includes(q) ||
      phone.includes(q) ||
      bookingId.includes(q) ||
      scheduleCustomId.includes(q) ||
      scheduleNumId === q ||
      passengerName.includes(q)
    );
  });

  const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE));
  const safeBookingPage = Math.min(bookingPage, totalBookingPages);
  const bookingStartIndex = (safeBookingPage - 1) * BOOKINGS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(
    bookingStartIndex,
    bookingStartIndex + BOOKINGS_PER_PAGE
  );

  return (
    <div className="abp-page">
      <div className="abp-shell">
        <div className="abp-top-action-bar">
          <div
            className="abp-brand"
            onClick={() => { navigate("/admin/dashboard"); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
            title="Go to Admin Dashboard"
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

        <div className="abp-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by user name, email, booking ID, or schedule ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {searchQuery && (
            <button
              type="button"
              className="abp-search-clear"
              onClick={() => {
                setSearchQuery("");
                setBookingPage(1);
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {loading && <p className="abp-empty-text">Loading bookings...</p>}
        {error && <p className="abp-error-text">{error}</p>}
        {success && <p className="abp-empty-text" style={{ color: "#15803d", marginBottom: "1rem" }}>{success}</p>}

        {!loading && filteredBookings.length === 0 && (
          <p className="abp-empty-text">
            {searchQuery ? `No bookings found matching "${searchQuery}".` : "No bookings found."}
          </p>
        )}

        {!loading && filteredBookings.length > 0 && (
          <>
            <div className="abp-table-wrapper abp-bookings-wrap">
              <table className="abp-booking-table">
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Route</th>
                    <th>Journey Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking) => {
                    const displayStatus = getBookingDisplayStatus(booking);
                    const canCancel =
                      booking.status !== "CANCELLED" &&
                      !isBookingBoardingPassed(booking);
                    const userName =
                      booking.user?.name ||
                      booking.userName ||
                      booking.passengerName ||
                      "-";
                    const userEmail =
                      booking.email ||
                      booking.user?.email ||
                      booking.userEmail ||
                      "-";
                    const phoneNumber =
                      booking.phoneNumber || booking.user?.phone || "-";
                    const routeLabel = booking.schedule?.route
                      ? `${booking.schedule.route.fromCity} → ${booking.schedule.route.toCity}`
                      : "-";
                    const journeyDate = booking.schedule?.travelDate ?? "-";

                    return (
                      <tr key={booking.id}>
                        <td className="abp-booking-name-cell">{userName}</td>
                        <td className="abp-booking-email-cell">{userEmail}</td>
                        <td className="abp-booking-phone-cell">{phoneNumber}</td>
                        <td className="abp-booking-route-cell">{routeLabel}</td>
                        <td>{journeyDate}</td>
                        <td>
                          <span
                            className={
                              displayStatus === "CANCELLED"
                                ? "abp-status abp-status-cancelled"
                                : displayStatus === "Completed" || displayStatus === "COMPLETED"
                                ? "abp-status abp-status-completed"
                                : "abp-status abp-status-booked"
                            }
                          >
                            {displayStatus}
                          </span>
                        </td>
                        <td>
                          <div className="abp-action-group">
                            <button
                              type="button"
                              className="abp-view-btn"
                              onClick={() => setTicketModalBooking(booking)}
                            >
                              View Ticket
                            </button>

                            {canCancel && (
                              <button
                                type="button"
                                className="abp-cancel-btn"
                                onClick={() => openCancelModal(booking)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination (10 rows per page) */}
            <div className="abp-pagination">
              <div className="abp-pagination-info">
                Showing {filteredBookings.length === 0 ? 0 : bookingStartIndex + 1} to{" "}
                {Math.min(bookingStartIndex + BOOKINGS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} bookings
              </div>
              {totalBookingPages > 1 && (
                <div className="abp-pagination-controls">
                  <button
                    type="button"
                    className="abp-page-btn"
                    disabled={safeBookingPage <= 1}
                    onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalBookingPages }, (_, i) => i + 1).map((p) => {
                    if (
                      totalBookingPages <= 7 ||
                      p === 1 ||
                      p === totalBookingPages ||
                      Math.abs(p - safeBookingPage) <= 1
                    ) {
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`abp-page-btn ${safeBookingPage === p ? "active" : ""}`}
                          onClick={() => setBookingPage(p)}
                        >
                          {p}
                        </button>
                      );
                    } else if (
                      p === safeBookingPage - 2 ||
                      p === safeBookingPage + 2
                    ) {
                      return (
                        <span key={p} className="abp-page-ellipsis">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <button
                    type="button"
                    className="abp-page-btn"
                    disabled={safeBookingPage >= totalBookingPages}
                    onClick={() => setBookingPage((p) => Math.min(totalBookingPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
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
