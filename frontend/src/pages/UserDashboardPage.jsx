import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "../components/ConfirmationModal";
import TicketDetailsModal from "../components/TicketDetailsModal";
import { getBookingDisplayStatus } from "./AdminDashboardPage";
import api from "../services/api";
import "./UserDashboardPage.css";

const sortBookingsNewestFirst = (bookingList) =>
  [...bookingList].sort((left, right) => (right.id ?? 0) - (left.id ?? 0));

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const { user, logout, darkMode, toggleDarkMode } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [ticketModalBooking, setTicketModalBooking] = useState(null);

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const fetchUserBookings = async () => {
    try {
      let userBookings = [];

      if (user?.id) {
        try {
          const res = await api.get(`/bookings/user/${user.id}`);
          userBookings = res.data;
        } catch {
          const response = await api.get("/bookings");
          userBookings = response.data.filter((booking) => {
            if (user?.phone) {
              return booking.phoneNumber === user.phone;
            }

            return booking.passengerName?.toLowerCase().trim() === user?.name?.toLowerCase().trim();
          });
        }
      } else {
        const response = await api.get("/bookings");
        userBookings = response.data.filter((booking) => {
          if (user?.phone) {
            return booking.phoneNumber === user.phone;
          }

          return booking.passengerName?.toLowerCase().trim() === user?.name?.toLowerCase().trim();
        });
      }

      setBookings(sortBookingsNewestFirst(userBookings));
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
      const response = await api.put(`/bookings/${cancelModal.id}/cancel?cancelledBy=USER`);
      setSuccess(response.data.message);
      setCancelModal(null);
      await fetchUserBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel booking.");
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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const confirmedCount = bookings.filter((booking) => booking.status === "BOOKED" || booking.status === "PARTIALLY CANCELLED").length;
  const cancelledCount = bookings.filter((booking) => booking.status === "CANCELLED").length;
  const totalPaid = bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .reduce((sum, booking) => sum + (booking.totalPrice || 0) - (booking.refundAmount || 0), 0);

  return (
    <div className={`udp-page ${darkMode ? "udp-dark" : ""}`}>
      <div className="udp-header">
        <div className="udp-header-left" onClick={() => { navigate("/user/dashboard"); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }} style={{ cursor: "pointer" }} title="Go to User Dashboard">
          <div className="udp-logo-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="#2563EB" />
              <path d="M5 8C5 6.9 5.9 6 7 6H17C18.1 6 19 6.9 19 8V15C19 15.6 18.6 16 18 16H17V17.5C17 17.8 16.8 18 16.5 18H15.5C15.2 18 15 17.8 15 17.5V16H9V17.5C9 17.8 8.8 18 8.5 18H7.5C7.2 18 7 17.8 7 17.5V16H6C5.4 16 5 15.6 5 15V8Z" fill="white" />
              <rect x="7" y="8.5" width="10" height="4" rx="1" fill="#2563EB" />
              <circle cx="8.5" cy="14.5" r="1" fill="#2563EB" />
              <circle cx="15.5" cy="14.5" r="1" fill="#2563EB" />
            </svg>
          </div>
          <span className="udp-logo-text">BusGo</span>
        </div>

        <nav className="udp-nav">
          <button onClick={() => navigate("/")}>Home</button>
          <button onClick={() => navigate("/about")}>About</button>
          <button onClick={() => navigate("/contact")}>Contact</button>
          <button className="udp-nav-active" onClick={() => navigate("/user/dashboard")}>Dashboard</button>

          <div className="udp-profile-wrap">
            <button className="udp-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
              Profile
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {profileOpen && (
              <div className="udp-dropdown">
                <button onClick={() => { navigate("/user/profile"); setProfileOpen(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Update Profile
                </button>
                <button onClick={() => { navigate("/user/change-password"); setProfileOpen(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Change Password
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="udp-header-right">
          <button className="udp-theme-toggle" onClick={toggleDarkMode} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <div className="udp-desktop-actions">
            <button className="udp-buy-btn" onClick={() => navigate("/")}>Buy Tickets</button>
            <div className="udp-user-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{user?.name}</span>
            </div>
            <button className="udp-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
          <button
            className={`udp-hamburger ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="udp-mobile-menu">
            <button className="udp-mobile-item" onClick={() => { setMobileMenuOpen(false); navigate("/"); }}>Home</button>
            <button className="udp-mobile-item" onClick={() => { setMobileMenuOpen(false); navigate("/about"); }}>About</button>
            <button className="udp-mobile-item" onClick={() => { setMobileMenuOpen(false); navigate("/contact"); }}>Contact</button>
            <button className="udp-mobile-item active" onClick={() => { setMobileMenuOpen(false); navigate("/user/dashboard"); }}>Dashboard</button>
            <div className="udp-mobile-divider" />
            <button className="udp-mobile-item" onClick={() => { setMobileMenuOpen(false); navigate("/user/profile"); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Update Profile
            </button>
            <button className="udp-mobile-item" onClick={() => { setMobileMenuOpen(false); navigate("/user/change-password"); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Change Password
            </button>
            <button className="udp-mobile-item udp-mobile-buy" onClick={() => { setMobileMenuOpen(false); navigate("/"); }}>
              Buy Tickets
            </button>
            <div className="udp-mobile-divider" />
            <div className="udp-mobile-user-row">
              <span className="udp-mobile-username">👤 {user?.name}</span>
              <button className="udp-mobile-logout" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="udp-hero">
        <h1>Dashboard</h1>
      </div>

      <div className="udp-body">
        <div className="udp-refresh-row">
          <button className="udp-refresh-btn" onClick={fetchUserBookings}>
            Refresh Bookings
          </button>
        </div>

        {success && <div className="udp-success">{success}</div>}

        <div className="udp-stats">
          <div className="udp-stat-card udp-stat-green">
            <div className="udp-stat-left">
              <p className="udp-stat-label">Confirmed Tickets</p>
              <p className="udp-stat-value">{confirmedCount}</p>
            </div>
            <div className="udp-stat-icon udp-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>

          <div className="udp-stat-card udp-stat-red">
            <div className="udp-stat-left">
              <p className="udp-stat-label">Cancelled Tickets</p>
              <p className="udp-stat-value">{cancelledCount}</p>
            </div>
            <div className="udp-stat-icon udp-icon-red">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>

          <div className="udp-stat-card udp-stat-yellow">
            <div className="udp-stat-left">
              <p className="udp-stat-label">Total Paid</p>
              <p className="udp-stat-value">Rs. {totalPaid.toLocaleString()}</p>
            </div>
            <div className="udp-stat-icon udp-icon-yellow">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="udp-loading">
            <div className="udp-spinner" />
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="udp-error">{error}</div>
        ) : (
          <div className="udp-table-wrap">
            <table className="udp-table">
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Starting Point</th>
                  <th>Dropping Point</th>
                  <th>Journey Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="udp-empty-cell">
                      No booked tickets found. Book your first ticket using the <strong>Buy Tickets</strong> button above!
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const displayStatus = getBookingDisplayStatus(booking);
                    const statusClass =
                      displayStatus === "CANCELLED"
                        ? "udp-status-cancelled"
                        : displayStatus === "PARTIALLY CANCELLED"
                        ? "udp-status-partially-cancelled"
                        : displayStatus === "COMPLETED"
                        ? "udp-status-completed"
                        : "udp-status-booked";

                    return (
                      <tr key={booking.id}>
                        <td>{booking.schedule?.route?.fromCity ?? "-"}</td>
                        <td>{booking.schedule?.route?.toCity ?? "-"}</td>
                        <td>{booking.schedule?.travelDate ?? "-"}</td>
                        <td>
                          <span className={`udp-status ${statusClass}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td>
                          <div className="udp-action-btns">
                            <button
                              type="button"
                              className="udp-btn-view"
                              onClick={() => setTicketModalBooking(booking)}
                            >
                              View Ticket
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={!!cancelModal}
        icon="X"
        title="Confirm Cancellation"
        message={`Are you sure you want to cancel ${cancelModal ? getRouteLabel(cancelModal) : "this booking"}?`}
        note="30% cancellation charges apply. Only 70% of the amount will be refunded."
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
        role="USER"
        onBookingUpdated={(updated) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          );
          setTicketModalBooking((prev) =>
            prev && prev.id === updated.id ? { ...prev, ...updated } : prev
          );
        }}
        emailFallback={user?.email ?? "-"}
        onClose={() => setTicketModalBooking(null)}
      />
    </div>
  );
}
