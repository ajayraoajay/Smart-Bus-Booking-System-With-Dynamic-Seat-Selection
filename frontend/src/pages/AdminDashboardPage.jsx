import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "../components/ConfirmationModal";
import TicketDetailsModal from "../components/TicketDetailsModal";
import api from "../services/api";
import "./AdminDashboardPage.css";

const TABS = ["All Bookings", "Schedules", "Routes"];

const sortBookingsNewestFirst = (bookingList) =>
  [...bookingList].sort((left, right) => (right.id ?? 0) - (left.id ?? 0));

const createEmptyScheduleForm = () => ({
  routeId: "",
  busNumber: "",
  totalSeats: "",
  departureTime: "",
  arrivalTime: "",
  travelDate: "",
  acType: "Non-A/C",
  busType: "Seater",
  price: "",
  boardingSelections: [],
  droppingSelections: [],
});

const createEmptyRouteForm = () => ({
  fromCity: "",
  toCity: "",
  boardingPointsText: "",
  droppingPointsText: "",
});

const normalizeTimeValue = (value) => (value ? value.substring(0, 5) : "");

const parsePointTextarea = (value) => {
  const uniquePoints = new Set();
  value
    .split(/\r?\n|,/)
    .map((point) => point.trim())
    .filter(Boolean)
    .forEach((point) => uniquePoints.add(point));
  return [...uniquePoints];
};

const formatPointTextarea = (points) => (Array.isArray(points) ? points.join("\n") : "");

const getRoutePointOptions = (route, type) => {
  if (!route) {
    return [];
  }

  return Array.isArray(route[type]) ? route[type].filter(Boolean) : [];
};

const buildStopSelections = (points, existingStops = []) => {
  const existingStopMap = new Map(
    (existingStops || [])
      .filter((stop) => stop?.point)
      .map((stop) => [stop.point, normalizeTimeValue(stop.time)])
  );

  return points.map((point) => ({
    point,
    enabled: existingStopMap.has(point),
    time: existingStopMap.get(point) ?? "",
  }));
};

const toStopPayload = (selections) =>
  selections
    .filter((selection) => selection.enabled)
    .map((selection) => ({ point: selection.point, time: selection.time }));

const formatStopsSummary = (stops) => {
  if (!Array.isArray(stops) || stops.length === 0) {
    return "—";
  }

  return stops
    .map((stop) => `${stop.point} (${normalizeTimeValue(stop.time) || "--:--"})`)
    .join(", ");
};

const getRouteLabelFromSchedule = (schedule) =>
  schedule?.route ? `${schedule.route.fromCity} -> ${schedule.route.toCity}` : "—";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout, user, darkMode, toggleDarkMode } = useAuth();

  const [activeTab, setActiveTab] = useState("All Bookings");
  const [admMenuOpen, setAdmMenuOpen] = useState(false);


  
  const [bookings, setBookings] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  
  const [searchQuery, setSearchQuery] = useState("");

  
  const [schedForm, setSchedForm] = useState(createEmptyScheduleForm);
  const [editingSchedId, setEditingSchedId] = useState(null);
  const [schedMsg, setSchedMsg] = useState("");
  const [schedErr, setSchedErr] = useState("");
  const [schedLoading, setSchedLoading] = useState(false);

  
  const [routeForm, setRouteForm] = useState(createEmptyRouteForm);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [routeMsg, setRouteMsg] = useState("");
  const [routeErr, setRouteErr] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeFieldErrors, setRouteFieldErrors] = useState({});
  const [routeSearchQuery, setRouteSearchQuery] = useState("");
  const [routePage, setRoutePage] = useState(1);

  useEffect(() => {
    if (!routeMsg) return;
    const timer = setTimeout(() => {
      setRouteMsg("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [routeMsg]);

  
  const [deleteModal, setDeleteModal] = useState(null); 
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [ticketModalBooking, setTicketModalBooking] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, sRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/routes"),
        api.get("/schedules"),
      ]);
      setBookings(sortBookingsNewestFirst(bRes.data));
      setRoutes(rRes.data);
      setSchedules(sRes.data);
    } catch (err) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  
  const activeBookings = bookings.filter(b => b.status !== "CANCELLED");
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const getStatusLabel = (status) => {
    if (status === "BOOKED") return "CONFIRMED";
    if (status === "CANCELLED") return "CANCELLED";
    return status;
  };

  const getCancelledByLabel = (cancelledBy) => {
    if (cancelledBy === "USER") return "User";
    if (cancelledBy === "ADMIN") return "Admin";
    return "—";
  };

  const getRouteLabel = (booking) => {
    if (booking?.schedule?.route) {
      return `${booking.schedule.route.fromCity} → ${booking.schedule.route.toCity}`;
    }

    return booking?.bookingId ?? "this booking";
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

    const scrollY = window.scrollY;
    try {
      setCancelLoading(true);
      const response = await api.put(`/bookings/${cancelModal.id}/cancel?cancelledBy=ADMIN`);
      setSuccess(response.data.message);
      setCancelModal(null);
      await fetchAll();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update booking status.");
    } finally {
      setCancelLoading(false);
    }
  };

  
  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.toLowerCase();
    return b.passengerName?.toLowerCase().includes(q) || b.bookingId?.toLowerCase().includes(q) || b.phoneNumber?.includes(q);
  });

  
  const selectedSchedRoute = routes.find((route) => String(route.id) === String(schedForm.routeId));
  const selectedBoardingPoints = getRoutePointOptions(selectedSchedRoute, "boardingPoints");
  const selectedDroppingPoints = getRoutePointOptions(selectedSchedRoute, "droppingPoints");

  const handleSchedChange = (e) => {
    const { name, value } = e.target;

    if (name === "routeId") {
      const nextRoute = routes.find((route) => String(route.id) === String(value));
      const nextBoardingPoints = getRoutePointOptions(nextRoute, "boardingPoints");
      const nextDroppingPoints = getRoutePointOptions(nextRoute, "droppingPoints");

      setSchedForm((currentForm) => ({
        ...currentForm,
        routeId: value,
        boardingSelections: buildStopSelections(nextBoardingPoints, toStopPayload(currentForm.boardingSelections)),
        droppingSelections: buildStopSelections(nextDroppingPoints, toStopPayload(currentForm.droppingSelections)),
      }));
      return;
    }

    setSchedForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const updateStopSelection = (type, point, field, value) => {
    const targetKey = type === "boarding" ? "boardingSelections" : "droppingSelections";

    setSchedForm((currentForm) => ({
      ...currentForm,
      [targetKey]: currentForm[targetKey].map((selection) => {
        if (selection.point !== point) {
          return selection;
        }

        if (field === "enabled") {
          return {
            ...selection,
            enabled: value,
            time: value ? selection.time : "",
          };
        }

        return {
          ...selection,
          time: value,
        };
      }),
    }));
  };

  const handleEditSched = (s) => {
    const routeBoardingPoints = getRoutePointOptions(s.route, "boardingPoints");
    const routeDroppingPoints = getRoutePointOptions(s.route, "droppingPoints");

    setEditingSchedId(s.id);
    setSchedForm({
      routeId: s.route?.id ?? "",
      busNumber: s.busNumber,
      totalSeats: s.totalSeats,
      acType: s.acType ?? "Non-A/C",
      busType: s.busType ?? "Seater",
      departureTime: normalizeTimeValue(s.departureTime),
      arrivalTime: normalizeTimeValue(s.arrivalTime),
      travelDate: s.travelDate,
      price: s.price ?? "",
      boardingSelections: buildStopSelections(routeBoardingPoints, s.boardingStops),
      droppingSelections: buildStopSelections(routeDroppingPoints, s.droppingStops),
    });
    setSchedMsg(""); setSchedErr("");
    document.getElementById("sched-form-top")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCancelSchedEdit = () => {
    setEditingSchedId(null);
    setSchedForm(createEmptyScheduleForm());
    setSchedMsg(""); setSchedErr("");
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSchedErr(""); setSchedMsg("");

    if (!schedForm.routeId || !schedForm.busNumber || !schedForm.totalSeats || !schedForm.departureTime || !schedForm.arrivalTime || !schedForm.travelDate || !schedForm.price) {
      setSchedErr("Please fill in all fields.");
      return;
    }

    const boardingStops = toStopPayload(schedForm.boardingSelections);
    const droppingStops = toStopPayload(schedForm.droppingSelections);
    if (boardingStops.length === 0 || droppingStops.length === 0) {
      setSchedErr("Please select at least one boarding point and one dropping point.");
      return;
    }

    if (boardingStops.some((stop) => !stop.time) || droppingStops.some((stop) => !stop.time)) {
      setSchedErr("Please select a time for every chosen boarding and dropping point.");
      return;
    }

    setSchedLoading(true);
    try {
      const payload = {
        routeId: Number(schedForm.routeId),
        busNumber: schedForm.busNumber,
        totalSeats: Number(schedForm.totalSeats),
        acType: schedForm.acType,
        busType: schedForm.busType,
        departureTime: schedForm.departureTime,
        arrivalTime: schedForm.arrivalTime,
        travelDate: schedForm.travelDate,
        price: Number(schedForm.price),
        boardingStops,
        droppingStops,
      };

      if (editingSchedId) {
        await api.put(`/schedules/${editingSchedId}`, payload);
        setSchedMsg("Schedule updated successfully!");
      } else {
        await api.post("/schedules", payload);
        setSchedMsg("Schedule added successfully!");
      }

      setEditingSchedId(null);
      setSchedForm(createEmptyScheduleForm());
      await fetchAll();
    } catch (err) {
      setSchedErr(err.response?.data?.message || "Failed to save schedule.");
    } finally {
      setSchedLoading(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await api.delete(`/schedules/${id}`);
      setDeleteModal(null);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete schedule.");
    }
  };

  
  const handleRouteChange = (e) => {
    const { name, value } = e.target;
    setRouteForm((prev) => ({ ...prev, [name]: value }));

    const updatedForm = { ...routeForm, [name]: value };
    const fromTrimmed = updatedForm.fromCity?.trim() || "";
    const toTrimmed = updatedForm.toCity?.trim() || "";
    const boardingPoints = parsePointTextarea(updatedForm.boardingPointsText);
    const droppingPoints = parsePointTextarea(updatedForm.droppingPointsText);

    if (routeErr) {
      let satisfied = false;
      if (name === "fromCity") {
        if (routeErr === "From city is required." && fromTrimmed) satisfied = true;
        else if (routeErr === "From city must be at least 2 characters long." && fromTrimmed.length >= 2) satisfied = true;
        else if (routeErr === "From city can only contain letters, spaces, and hyphens." && /^[a-zA-Z\s.-]+$/.test(fromTrimmed)) satisfied = true;
        else if (routeErr === "From city and To city must be different." && fromTrimmed && toTrimmed && fromTrimmed.toLowerCase() !== toTrimmed.toLowerCase()) satisfied = true;
        else if (routeErr.includes("already exists")) {
          const routeAlreadyExists = routes.some(
            (r) =>
              (!editingRouteId || String(r.id) !== String(editingRouteId)) &&
              r.fromCity?.trim().toLowerCase() === fromTrimmed.toLowerCase() &&
              r.toCity?.trim().toLowerCase() === toTrimmed.toLowerCase()
          );
          if (!routeAlreadyExists) satisfied = true;
        }
      } else if (name === "toCity") {
        if (routeErr === "To city is required." && toTrimmed) satisfied = true;
        else if (routeErr === "To city must be at least 2 characters long." && toTrimmed.length >= 2) satisfied = true;
        else if (routeErr === "To city can only contain letters, spaces, and hyphens." && /^[a-zA-Z\s.-]+$/.test(toTrimmed)) satisfied = true;
        else if (routeErr === "From city and To city must be different." && fromTrimmed && toTrimmed && fromTrimmed.toLowerCase() !== toTrimmed.toLowerCase()) satisfied = true;
        else if (routeErr.includes("already exists")) {
          const routeAlreadyExists = routes.some(
            (r) =>
              (!editingRouteId || String(r.id) !== String(editingRouteId)) &&
              r.fromCity?.trim().toLowerCase() === fromTrimmed.toLowerCase() &&
              r.toCity?.trim().toLowerCase() === toTrimmed.toLowerCase()
          );
          if (!routeAlreadyExists) satisfied = true;
        }
      } else if (name === "boardingPointsText") {
        if (routeErr === "Please enter at least one boarding point." && boardingPoints.length > 0) satisfied = true;
        else if (routeErr === "Each boarding point must be at least 2 characters long." && boardingPoints.length > 0 && !boardingPoints.some((p) => p.length < 2)) satisfied = true;
      } else if (name === "droppingPointsText") {
        if (routeErr === "Please enter at least one dropping point." && droppingPoints.length > 0) satisfied = true;
        else if (routeErr === "Each dropping point must be at least 2 characters long." && droppingPoints.length > 0 && !droppingPoints.some((p) => p.length < 2)) satisfied = true;
      }

      if (satisfied) {
        setRouteErr("");
      }
    }

    if (routeFieldErrors[name]) {
      setRouteFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        if (name === "fromCity" && next.toCity === "From city and To city must be different.") {
          delete next.toCity;
        }
        if (name === "toCity" && next.fromCity === "From city and To city must be different.") {
          delete next.fromCity;
        }
        delete next.duplicate;
        return next;
      });
    }
  };

  const handleEditRoute = (r) => {
    setEditingRouteId(r.id);
    setRouteForm({
      fromCity: r.fromCity,
      toCity: r.toCity,
      boardingPointsText: formatPointTextarea(getRoutePointOptions(r, "boardingPoints")),
      droppingPointsText: formatPointTextarea(getRoutePointOptions(r, "droppingPoints")),
    });
    setRouteMsg("");
    setRouteErr("");
    setRouteFieldErrors({});
    document.getElementById("route-form-top")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCancelRouteEdit = () => {
    setEditingRouteId(null);
    setRouteForm(createEmptyRouteForm());
    setRouteMsg("");
    setRouteErr("");
    setRouteFieldErrors({});
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setRouteErr("");
    setRouteMsg("");

    const errors = {};
    const fromTrimmed = routeForm.fromCity?.trim() || "";
    const toTrimmed = routeForm.toCity?.trim() || "";
    const boardingText = routeForm.boardingPointsText?.trim() || "";
    const droppingText = routeForm.droppingPointsText?.trim() || "";

    // 1. From City validation
    if (!fromTrimmed) {
      errors.fromCity = "From city is required.";
    } else if (fromTrimmed.length < 2) {
      errors.fromCity = "From city must be at least 2 characters long.";
    } else if (!/^[a-zA-Z\s.-]+$/.test(fromTrimmed)) {
      errors.fromCity = "From city can only contain letters, spaces, and hyphens.";
    }

    // 2. To City validation
    if (!toTrimmed) {
      errors.toCity = "To city is required.";
    } else if (toTrimmed.length < 2) {
      errors.toCity = "To city must be at least 2 characters long.";
    } else if (!/^[a-zA-Z\s.-]+$/.test(toTrimmed)) {
      errors.toCity = "To city can only contain letters, spaces, and hyphens.";
    }

    // 3. From City and To City must be different
    if (fromTrimmed && toTrimmed && !errors.fromCity && !errors.toCity) {
      if (fromTrimmed.toLowerCase() === toTrimmed.toLowerCase()) {
        const diffMsg = "From city and To city must be different.";
        errors.fromCity = diffMsg;
        errors.toCity = diffMsg;
      }
    }

    // 4. Duplicate route check
    if (fromTrimmed && toTrimmed && !errors.fromCity && !errors.toCity) {
      const routeAlreadyExists = routes.some(
        (r) =>
          (!editingRouteId || String(r.id) !== String(editingRouteId)) &&
          r.fromCity?.trim().toLowerCase() === fromTrimmed.toLowerCase() &&
          r.toCity?.trim().toLowerCase() === toTrimmed.toLowerCase()
      );
      if (routeAlreadyExists) {
        errors.duplicate = `Route from "${fromTrimmed}" to "${toTrimmed}" already exists.`;
      }
    }

    // 5. Boarding Points validation
    const boardingPoints = parsePointTextarea(routeForm.boardingPointsText);
    if (!boardingText || boardingPoints.length === 0) {
      errors.boardingPointsText = "Please enter at least one boarding point.";
    } else if (boardingPoints.some((p) => p.length < 2)) {
      errors.boardingPointsText = "Each boarding point must be at least 2 characters long.";
    }

    // 6. Dropping Points validation
    const droppingPoints = parsePointTextarea(routeForm.droppingPointsText);
    if (!droppingText || droppingPoints.length === 0) {
      errors.droppingPointsText = "Please enter at least one dropping point.";
    } else if (droppingPoints.some((p) => p.length < 2)) {
      errors.droppingPointsText = "Each dropping point must be at least 2 characters long.";
    }

    if (Object.keys(errors).length > 0) {
      setRouteFieldErrors(errors);
      const primaryMsg =
        errors.fromCity ||
        errors.toCity ||
        errors.duplicate ||
        errors.boardingPointsText ||
        errors.droppingPointsText ||
        "Please correct the errors in the form.";
      setRouteErr(primaryMsg);

      let focusFieldName = null;
      if (errors.fromCity) {
        focusFieldName = "fromCity";
      } else if (errors.toCity) {
        focusFieldName = "toCity";
      } else if (errors.duplicate) {
        focusFieldName = "fromCity";
      } else if (errors.boardingPointsText) {
        focusFieldName = "boardingPointsText";
      } else if (errors.droppingPointsText) {
        focusFieldName = "droppingPointsText";
      }

      if (focusFieldName) {
        const el = document.querySelector(`[name="${focusFieldName}"]`);
        if (el) el.focus();
      } else {
        document.getElementById("route-form-top")?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    setRouteFieldErrors({});
    setRouteLoading(true);
    try {
      const payload = {
        fromCity: fromTrimmed,
        toCity: toTrimmed,
        boardingPoints,
        droppingPoints,
      };

      if (editingRouteId) {
        await api.put(`/routes/${editingRouteId}`, payload);
        setRouteMsg("Route updated successfully!");
      } else {
        await api.post("/routes", payload);
        setRouteMsg("Route added successfully!");
      }

      setEditingRouteId(null);
      setRouteForm(createEmptyRouteForm());
      await fetchAll();
    } catch (err) {
      setRouteErr(err.response?.data?.message || "Failed to save route.");
    } finally {
      setRouteLoading(false);
    }
  };

  const ROUTES_PER_PAGE = 10;
  const filteredRoutes = routes.filter((r) => {
    const q = routeSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const from = (r.fromCity || "").toLowerCase();
    const to = (r.toCity || "").toLowerCase();
    return from.includes(q) || to.includes(q) || `${from} -> ${to}`.includes(q) || `${from} to ${to}`.includes(q);
  });
  const totalRoutePages = Math.max(1, Math.ceil(filteredRoutes.length / ROUTES_PER_PAGE));
  const safeRoutePage = Math.min(routePage, totalRoutePages);
  const routeStartIndex = (safeRoutePage - 1) * ROUTES_PER_PAGE;
  const paginatedRoutes = filteredRoutes.slice(routeStartIndex, routeStartIndex + ROUTES_PER_PAGE);

  const handleDeleteRoute = async (id) => {
    try {
      await api.delete(`/routes/${id}`);
      setDeleteModal(null);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete route.");
    }
  };

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div className="adm-page">

      
      <div className="adm-topbar">
        <div className="adm-topbar-main">
          <div className="adm-topbar-left" onClick={() => { navigate("/admin/dashboard"); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }} style={{ cursor: "pointer" }} title="Go to Admin Dashboard">
            <div className="adm-logo-icon">
              <svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#2563EB"/><path d="M5 8C5 6.9 5.9 6 7 6H17C18.1 6 19 6.9 19 8V15C19 15.6 18.6 16 18 16H17V17.5C17 17.8 16.8 18 16.5 18H15.5C15.2 18 15 17.8 15 17.5V16H9V17.5C9 17.8 8.8 18 8.5 18H7.5C7.2 18 7 17.8 7 17.5V16H6C5.4 16 5 15.6 5 15V8Z" fill="white"/><rect x="7" y="8.5" width="10" height="4" rx="1" fill="#2563EB"/><circle cx="8.5" cy="14.5" r="1" fill="#2563EB"/><circle cx="15.5" cy="14.5" r="1" fill="#2563EB"/></svg>
            </div>
            <span className="adm-logo-text">BusGo</span>
          </div>

          <div className="adm-topbar-center">
            <h1 className="adm-title">Admin Dashboard</h1>
            <p className="adm-subtitle">Manage bookings and routes</p>
          </div>
          <div className="adm-topbar-right">
            <button className="adm-theme-toggle" onClick={toggleDarkMode} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {darkMode ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>
            <div className="adm-desktop-actions">
              <button className="adm-change-pw-btn" onClick={() => navigate("/admin/change-password")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Change Password</span>
              </button>
              <button className="adm-logout-btn" onClick={handleLogout}>Logout</button>
            </div>
            <button
              className={`adm-hamburger ${admMenuOpen ? "open" : ""}`}
              onClick={() => setAdmMenuOpen(!admMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <span /><span /><span />
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

      <div className="adm-body">

        
        <div className="adm-stats">
          <div className="adm-stat-card">
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total Revenue</span>
              <span className="adm-stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M6 3h12" />
                  <path d="M6 8h12" />
                  <path d="m6 13 8.5 8" />
                  <path d="M6 13h3" />
                  <path d="M9 13c6.667 0 6.667-10 0-10" />
                </svg>
              </span>
            </div>
            <p className="adm-stat-value green">₹{totalRevenue.toLocaleString()}</p>
            <p className="adm-stat-meta">From {activeBookings.length} bookings</p>
          </div>
          <div className="adm-stat-card">
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total Passengers</span>
              <span className="adm-stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></span>
            </div>
            <p className="adm-stat-value blue">{activeBookings.length}</p>
            <p className="adm-stat-meta">Seats booked</p>
          </div>
          <div className="adm-stat-card">
            <div className="adm-stat-top">
              <span className="adm-stat-label">Active Routes</span>
              <span className="adm-stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <circle cx="6" cy="19" r="3" />
                  <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                  <circle cx="18" cy="5" r="3" />
                </svg>
              </span>
            </div>
            <p className="adm-stat-value purple">{routes.length}</p>
            <p className="adm-stat-meta">Available destinations</p>
          </div>
          <div className="adm-stat-card">
            <div className="adm-stat-top">
              <span className="adm-stat-label">Schedules</span>
              <span className="adm-stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            </div>
            <p className="adm-stat-value orange">{schedules.length}</p>
            <p className="adm-stat-meta">Total trips</p>
          </div>
        </div>

        
        <div className="adm-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`adm-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>

        {loading && <div className="adm-loading"><div className="adm-spinner"/><p>Loading...</p></div>}
        {error && <div className="adm-error">⚠️ {error}</div>}
        {success && <div className="adm-form-success">✅ {success}</div>}

        
        {activeTab === "All Bookings" && !loading && (
          <div className="adm-panel">
            <div className="adm-panel-header">
              <h2>Booking Management</h2>
              <p>View instantly confirmed and cancelled passenger bookings</p>
            </div>
            <div className="adm-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search by name, booking ID, or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {filteredBookings.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-icon">📋</div><p>No bookings found.</p></div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table adm-bookings-table">
                  <thead><tr><th>Starting Point</th><th>Dropping Point</th><th>Journey Date</th><th className="adm-bookings-hidden-col">Route</th><th className="adm-bookings-hidden-col">Bus</th><th className="adm-bookings-hidden-col">Date</th><th className="adm-bookings-hidden-col">Seat</th><th className="adm-bookings-hidden-col">Paid</th><th className="adm-bookings-hidden-col">Refund</th><th className="adm-bookings-hidden-col">Cancelled By</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredBookings.map(b => (
                      <tr key={b.id}>
                        <td>{b.schedule?.route?.fromCity ?? "-"}</td>
                        <td>{b.schedule?.route?.toCity ?? "-"}</td>
                        <td>{b.schedule?.travelDate ?? "-"}</td>
                        <td>{b.schedule?.route ? `${b.schedule.route.fromCity} → ${b.schedule.route.toCity}` : "—"}</td>
                        <td>
                          <div style={{display:"flex", alignItems:"center", gap:"6px"}}>
                            {b.schedule?.busNumber ?? "—"}
                            <span className={b.schedule?.acType === "A/C" ? "ac-badge-adm ac-yes-adm" : "ac-badge-adm ac-no-adm"}>
                              {b.schedule?.acType === "A/C" ? "A/C" : "Non-A/C"}
                            </span>
                          </div>
                        </td>
                        <td>{b.schedule?.travelDate ?? "—"}</td>
                        <td>
                          <span className="adm-seat-badge">
                            {b.seatNumbers && b.seatNumbers.trim() !== ""
                              ? b.seatNumbers.split(",").map(s => `#${s.trim()}`).join(", ")
                              : b.seatNumber ? `#${b.seatNumber}` : "—"}
                          </span>
                        </td>
                        <td>Rs. {(b.totalPrice || 0).toLocaleString()}</td>
                        <td>{b.status === "CANCELLED" ? `Rs. ${((b.refundAmount ?? 0)).toLocaleString()}` : "—"}</td>
                        <td>{getCancelledByLabel(b.cancelledBy)}</td>
                        <td><span className={`adm-status adm-status-${b.status?.toLowerCase()}`}>{getStatusLabel(b.status)}</span></td>
                        <td>
                          <div className="adm-action-btns">
                            <button className="adm-btn-view" onClick={() => setTicketModalBooking(b)}>View Ticket</button>
                            {b.status !== "CANCELLED" && (
                              <button className="adm-btn-cancel" onClick={() => openCancelModal(b)}>Cancel</button>
                            )}
                            {b.status === "CANCELLED" && (
                              <span className="adm-cancel-note">
                                {b.cancelledBy === "ADMIN" ? "Refunded by admin" : "Refund processed"}
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
          </div>
        )}

        
        {activeTab === "Schedules" && !loading && (
          <div className="adm-panel">
            <div className="adm-panel-header">
              <h2>Schedule Management</h2>
              <p>Add, edit and delete bus schedules</p>
            </div>

            
            <div className="adm-form-card" id="sched-form-top">
              <h3 className="adm-form-title">{editingSchedId ? "✏️ Edit Schedule" : "➕ Add New Schedule"}</h3>
              {schedErr && <div className="adm-form-error">⚠️ {schedErr}</div>}
              {schedMsg && <div className="adm-form-success">✅ {schedMsg}</div>}
              <form onSubmit={handleSaveSchedule} className="adm-form-grid">
                <div className="adm-field">
                  <label>Route</label>
                  <select name="routeId" value={schedForm.routeId} onChange={handleSchedChange}>
                    <option value="">Select a route</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.fromCity} → {r.toCity}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label>Bus Number</label>
                  <input name="busNumber" type="text" placeholder="e.g. NB-4578" value={schedForm.busNumber} onChange={handleSchedChange} />
                </div>
                <div className="adm-field">
                  <label>Total Seats</label>
                  <input name="totalSeats" type="number" placeholder="e.g. 40" value={schedForm.totalSeats} onChange={handleSchedChange} min="1" />
                </div>

                <div className="adm-field">
                  <label>Departure Time</label>
                  <input name="departureTime" type="time" value={schedForm.departureTime} onChange={handleSchedChange} />
                </div>
                <div className="adm-field">
                  <label>Arrival Time</label>
                  <input name="arrivalTime" type="time" value={schedForm.arrivalTime} onChange={handleSchedChange} />
                </div>
                <div className="adm-field adm-field-full">
                  <p className="adm-inline-note">Duration will be calculated automatically from departure and arrival time.</p>
                </div>
                <div className="adm-field">
                  <label>Travel Date</label>
                  <input name="travelDate" type="date" value={schedForm.travelDate} onChange={handleSchedChange} min={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="adm-field">
                  <label>A/C Type</label>
                  <select name="acType" value={schedForm.acType} onChange={handleSchedChange}>
                    <option value="Non-A/C">Non-A/C</option>
                    <option value="A/C">A/C</option>
                  </select>
                </div>
                <div className="adm-field">
                  <label>Bus Layout</label>
                  <select name="busType" value={schedForm.busType} onChange={handleSchedChange}>
                    <option value="Seater">Seater</option>
                    <option value="Sleeper">Sleeper</option>
                  </select>
                </div>
                <div className="adm-field">
                  <label>Price per Seat (Rs.)</label>
                  <input name="price" type="number" placeholder="e.g. 500" value={schedForm.price} onChange={handleSchedChange} min="0" />
                </div>
                <div className="adm-field adm-field-full">
                  <label>Boarding Points and Times</label>
                  {selectedBoardingPoints.length === 0 ? (
                    <p className="adm-inline-note">Add boarding points to this route first.</p>
                  ) : (
                    <div className="adm-stop-grid">
                      {schedForm.boardingSelections.map((selection) => (
                        <div key={`boarding-${selection.point}`} className={`adm-stop-card ${selection.enabled ? "active" : ""}`}>
                          <label className="adm-stop-toggle">
                            <input
                              type="checkbox"
                              checked={selection.enabled}
                              onChange={(event) => updateStopSelection("boarding", selection.point, "enabled", event.target.checked)}
                            />
                            <span>{selection.point}</span>
                          </label>
                          <input
                            type="time"
                            value={selection.time}
                            disabled={!selection.enabled}
                            onChange={(event) => updateStopSelection("boarding", selection.point, "time", event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="adm-field adm-field-full">
                  <label>Dropping Points and Times</label>
                  {selectedDroppingPoints.length === 0 ? (
                    <p className="adm-inline-note">Add dropping points to this route first.</p>
                  ) : (
                    <div className="adm-stop-grid">
                      {schedForm.droppingSelections.map((selection) => (
                        <div key={`dropping-${selection.point}`} className={`adm-stop-card ${selection.enabled ? "active" : ""}`}>
                          <label className="adm-stop-toggle">
                            <input
                              type="checkbox"
                              checked={selection.enabled}
                              onChange={(event) => updateStopSelection("dropping", selection.point, "enabled", event.target.checked)}
                            />
                            <span>{selection.point}</span>
                          </label>
                          <input
                            type="time"
                            value={selection.time}
                            disabled={!selection.enabled}
                            onChange={(event) => updateStopSelection("dropping", selection.point, "time", event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="adm-field adm-field-full adm-form-actions">
                  <button type="submit" className="adm-submit-btn" disabled={schedLoading}>
                    {schedLoading ? "Saving..." : editingSchedId ? "Update Schedule" : "Add Schedule"}
                  </button>
                  {editingSchedId && (
                    <button type="button" className="adm-cancel-edit-btn" onClick={handleCancelSchedEdit}>Cancel Edit</button>
                  )}
                </div>
              </form>
            </div>

            
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Route</th><th>Bus Details</th><th>Travel Date</th><th>Departure</th><th>Arrival</th><th>Duration</th><th>Boarding Stops</th><th>Dropping Stops</th><th>Total Seats</th><th>Price/Seat</th><th>Actions</th></tr></thead>
                <tbody>
                  {schedules.map(s => (
                    <tr key={s.id}>
                      <td>{s.route ? `${s.route.fromCity} → ${s.route.toCity}` : "—"}</td>
                      <td>
                        <div className="adm-bus-pill-row">
                          <span className="adm-booking-id">{s.busNumber}</span>
                          <span className={s.acType === "A/C" ? "ac-badge-adm ac-yes-adm" : "ac-badge-adm ac-no-adm"}>
                            {s.acType === "A/C" ? "A/C" : "Non-A/C"}
                          </span>
                          <span className={s.busType === "Sleeper" ? "adm-layout-badge adm-layout-sleeper" : "adm-layout-badge adm-layout-seater"}>
                            {s.busType || "Seater"}
                          </span>
                        </div>
                      </td>
                      <td>{s.travelDate}</td>
                      <td>{normalizeTimeValue(s.departureTime) || "—"}</td>
                      <td>{normalizeTimeValue(s.arrivalTime) || "—"}</td>
                      <td>{s.duration || "—"}</td>
                      <td>{formatStopsSummary(s.boardingStops)}</td>
                      <td>{formatStopsSummary(s.droppingStops)}</td>
                      <td>{s.totalSeats}</td>
                      <td><strong>Rs. {(s.price ?? 0).toLocaleString()}</strong></td>
                      <td>
                        <div className="adm-action-btns">
                          <button className="adm-btn-edit" onClick={() => handleEditSched(s)}>Edit</button>
                          <button className="adm-btn-delete" onClick={() => setDeleteModal({ type: "schedule", id: s.id, label: `${s.busNumber} on ${s.travelDate}` })}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {activeTab === "Routes" && !loading && (
          <div className="adm-panel">
            <div className="adm-panel-header">
              <h2>Route Management</h2>
              <p>Add, edit and delete bus routes</p>
            </div>

            
            <div className="adm-form-card" id="route-form-top">
              <h3 className="adm-form-title">{editingRouteId ? "✏️ Edit Route" : "➕ Add New Route"}</h3>
              {routeErr && <div className="adm-form-error">⚠️ {routeErr}</div>}
              {routeMsg && <div className="adm-form-success">✅ {routeMsg}</div>}
              <form onSubmit={handleSaveRoute} className="adm-form-grid">
                <div className="adm-field">
                  <label>From City</label>
                  <input
                    name="fromCity"
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={routeForm.fromCity}
                    onChange={handleRouteChange}
                  />
                </div>
                <div className="adm-field">
                  <label>To City</label>
                  <input
                    name="toCity"
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={routeForm.toCity}
                    onChange={handleRouteChange}
                  />
                </div>

                <div className="adm-field adm-field-full">
                  <label>Boarding Points</label>
                  <textarea
                    name="boardingPointsText"
                    placeholder={"Enter one boarding point per line\nExample:\nMajestic\nTumkur Road"}
                    value={routeForm.boardingPointsText}
                    onChange={handleRouteChange}
                    rows={4}
                  />
                </div>
                <div className="adm-field adm-field-full">
                  <label>Dropping Points</label>
                  <textarea
                    name="droppingPointsText"
                    placeholder={"Enter one dropping point per line\nExample:\nSilk Board\nElectronic City"}
                    value={routeForm.droppingPointsText}
                    onChange={handleRouteChange}
                    rows={4}
                  />
                </div>
                <div className="adm-field adm-field-full adm-form-actions">
                  <button type="submit" className="adm-submit-btn" disabled={routeLoading}>
                    {routeLoading ? "Saving..." : editingRouteId ? "Update Route" : "Add Route"}
                  </button>
                  {editingRouteId && (
                    <button type="button" className="adm-cancel-edit-btn" onClick={handleCancelRouteEdit}>Cancel Edit</button>
                  )}
                </div>
              </form>
            </div>

            {/* Search Box on top of table */}
            <div className="adm-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search routes by from or to city..."
                value={routeSearchQuery}
                onChange={(e) => {
                  setRouteSearchQuery(e.target.value);
                  setRoutePage(1);
                }}
              />
              {routeSearchQuery && (
                <button
                  type="button"
                  className="adm-search-clear"
                  onClick={() => {
                    setRouteSearchQuery("");
                    setRoutePage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {filteredRoutes.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">🗺️</div>
                <p>{routeSearchQuery ? `No routes found matching "${routeSearchQuery}".` : "No routes available."}</p>
              </div>
            ) : (
              <>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Boarding Points</th>
                        <th>Dropping Points</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRoutes.map((r) => (
                        <tr key={r.id}>
                          <td>{r.fromCity}</td>
                          <td>{r.toCity}</td>
                          <td>{getRoutePointOptions(r, "boardingPoints").join(", ") || "—"}</td>
                          <td>{getRoutePointOptions(r, "droppingPoints").join(", ") || "—"}</td>
                          <td>
                            <div className="adm-action-btns">
                              <button className="adm-btn-edit" onClick={() => handleEditRoute(r)}>
                                Edit
                              </button>
                              <button
                                className="adm-btn-delete"
                                onClick={() =>
                                  setDeleteModal({
                                    type: "route",
                                    id: r.id,
                                    label: `${r.fromCity} → ${r.toCity}`,
                                  })
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination (10 rows per page) */}
                <div className="adm-pagination">
                  <div className="adm-pagination-info">
                    Showing {filteredRoutes.length === 0 ? 0 : routeStartIndex + 1} to{" "}
                    {Math.min(routeStartIndex + ROUTES_PER_PAGE, filteredRoutes.length)} of {filteredRoutes.length} routes
                  </div>
                  {totalRoutePages > 1 && (
                    <div className="adm-pagination-controls">
                      <button
                        type="button"
                        className="adm-page-btn"
                        disabled={safeRoutePage <= 1}
                        onClick={() => setRoutePage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalRoutePages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalRoutePages <= 7 ||
                          p === 1 ||
                          p === totalRoutePages ||
                          Math.abs(p - safeRoutePage) <= 1
                        ) {
                          return (
                            <button
                              key={p}
                              type="button"
                              className={`adm-page-btn ${safeRoutePage === p ? "active" : ""}`}
                              onClick={() => setRoutePage(p)}
                            >
                              {p}
                            </button>
                          );
                        } else if (
                          p === safeRoutePage - 2 ||
                          p === safeRoutePage + 2
                        ) {
                          return (
                            <span key={p} className="adm-page-ellipsis">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      <button
                        type="button"
                        className="adm-page-btn"
                        disabled={safeRoutePage >= totalRoutePages}
                        onClick={() => setRoutePage((p) => Math.min(totalRoutePages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      
      {deleteModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal">
            <div className="adm-modal-icon">🗑️</div>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{deleteModal.label}</strong>? This action cannot be undone.</p>
            <div className="adm-modal-actions">
              <button className="adm-modal-cancel" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="adm-modal-confirm" onClick={() => deleteModal.type === "schedule" ? handleDeleteSchedule(deleteModal.id) : handleDeleteRoute(deleteModal.id)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={!!cancelModal}
        icon="🗑️"
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
  );
}
