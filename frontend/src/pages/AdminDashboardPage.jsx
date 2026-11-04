import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "../components/ConfirmationModal";
import TicketDetailsModal from "../components/TicketDetailsModal";
import api from "../services/api";
import "./AdminDashboardPage.css";

const TABS = ["All Bookings", "Schedules", "Routes"];

const sortBookingsNewestFirst = (bookingList) =>
  [...bookingList].sort((left, right) => (right.id ?? 0) - (left.id ?? 0));

const sortRoutesNewestFirst = (routeList) =>
  [...routeList].sort((left, right) => (Number(right.id) || 0) - (Number(left.id) || 0));

const sortSchedulesNewestFirst = (scheduleList) =>
  [...scheduleList].sort((left, right) => (Number(right.id) || 0) - (Number(left.id) || 0));

export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLocalTimeString = (d = new Date()) => {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const checkDepartureTimeValidation = (departureTime, travelDate) => {
  if (!departureTime || !travelDate) return null;
  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (travelDate === todayStr) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minRequiredMinutes = currentMinutes + 15;
    const currentTimeStr = getLocalTimeString(now);

    if (minRequiredMinutes >= 24 * 60) {
      return `Departure time cannot be scheduled for today as it must be at least 15 minutes after current time (${currentTimeStr}). Please select tomorrow or a later date.`;
    }

    const [depH, depM] = departureTime.split(":").map(Number);
    if (!isNaN(depH) && !isNaN(depM)) {
      const depMinutes = depH * 60 + depM;
      if (depMinutes < minRequiredMinutes) {
        return `Departure time must be at least 15 minutes after current time (${currentTimeStr}) when travel date is today.`;
      }
    }
  }

  return null;
};

export const getMinArrivalTime = (departureTime) => {
  if (!departureTime) return "";
  const parts = departureTime.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return "";
  let [hours, minutes] = parts;
  minutes += 1;
  if (minutes >= 60) {
    minutes = 0;
    hours += 1;
  }
  if (hours >= 24) {
    return "23:59";
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const calculateScheduleDuration = (departureTime, arrivalTime, arrivalDay = 1) => {
  if (!departureTime || !arrivalTime) return "";
  const depParts = departureTime.split(":").map(Number);
  const arrParts = arrivalTime.split(":").map(Number);
  if (depParts.length < 2 || arrParts.length < 2) return "";
  const [depH, depM] = depParts;
  const [arrH, arrM] = arrParts;
  if (isNaN(depH) || isNaN(depM) || isNaN(arrH) || isNaN(arrM)) return "";

  const day = Math.max(1, parseInt(arrivalDay, 10) || 1);
  const depMinutes = depH * 60 + depM;
  const arrMinutes = arrH * 60 + arrM;

  let totalMinutes;
  if (day > 1) {
    totalMinutes = (day - 1) * 24 * 60 + (arrMinutes - depMinutes);
  } else {
    if (arrMinutes <= depMinutes) {
      return "";
    }
    totalMinutes = arrMinutes - depMinutes;
  }

  if (totalMinutes <= 0) return "";

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (mins === 0) return `${hours}h`;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

export const getScheduleStatus = (schedule, now = new Date()) => {
  if (!schedule || !schedule.travelDate || !schedule.departureTime) {
    return "Scheduled";
  }

  const dateParts = String(schedule.travelDate).split("-").map(Number);
  if (dateParts.length < 3 || dateParts.some(isNaN)) {
    return "Scheduled";
  }
  const [y, m, d] = dateParts;

  const depParts = String(schedule.departureTime).split(":").map(Number);
  if (depParts.length < 2 || depParts.some(isNaN)) {
    return "Scheduled";
  }
  const [depH, depM] = depParts;
  const depDateTime = new Date(y, m - 1, d, depH, depM, 0, 0);

  if (now.getTime() < depDateTime.getTime()) {
    return "Scheduled";
  }

  if (!schedule.arrivalTime) {
    return "Completed";
  }

  const arrParts = String(schedule.arrivalTime).split(":").map(Number);
  if (arrParts.length < 2 || arrParts.some(isNaN)) {
    return "Completed";
  }
  const [arrH, arrM] = arrParts;

  let arrivalDay = parseInt(schedule.arrivalDay, 10) || 1;
  let dayOffset = Math.max(0, arrivalDay - 1);
  if (dayOffset === 0 && (arrH < depH || (arrH === depH && arrM < depM))) {
    dayOffset = 1;
  }

  const arrDateTime = new Date(y, m - 1, d + dayOffset, arrH, arrM, 0, 0);

  if (now.getTime() < arrDateTime.getTime()) {
    return "Ongoing";
  } else {
    return "Completed";
  }
};

const createEmptyScheduleForm = () => ({
  routeId: "",
  busNumber: "",
  totalSeats: "",
  departureTime: "",
  arrivalDay: "1",
  arrivalTime: "",
  travelDate: "",
  acType: "Non-A/C",
  busType: "Seater",
  price: "",
  boardingSelections: [],
  droppingSelections: [],
});

function RouteSearchSelect({
  value,
  onChange,
  routes = [],
  placeholder = "Search route by city name...",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedRoute = useMemo(
    () => routes.find((r) => String(r.id) === String(value)),
    [routes, value]
  );

  const [query, setQuery] = useState(
    selectedRoute ? `${selectedRoute.fromCity} → ${selectedRoute.toCity}` : ""
  );

  useEffect(() => {
    if (selectedRoute) {
      setQuery(`${selectedRoute.fromCity} → ${selectedRoute.toCity}`);
    } else {
      setQuery("");
    }
  }, [selectedRoute]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (selectedRoute) {
          setQuery(`${selectedRoute.fromCity} → ${selectedRoute.toCity}`);
        } else {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedRoute]);

  const filteredRoutes = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return routes;
    return routes.filter((r) => {
      const from = (r.fromCity || "").toLowerCase();
      const to = (r.toCity || "").toLowerCase();
      return (
        from.includes(trimmed) ||
        to.includes(trimmed) ||
        `${from} -> ${to}`.includes(trimmed) ||
        `${from} → ${to}`.includes(trimmed) ||
        `${from} to ${to}`.includes(trimmed)
      );
    });
  }, [routes, query]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    setIsOpen(true);

    const match = routes.find(
      (r) =>
        `${r.fromCity} → ${r.toCity}`.toLowerCase() === text.trim().toLowerCase() ||
        `${r.fromCity} -> ${r.toCity}`.toLowerCase() === text.trim().toLowerCase()
    );
    if (match) {
      onChange(String(match.id));
    } else if (value) {
      onChange("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const trimmed = query.trim();
      if (!trimmed) return;
      e.preventDefault();
      if (filteredRoutes.length > 0) {
        handleSelect(filteredRoutes[0]);
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleSelect = (r) => {
    setQuery(`${r.fromCity} → ${r.toCity}`);
    onChange(String(r.id));
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    onChange("");
    setIsOpen(true);
  };

  return (
    <div className={`adm-route-search-wrap ${isOpen ? "open" : ""}`} ref={containerRef}>
      <input
        type="text"
        className="adm-route-search-input"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        disabled={disabled}
        autoComplete="off"
      />
      {query && !disabled && (
        <button
          type="button"
          className="adm-route-clear-btn"
          onClick={handleClear}
          title="Clear route"
        >
          ×
        </button>
      )}
      <button
        type="button"
        className="adm-route-toggle-btn"
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        title="Toggle route options"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <ul className="adm-route-dropdown-list">
          {filteredRoutes.length > 0 ? (
            filteredRoutes.map((r) => {
              const isSelected = String(r.id) === String(value);
              return (
                <li
                  key={r.id}
                  className={`adm-route-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(r)}
                >
                  <span className="adm-route-item-name">{r.fromCity} → {r.toCity}</span>
                  {isSelected && <span className="adm-route-check-mark">✓</span>}
                </li>
              );
            })
          ) : (
            <li className="adm-route-dropdown-empty">No matching route found</li>
          )}
        </ul>
      )}
    </div>
  );
}

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
  const [schedMsg, setSchedMsg] = useState("");
  const [schedErr, setSchedErr] = useState("");
  const [schedLoading, setSchedLoading] = useState(false);
  const [confirmSchedModal, setConfirmSchedModal] = useState(null);
  const [priceEditModal, setPriceEditModal] = useState(null);
  const [viewDetailsSchedule, setViewDetailsSchedule] = useState(null);
  const [priceEditLoading, setPriceEditLoading] = useState(false);
  const [priceEditErr, setPriceEditErr] = useState("");

  useEffect(() => {
    if (!schedMsg) return;
    const timer = setTimeout(() => {
      setSchedMsg("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [schedMsg]);

  const [, setCurrentTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  
  const [routeForm, setRouteForm] = useState(createEmptyRouteForm);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [routeMsg, setRouteMsg] = useState("");
  const [routeErr, setRouteErr] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeFieldErrors, setRouteFieldErrors] = useState({});
  const [routeSearchQuery, setRouteSearchQuery] = useState("");
  const [routePage, setRoutePage] = useState(1);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");
  const [schedulePage, setSchedulePage] = useState(1);

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
      setRoutes(sortRoutesNewestFirst(rRes.data));
      setSchedules(sortSchedulesNewestFirst(sRes.data));
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

  const handleSchedChange = (e) => {
    const { name, value } = e.target;
    const todayStr = getLocalDateString();

    // Dynamic error clearing when condition is satisfied (matching routes tab behavior)
    if (schedErr) {
      let satisfied = false;

      if (name === "routeId") {
        if (schedErr === "Please select a route." && value) {
          satisfied = true;
        }
      } else if (name === "busNumber") {
        const trimmed = value.trim();
        if (schedErr === "Bus number is required." && trimmed) {
          satisfied = true;
        } else if (schedErr === "Bus number must be at least 3 characters long." && trimmed.length >= 3) {
          satisfied = true;
        }
      } else if (name === "totalSeats") {
        const num = Number(value);
        if (schedErr === "Total seats is required." && value.trim() !== "") {
          satisfied = true;
        } else if (
          schedErr === "Total seats must be at least 1." &&
          value.trim() !== "" &&
          !isNaN(num) &&
          num >= 1 &&
          Number.isInteger(num)
        ) {
          satisfied = true;
        }
      } else if (name === "departureTime") {
        if (schedErr === "Departure time is required." && value) {
          satisfied = true;
        } else if (schedErr.includes("Arrival time must be after departure time")) {
          if (schedForm.arrivalTime && value && schedForm.arrivalTime > value) {
            satisfied = true;
          }
        } else if (
          schedErr.includes("Departure time must be at least 15 minutes") ||
          schedErr.includes("Departure time cannot be scheduled for today")
        ) {
          const depTimeErr = checkDepartureTimeValidation(value, schedForm.travelDate);
          if (!depTimeErr) {
            satisfied = true;
          }
        }
      } else if (name === "arrivalDay") {
        const dayNum = parseInt(value, 10);
        if (schedErr === "Arrival day is required." && value.trim() !== "") {
          satisfied = true;
        } else if (schedErr === "Arrival day must be 1 or greater." && !isNaN(dayNum) && dayNum >= 1) {
          satisfied = true;
        } else if (schedErr.includes("Arrival time must be after departure time")) {
          if (!isNaN(dayNum) && dayNum > 1) {
            satisfied = true;
          }
        }
      } else if (name === "arrivalTime") {
        if (schedErr === "Arrival time is required." && value) {
          satisfied = true;
        } else if (schedErr.includes("Arrival time must be after departure time")) {
          const arrDay = parseInt(schedForm.arrivalDay, 10);
          if (arrDay > 1 || (schedForm.departureTime && value > schedForm.departureTime)) {
            satisfied = true;
          }
        }
      } else if (name === "travelDate") {
        if (schedErr === "Travel date is required." && value) {
          satisfied = true;
        } else if (schedErr === "Travel date cannot be in the past." && value >= todayStr) {
          satisfied = true;
        } else if (
          schedErr.includes("Departure time must be at least 15 minutes") ||
          schedErr.includes("Departure time cannot be scheduled for today")
        ) {
          const depTimeErr = checkDepartureTimeValidation(schedForm.departureTime, value);
          if (!depTimeErr) {
            satisfied = true;
          }
        }
      } else if (name === "price") {
        const pNum = Number(value);
        if (schedErr === "Price per seat is required." && value.trim() !== "") {
          satisfied = true;
        } else if (
          (schedErr === "Price per seat must be 0 or greater." || schedErr === "Price must be 0 or greater.") &&
          value.trim() !== "" &&
          !isNaN(pNum) &&
          pNum >= 0
        ) {
          satisfied = true;
        }
      }

      if (satisfied) {
        setSchedErr("");
      }
    }

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

    if (name === "departureTime") {
      if (schedForm.travelDate) {
        const depTimeErr = checkDepartureTimeValidation(value, schedForm.travelDate);
        if (depTimeErr) {
          setSchedErr(depTimeErr);
        } else if (
          schedErr &&
          (schedErr.includes("Departure time must be at least 15 minutes") ||
            schedErr.includes("Departure time cannot be scheduled for today"))
        ) {
          setSchedErr("");
        }
      }

      setSchedForm((currentForm) => {
        let nextArrivalTime = currentForm.arrivalTime;
        if (!value) {
          nextArrivalTime = "";
        } else if (Number(currentForm.arrivalDay) === 1 && nextArrivalTime) {
          if (nextArrivalTime <= value) {
            nextArrivalTime = "";
          }
        }
        return {
          ...currentForm,
          departureTime: value,
          arrivalTime: nextArrivalTime,
        };
      });
      return;
    }

    if (name === "arrivalDay") {
      if (value === "") {
        setSchedForm((currentForm) => ({ ...currentForm, arrivalDay: "", arrivalTime: "" }));
        return;
      }
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        setSchedForm((currentForm) => ({ ...currentForm, arrivalDay: value, arrivalTime: "" }));
        return;
      }
      setSchedForm((currentForm) => {
        let nextArrivalTime = currentForm.arrivalTime;
        if (num === 1 && currentForm.departureTime && nextArrivalTime) {
          if (nextArrivalTime <= currentForm.departureTime) {
            nextArrivalTime = "";
          }
        }
        return {
          ...currentForm,
          arrivalDay: String(num),
          arrivalTime: nextArrivalTime,
        };
      });
      return;
    }

    if (name === "arrivalTime") {
      const arrDayNum = parseInt(schedForm.arrivalDay, 10);
      if (arrDayNum === 1 && schedForm.departureTime && value) {
        if (value <= schedForm.departureTime) {
          setSchedErr(`Arrival time must be after departure time (${schedForm.departureTime}) and before 00:00 when arriving on Day 1.`);
          setSchedForm((currentForm) => ({ ...currentForm, arrivalTime: value }));
          return;
        }
      }
      if (schedErr && (schedErr === "Arrival time is required." || schedErr.includes("Arrival time must be after departure time"))) {
        setSchedErr("");
      }
      setSchedForm((currentForm) => ({ ...currentForm, arrivalTime: value }));
      return;
    }

    if (name === "travelDate") {
      if (schedForm.departureTime) {
        const depTimeErr = checkDepartureTimeValidation(schedForm.departureTime, value);
        if (depTimeErr) {
          setSchedErr(depTimeErr);
        } else if (
          schedErr &&
          (schedErr.includes("Departure time must be at least 15 minutes") ||
            schedErr.includes("Departure time cannot be scheduled for today"))
        ) {
          setSchedErr("");
        }
      }
      setSchedForm((currentForm) => ({ ...currentForm, travelDate: value }));
      return;
    }

    setSchedForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const updateStopSelection = (type, point, field, value) => {
    const targetKey = type === "boarding" ? "boardingSelections" : "droppingSelections";

    setSchedForm((currentForm) => {
      const updatedList = currentForm[targetKey].map((selection) => {
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
      });

      // Dynamic error clearing for stop selections
      if (schedErr) {
        if (type === "boarding") {
          const enabledStops = updatedList.filter((s) => s.enabled);
          if (schedErr === "Please select at least one boarding point." && enabledStops.length > 0) {
            setSchedErr("");
          } else if (
            schedErr === "Please select a time for every chosen boarding point." &&
            enabledStops.length > 0 &&
            enabledStops.every((s) => Boolean(s.time))
          ) {
            setSchedErr("");
          }
        } else if (type === "dropping") {
          const enabledStops = updatedList.filter((s) => s.enabled);
          if (schedErr === "Please select at least one dropping point." && enabledStops.length > 0) {
            setSchedErr("");
          } else if (
            schedErr === "Please select a time for every chosen dropping point." &&
            enabledStops.length > 0 &&
            enabledStops.every((s) => Boolean(s.time))
          ) {
            setSchedErr("");
          }
        }
      }

      return {
        ...currentForm,
        [targetKey]: updatedList,
      };
    });
  };

  const handleOpenPriceEdit = (schedule) => {
    const status = getScheduleStatus(schedule);
    if (status !== "Scheduled") {
      setSchedErr(`Cannot edit price for an ${status.toLowerCase()} schedule.`);
      return;
    }
    setPriceEditModal({
      schedule,
      price: String(schedule.price ?? ""),
    });
    setPriceEditErr("");
  };

  const handleSavePriceEdit = async () => {
    if (!priceEditModal) return;

    const currentStatus = getScheduleStatus(priceEditModal.schedule);
    if (currentStatus !== "Scheduled") {
      setPriceEditErr(`Cannot edit price for an ${currentStatus.toLowerCase()} schedule.`);
      return;
    }

    const priceNum = Number(priceEditModal.price);
    if (priceEditModal.price === "" || isNaN(priceNum) || priceNum < 0) {
      setPriceEditErr("Please enter a valid price (0 or greater).");
      return;
    }

    setPriceEditLoading(true);
    setPriceEditErr("");
    try {
      const s = priceEditModal.schedule;
      let updatedSchedule;

      try {
        const res = await api.patch(`/schedules/${s.id}/price`, { price: priceNum });
        updatedSchedule = res.data;
      } catch (patchErr) {
        // Fallback to PUT /schedules/{id} if server hasn't been restarted with the new endpoint
        const depTime = normalizeTimeValue(s.departureTime);
        const arrTime = normalizeTimeValue(s.arrivalTime);
        let arrivalDay = Number(s.arrivalDay || 1);
        if (arrivalDay === 1 && depTime && arrTime && arrTime <= depTime) {
          arrivalDay = 2;
        }

        const payload = {
          routeId: Number(s.route?.id),
          busNumber: s.busNumber,
          totalSeats: Number(s.totalSeats),
          acType: s.acType || "Non-A/C",
          busType: s.busType || "Seater",
          departureTime: depTime,
          arrivalDay: arrivalDay,
          arrivalTime: arrTime,
          travelDate: s.travelDate,
          price: priceNum,
          boardingStops: Array.isArray(s.boardingStops)
            ? s.boardingStops.map((stop) => ({ point: stop.point, time: normalizeTimeValue(stop.time) }))
            : [],
          droppingStops: Array.isArray(s.droppingStops)
            ? s.droppingStops.map((stop) => ({ point: stop.point, time: normalizeTimeValue(stop.time) }))
            : [],
        };
        const putRes = await api.put(`/schedules/${s.id}`, payload);
        updatedSchedule = putRes.data;
      }

      setSchedules((prev) => prev.map((item) => (item.id === updatedSchedule.id ? updatedSchedule : item)));
      setViewDetailsSchedule((prev) => (prev?.id === updatedSchedule.id ? updatedSchedule : prev));
      setSchedMsg(`Price updated successfully to Rs. ${priceNum.toLocaleString()}!`);
      setPriceEditModal(null);
      document.getElementById("sched-form-top")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setPriceEditErr(err.response?.data?.message || "Failed to update price.");
    } finally {
      setPriceEditLoading(false);
    }
  };

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    setSchedErr("");
    setSchedMsg("");

    const todayStr = getLocalDateString();
    const busNumTrimmed = (schedForm.busNumber || "").trim();
    const arrivalDayNum = parseInt(schedForm.arrivalDay, 10);
    const boardingStops = toStopPayload(schedForm.boardingSelections);
    const droppingStops = toStopPayload(schedForm.droppingSelections);

    let errorMsg = "";
    let focusSelector = null;

    if (!schedForm.routeId) {
      errorMsg = "Please select a route.";
      focusSelector = ".adm-route-search-input";
    } else if (!busNumTrimmed) {
      errorMsg = "Bus number is required.";
      focusSelector = '[name="busNumber"]';
    } else if (busNumTrimmed.length < 3) {
      errorMsg = "Bus number must be at least 3 characters long.";
      focusSelector = '[name="busNumber"]';
    } else if (schedForm.totalSeats === "" || schedForm.totalSeats === null || schedForm.totalSeats === undefined) {
      errorMsg = "Total seats is required.";
      focusSelector = '[name="totalSeats"]';
    } else if (isNaN(Number(schedForm.totalSeats)) || Number(schedForm.totalSeats) < 1 || !Number.isInteger(Number(schedForm.totalSeats))) {
      errorMsg = "Total seats must be at least 1.";
      focusSelector = '[name="totalSeats"]';
    } else if (!schedForm.departureTime) {
      errorMsg = "Departure time is required.";
      focusSelector = '[name="departureTime"]';
    } else if (schedForm.arrivalDay === "" || schedForm.arrivalDay === null || schedForm.arrivalDay === undefined) {
      errorMsg = "Arrival day is required.";
      focusSelector = '[name="arrivalDay"]';
    } else if (isNaN(arrivalDayNum) || arrivalDayNum < 1) {
      errorMsg = "Arrival day must be 1 or greater.";
      focusSelector = '[name="arrivalDay"]';
    } else if (!schedForm.arrivalTime) {
      errorMsg = "Arrival time is required.";
      focusSelector = '[name="arrivalTime"]';
    } else if (arrivalDayNum === 1 && schedForm.departureTime && schedForm.arrivalTime <= schedForm.departureTime) {
      errorMsg = `Arrival time must be after departure time (${schedForm.departureTime}) and before 00:00 when arriving on Day 1.`;
      focusSelector = '[name="arrivalTime"]';
    } else if (!schedForm.travelDate) {
      errorMsg = "Travel date is required.";
      focusSelector = '[name="travelDate"]';
    } else if (schedForm.travelDate < todayStr) {
      errorMsg = "Travel date cannot be in the past.";
      focusSelector = '[name="travelDate"]';
    } else if (checkDepartureTimeValidation(schedForm.departureTime, schedForm.travelDate)) {
      errorMsg = checkDepartureTimeValidation(schedForm.departureTime, schedForm.travelDate);
      focusSelector = '[name="departureTime"]';
    } else if (schedForm.price === "" || schedForm.price === null || schedForm.price === undefined) {
      errorMsg = "Price per seat is required.";
      focusSelector = '[name="price"]';
    } else if (isNaN(Number(schedForm.price)) || Number(schedForm.price) < 0) {
      errorMsg = "Price per seat must be 0 or greater.";
      focusSelector = '[name="price"]';
    } else if (boardingStops.length === 0) {
      errorMsg = "Please select at least one boarding point.";
    } else if (boardingStops.some((stop) => !stop.time)) {
      errorMsg = "Please select a time for every chosen boarding point.";
    } else if (droppingStops.length === 0) {
      errorMsg = "Please select at least one dropping point.";
    } else if (droppingStops.some((stop) => !stop.time)) {
      errorMsg = "Please select a time for every chosen dropping point.";
    }

    if (errorMsg) {
      setSchedErr(errorMsg);
      if (focusSelector) {
        const el = document.querySelector(focusSelector);
        if (el) el.focus();
      } else {
        document.getElementById("sched-form-top")?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    setConfirmSchedModal({
      route: selectedSchedRoute,
      busNumber: busNumTrimmed,
      totalSeats: Number(schedForm.totalSeats),
      acType: schedForm.acType,
      busType: schedForm.busType,
      departureTime: schedForm.departureTime,
      arrivalDay: arrivalDayNum,
      arrivalTime: schedForm.arrivalTime,
      duration: calculateScheduleDuration(schedForm.departureTime, schedForm.arrivalTime, arrivalDayNum),
      travelDate: schedForm.travelDate,
      price: schedForm.price,
      boardingSelections: schedForm.boardingSelections.filter((s) => s.enabled),
      droppingSelections: schedForm.droppingSelections.filter((s) => s.enabled),
    });
  };

  const handleConfirmAddSchedule = async () => {
    if (!confirmSchedModal) return;

    const priceNum = Number(confirmSchedModal.price);
    if (confirmSchedModal.price === "" || isNaN(priceNum) || priceNum < 0) {
      setSchedErr("Price per seat must be 0 or greater.");
      return;
    }

    setSchedLoading(true);
    try {
      const payload = {
        routeId: Number(confirmSchedModal.route.id),
        busNumber: confirmSchedModal.busNumber,
        totalSeats: Number(confirmSchedModal.totalSeats),
        acType: confirmSchedModal.acType,
        busType: confirmSchedModal.busType,
        departureTime: confirmSchedModal.departureTime,
        arrivalDay: confirmSchedModal.arrivalDay,
        arrivalTime: confirmSchedModal.arrivalTime,
        travelDate: confirmSchedModal.travelDate,
        price: priceNum,
        boardingStops: toStopPayload(confirmSchedModal.boardingSelections),
        droppingStops: toStopPayload(confirmSchedModal.droppingSelections),
      };

      await api.post("/schedules", payload);
      setSchedMsg("Schedule added successfully!");
      setSchedForm(createEmptyScheduleForm());
      setConfirmSchedModal(null);
      setSchedulePage(1);
      await fetchAll();
    } catch (err) {
      setSchedErr(err.response?.data?.message || "Failed to add schedule.");
      setConfirmSchedModal(null);
    } finally {
      setSchedLoading(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await api.delete(`/schedules/${id}`);
      setDeleteModal(null);
      setSchedMsg("Schedule deleted successfully!");
      setSchedErr("");
      document.getElementById("sched-form-top")?.scrollIntoView({ behavior: "smooth" });
      await fetchAll();
    } catch (err) {
      setDeleteModal(null);
      setSchedErr(err.response?.data?.message || "Failed to delete schedule.");
      document.getElementById("sched-form-top")?.scrollIntoView({ behavior: "smooth" });
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
        setRoutePage(1);
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

  const SCHEDULES_PER_PAGE = 10;
  const filteredSchedules = sortSchedulesNewestFirst(
    schedules.filter((s) => {
      const q = scheduleSearchQuery.trim().toLowerCase();
      if (!q) return true;

      const from = (s.route?.fromCity || "").toLowerCase();
      const to = (s.route?.toCity || "").toLowerCase();
      const routeDisplay = `${from} → ${to}`.toLowerCase();
      const routeArrow = `${from} -> ${to}`.toLowerCase();
      const routeTo = `${from} to ${to}`.toLowerCase();
      const routeMatches =
        from.includes(q) ||
        to.includes(q) ||
        routeDisplay.includes(q) ||
        routeArrow.includes(q) ||
        routeTo.includes(q);

      const schedId = (s.scheduleId ? String(s.scheduleId) : "").toLowerCase();
      const rawId = String(s.id ?? "").toLowerCase();
      const idMatches = schedId.includes(q) || rawId === q;

      const travelDate = (s.travelDate ? String(s.travelDate) : "").toLowerCase();
      const dateMatches = travelDate.includes(q);

      const status = getScheduleStatus(s).toLowerCase();
      const rawStatus = (s.status ? String(s.status) : "").toLowerCase();
      const statusMatches = status.includes(q) || rawStatus.includes(q);

      return routeMatches || idMatches || dateMatches || statusMatches;
    })
  );
  const totalSchedulePages = Math.max(1, Math.ceil(filteredSchedules.length / SCHEDULES_PER_PAGE));
  const safeSchedulePage = Math.min(schedulePage, totalSchedulePages);
  const scheduleStartIndex = (safeSchedulePage - 1) * SCHEDULES_PER_PAGE;
  const paginatedSchedules = filteredSchedules.slice(scheduleStartIndex, scheduleStartIndex + SCHEDULES_PER_PAGE);

  const ROUTES_PER_PAGE = 10;
  const filteredRoutes = sortRoutesNewestFirst(
    routes.filter((r) => {
      const q = routeSearchQuery.trim().toLowerCase();
      if (!q) return true;
      const from = (r.fromCity || "").toLowerCase();
      const to = (r.toCity || "").toLowerCase();
      return from.includes(q) || to.includes(q) || `${from} -> ${to}`.includes(q) || `${from} to ${to}`.includes(q);
    })
  );
  const totalRoutePages = Math.max(1, Math.ceil(filteredRoutes.length / ROUTES_PER_PAGE));
  const safeRoutePage = Math.min(routePage, totalRoutePages);
  const routeStartIndex = (safeRoutePage - 1) * ROUTES_PER_PAGE;
  const paginatedRoutes = filteredRoutes.slice(routeStartIndex, routeStartIndex + ROUTES_PER_PAGE);

  const handleDeleteRoute = async (id) => {
    try {
      await api.delete(`/routes/${id}`);
      setDeleteModal(null);
      if (editingRouteId === id) {
        setEditingRouteId(null);
        setRouteForm(createEmptyRouteForm());
      }
      if (String(schedForm.routeId) === String(id)) {
        setSchedForm(createEmptyScheduleForm());
      }
      setRouteMsg("Route deleted successfully!");
      setRouteErr("");
      document.getElementById("route-form-top")?.scrollIntoView({ behavior: "smooth" });
      await fetchAll();
    } catch (err) {
      setDeleteModal(null);
      setRouteErr(err.response?.data?.message || "Failed to delete route.");
      document.getElementById("route-form-top")?.scrollIntoView({ behavior: "smooth" });
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
              <h3 className="adm-form-title">➕ Add New Schedule</h3>
              {schedErr && <div className="adm-form-error">⚠️ {schedErr}</div>}
              {schedMsg && <div className="adm-form-success">✅ {schedMsg}</div>}
              <form onSubmit={handleSaveSchedule} className="adm-form-grid">
                <div className="adm-field">
                  <label>Route</label>
                  <RouteSearchSelect
                    routes={routes}
                    value={schedForm.routeId}
                    onChange={(val) => handleSchedChange({ target: { name: "routeId", value: val } })}
                  />
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
                  <label>Arrival Day</label>
                  <input
                    name="arrivalDay"
                    type="number"
                    min="1"
                    placeholder="e.g. 1 (same day), 2 (2nd day)"
                    value={schedForm.arrivalDay}
                    onChange={handleSchedChange}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E" || e.key === ".") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
                <div className="adm-field">
                  <label>Arrival Time</label>
                  <input
                    name="arrivalTime"
                    type="time"
                    value={schedForm.arrivalTime}
                    onChange={handleSchedChange}
                    disabled={!schedForm.departureTime || !schedForm.arrivalDay}
                    min={Number(schedForm.arrivalDay) === 1 && schedForm.departureTime ? getMinArrivalTime(schedForm.departureTime) : undefined}
                    max={Number(schedForm.arrivalDay) === 1 ? "23:59" : undefined}
                  />
                </div>
                <div className="adm-field">
                  <label>Travel Date</label>
                  <input name="travelDate" type="date" value={schedForm.travelDate} onChange={handleSchedChange} min={getLocalDateString()} />
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
                {selectedSchedRoute && (
                  <>
                    <div className="adm-field adm-field-full">
                      <label>Boarding Points and Times</label>
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
                    </div>
                    <div className="adm-field adm-field-full">
                      <label>Dropping Points and Times</label>
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
                    </div>
                  </>
                )}
                <div className="adm-field adm-field-full adm-form-actions">
                  <button type="submit" className="adm-submit-btn" disabled={schedLoading}>
                    {schedLoading ? "Saving..." : "Add Schedule"}
                  </button>
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
                placeholder="Search schedules by route, schedule ID, travel date, or status..."
                value={scheduleSearchQuery}
                onChange={(e) => {
                  setScheduleSearchQuery(e.target.value);
                  setSchedulePage(1);
                }}
              />
              {scheduleSearchQuery && (
                <button
                  type="button"
                  className="adm-search-clear"
                  onClick={() => {
                    setScheduleSearchQuery("");
                    setSchedulePage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="adm-empty">
                <div className="adm-empty-icon">📅</div>
                <p>{scheduleSearchQuery ? `No schedules found matching "${scheduleSearchQuery}".` : "No schedules available."}</p>
              </div>
            ) : (
              <>
                <div className="adm-table-wrap">
                  <table className="adm-table adm-schedules-table">
                    <colgroup>
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "16%" }} />
                    </colgroup>
                    <thead><tr><th>Route</th><th>Schedule ID</th><th>Travel Date</th><th>Status</th><th>Departure</th><th>Arrival</th><th>Price/Seat</th><th>Actions</th></tr></thead>
                    <tbody>
                      {paginatedSchedules.map(s => {
                        const status = getScheduleStatus(s);
                        return (
                          <tr key={s.id}>
                            <td className="adm-sched-route-cell">{s.route ? `${s.route.fromCity} → ${s.route.toCity}` : "—"}</td>
                            <td>
                              <span className="adm-booking-id">{s.scheduleId || "—"}</span>
                            </td>
                            <td>{s.travelDate}</td>
                            <td>
                              <span className={`adm-status adm-status-${status.toLowerCase()}`}>
                                {status}
                              </span>
                            </td>
                            <td>{normalizeTimeValue(s.departureTime) || "—"}</td>
                            <td>{normalizeTimeValue(s.arrivalTime) || "—"}{s.arrivalDay && Number(s.arrivalDay) > 1 ? ` (Day ${s.arrivalDay})` : ""}</td>
                            <td><strong>Rs. {(s.price ?? 0).toLocaleString()}</strong></td>
                            <td>
                              <div className="adm-sched-actions">
                                <div className="adm-sched-action-row full-row">
                                  <button
                                    type="button"
                                    className="adm-btn-view"
                                    onClick={() => setViewDetailsSchedule(s)}
                                    title="View schedule details"
                                  >
                                    View Details
                                  </button>
                                </div>
                                <div className="adm-sched-action-row sub-row">
                                  {status === "Scheduled" && (
                                    <button
                                      type="button"
                                      className="adm-btn-edit"
                                      onClick={() => handleOpenPriceEdit(s)}
                                      title="Edit price"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="adm-btn-delete"
                                    onClick={() => setDeleteModal({ type: "schedule", id: s.id, label: `${s.scheduleId ? s.scheduleId + ' (' + s.busNumber + ')' : s.busNumber} on ${s.travelDate}` })}
                                    title="Delete schedule"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination (10 rows per page) */}
                <div className="adm-pagination">
                  <div className="adm-pagination-info">
                    Showing {filteredSchedules.length === 0 ? 0 : scheduleStartIndex + 1} to{" "}
                    {Math.min(scheduleStartIndex + SCHEDULES_PER_PAGE, filteredSchedules.length)} of {filteredSchedules.length} schedules
                  </div>
                  {totalSchedulePages > 1 && (
                    <div className="adm-pagination-controls">
                      <button
                        type="button"
                        className="adm-page-btn"
                        disabled={safeSchedulePage <= 1}
                        onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalSchedulePages }, (_, i) => i + 1).map((p) => {
                        if (
                          totalSchedulePages <= 7 ||
                          p === 1 ||
                          p === totalSchedulePages ||
                          Math.abs(p - safeSchedulePage) <= 1
                        ) {
                          return (
                            <button
                              key={p}
                              type="button"
                              className={`adm-page-btn ${safeSchedulePage === p ? "active" : ""}`}
                              onClick={() => setSchedulePage(p)}
                            >
                              {p}
                            </button>
                          );
                        } else if (
                          p === safeSchedulePage - 2 ||
                          p === safeSchedulePage + 2
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
                        disabled={safeSchedulePage >= totalSchedulePages}
                        onClick={() => setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))}
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
                  <table className="adm-table adm-routes-table">
                    <colgroup>
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "29%" }} />
                      <col style={{ width: "29%" }} />
                      <col style={{ width: "14%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th className="adm-route-points-col">Boarding Points</th>
                        <th className="adm-route-points-col">Dropping Points</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRoutes.map((r) => (
                        <tr key={r.id}>
                          <td className="adm-route-city-cell">{r.fromCity}</td>
                          <td className="adm-route-city-cell">{r.toCity}</td>
                          <td className="adm-route-points-cell">
                            {getRoutePointOptions(r, "boardingPoints").join(", ") || "—"}
                          </td>
                          <td className="adm-route-points-cell">
                            {getRoutePointOptions(r, "droppingPoints").join(", ") || "—"}
                          </td>
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

      {confirmSchedModal && (
        <div className="adm-modal-overlay" onClick={() => !schedLoading && setConfirmSchedModal(null)}>
          <div className="adm-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-review-modal-header">
              <h3>📋 Review Schedule Details</h3>
              <button
                type="button"
                className="adm-modal-close-btn"
                onClick={() => !schedLoading && setConfirmSchedModal(null)}
                title="Close"
                disabled={schedLoading}
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-notice-banner">
              ⚠️ Please make sure all the schedule details are correct. Only the price is editable.
            </div>

            <div className="adm-review-details-grid">
              <div className="adm-review-detail-item full-width">
                <span className="adm-review-detail-label">Route</span>
                <span className="adm-review-detail-val">
                  {confirmSchedModal.route ? `${confirmSchedModal.route.fromCity} → ${confirmSchedModal.route.toCity}` : "—"}
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Bus Number</span>
                <span className="adm-review-detail-val">{confirmSchedModal.busNumber}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Total Seats</span>
                <span className="adm-review-detail-val">{confirmSchedModal.totalSeats} seats</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Travel Date</span>
                <span className="adm-review-detail-val">{confirmSchedModal.travelDate}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Bus Layout & A/C</span>
                <span className="adm-review-detail-val">
                  {confirmSchedModal.busType || "Seater"} • {confirmSchedModal.acType || "Non-A/C"}
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Departure Time</span>
                <span className="adm-review-detail-val">{confirmSchedModal.departureTime}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Arrival Time</span>
                <span className="adm-review-detail-val">
                  {confirmSchedModal.arrivalTime} {Number(confirmSchedModal.arrivalDay) > 1 ? `(Day ${confirmSchedModal.arrivalDay})` : "(Same Day)"}
                </span>
              </div>

              <div className="adm-review-detail-item full-width">
                <span className="adm-review-detail-label">Calculated Duration</span>
                <span className="adm-review-detail-val">
                  {confirmSchedModal.duration || calculateScheduleDuration(confirmSchedModal.departureTime, confirmSchedModal.arrivalTime, confirmSchedModal.arrivalDay) || "—"}
                </span>
              </div>
            </div>

            {confirmSchedModal.boardingSelections?.length > 0 && (
              <div className="adm-review-stops-group">
                <h4>Boarding Points & Times</h4>
                <div className="adm-review-stops-list">
                  {confirmSchedModal.boardingSelections.map((stop) => (
                    <span key={`review-b-${stop.point}`} className="adm-review-stop-pill">
                      📍 {stop.point}: <strong>{stop.time}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {confirmSchedModal.droppingSelections?.length > 0 && (
              <div className="adm-review-stops-group">
                <h4>Dropping Points & Times</h4>
                <div className="adm-review-stops-list">
                  {confirmSchedModal.droppingSelections.map((stop) => (
                    <span key={`review-d-${stop.point}`} className="adm-review-stop-pill">
                      🏁 {stop.point}: <strong>{stop.time}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="adm-review-price-box">
              <label>
                <span>Price per Seat (Rs.)</span>
                <span className="adm-review-editable-badge">Editable</span>
              </label>
              <input
                type="number"
                min="0"
                value={confirmSchedModal.price}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!isNaN(val) && Number(val) >= 0)) {
                    setConfirmSchedModal((prev) => ({ ...prev, price: val }));
                  }
                }}
                placeholder="Enter price per seat"
              />
            </div>

            <div className="adm-review-modal-actions center">
              <button
                type="button"
                className="adm-modal-cancel"
                onClick={() => setConfirmSchedModal(null)}
                disabled={schedLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-review-save-btn"
                onClick={handleConfirmAddSchedule}
                disabled={schedLoading}
              >
                {schedLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {priceEditModal && (
        <div className="adm-modal-overlay" onClick={() => !priceEditLoading && setPriceEditModal(null)}>
          <div className="adm-edit-price-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-review-modal-header">
              <h3>✏️ Edit Schedule Price</h3>
              <button
                type="button"
                className="adm-modal-close-btn"
                onClick={() => !priceEditLoading && setPriceEditModal(null)}
                title="Close"
                disabled={priceEditLoading}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "var(--text3)" }}>
              Update the price per seat for this schedule. Only price is editable.
            </p>

            {priceEditErr && <div className="adm-form-error" style={{ marginBottom: "1rem" }}>⚠️ {priceEditErr}</div>}

            <div className="adm-edit-price-info">
              {priceEditModal.schedule.scheduleId && (
                <div><strong>Schedule ID:</strong> <span className="adm-booking-id">{priceEditModal.schedule.scheduleId}</span></div>
              )}
              <div><strong>Route:</strong> {priceEditModal.schedule.route ? `${priceEditModal.schedule.route.fromCity} → ${priceEditModal.schedule.route.toCity}` : "—"}</div>
              <div><strong>Bus:</strong> {priceEditModal.schedule.busNumber} ({priceEditModal.schedule.busType || "Seater"} • {priceEditModal.schedule.acType || "Non-A/C"})</div>
              <div><strong>Travel Date:</strong> {priceEditModal.schedule.travelDate}</div>
              <div><strong>Timing:</strong> {normalizeTimeValue(priceEditModal.schedule.departureTime) || priceEditModal.schedule.departureTime || "—"} → {normalizeTimeValue(priceEditModal.schedule.arrivalTime) || priceEditModal.schedule.arrivalTime || "—"}{priceEditModal.schedule.arrivalDay && Number(priceEditModal.schedule.arrivalDay) > 1 ? ` (Day ${priceEditModal.schedule.arrivalDay})` : ""}</div>
            </div>

            <div className="adm-edit-price-field">
              <label>Price per Seat (Rs.)</label>
              <input
                type="number"
                min="0"
                autoFocus
                value={priceEditModal.price}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!isNaN(val) && Number(val) >= 0)) {
                    setPriceEditModal((prev) => ({ ...prev, price: val }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSavePriceEdit();
                  }
                }}
                placeholder="Enter new price"
              />
            </div>

            <div className="adm-review-modal-actions">
              <button
                type="button"
                className="adm-modal-cancel"
                onClick={() => setPriceEditModal(null)}
                disabled={priceEditLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-review-save-btn"
                onClick={handleSavePriceEdit}
                disabled={priceEditLoading}
              >
                {priceEditLoading ? "Updating..." : "Update Price"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDetailsSchedule && (
        <div className="adm-modal-overlay" onClick={() => setViewDetailsSchedule(null)}>
          <div className="adm-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-review-modal-header">
              <h3>🚌 Schedule Details</h3>
              <button
                type="button"
                className="adm-modal-close-btn"
                onClick={() => setViewDetailsSchedule(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-subheading">
              <span className="adm-booking-id">{viewDetailsSchedule.scheduleId || `SCH-${viewDetailsSchedule.id}`}</span>
              {viewDetailsSchedule.route && (
                <span className="adm-detail-route-badge">
                  {viewDetailsSchedule.route.fromCity} → {viewDetailsSchedule.route.toCity}
                </span>
              )}
              <span className={`adm-status adm-status-${getScheduleStatus(viewDetailsSchedule).toLowerCase()}`}>
                {getScheduleStatus(viewDetailsSchedule)}
              </span>
            </div>

            <div className="adm-review-details-grid">
              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Bus Number</span>
                <span className="adm-review-detail-val">{viewDetailsSchedule.busNumber || "—"}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">A/C Type</span>
                <span className="adm-review-detail-val">
                  <span className={viewDetailsSchedule.acType === "A/C" ? "ac-badge-adm ac-yes-adm" : "ac-badge-adm ac-no-adm"}>
                    {viewDetailsSchedule.acType === "A/C" ? "A/C" : "Non-A/C"}
                  </span>
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Bus Layout</span>
                <span className="adm-review-detail-val">
                  <span className={viewDetailsSchedule.busType === "Sleeper" ? "adm-layout-badge adm-layout-sleeper" : "adm-layout-badge adm-layout-seater"}>
                    {viewDetailsSchedule.busType || "Seater"}
                  </span>
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Total Seats</span>
                <span className="adm-review-detail-val">{viewDetailsSchedule.totalSeats || "—"} seats</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Travel Date</span>
                <span className="adm-review-detail-val">{viewDetailsSchedule.travelDate || "—"}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Duration</span>
                <span className="adm-review-detail-val">
                  ⏱️ {calculateScheduleDuration(viewDetailsSchedule.departureTime, viewDetailsSchedule.arrivalTime, viewDetailsSchedule.arrivalDay) || viewDetailsSchedule.duration || "—"}
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Departure Time</span>
                <span className="adm-review-detail-val">{normalizeTimeValue(viewDetailsSchedule.departureTime) || "—"}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Arrival Time</span>
                <span className="adm-review-detail-val">
                  {normalizeTimeValue(viewDetailsSchedule.arrivalTime) || "—"}{viewDetailsSchedule.arrivalDay && Number(viewDetailsSchedule.arrivalDay) > 1 ? ` (Day ${viewDetailsSchedule.arrivalDay})` : ""}
                </span>
              </div>

              <div className="adm-review-detail-item full-width">
                <span className="adm-review-detail-label">Price per Seat</span>
                <span className="adm-review-detail-val">
                  <strong style={{ color: "#2563eb", fontSize: "1.05rem" }}>
                    Rs. {(viewDetailsSchedule.price ?? 0).toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>

            <div className="adm-review-stops-group">
              <h4>Boarding Stops & Times</h4>
              {Array.isArray(viewDetailsSchedule.boardingStops) && viewDetailsSchedule.boardingStops.length > 0 ? (
                <div className="adm-review-stops-list">
                  {viewDetailsSchedule.boardingStops.map((stop, idx) => (
                    <span key={`b-stop-${idx}`} className="adm-review-stop-pill">
                      📍 {stop.point}: <strong>{normalizeTimeValue(stop.time) || stop.time || "--:--"}</strong>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="adm-no-stops-text">No boarding stops specified.</p>
              )}
            </div>

            <div className="adm-review-stops-group">
              <h4>Dropping Stops & Times</h4>
              {Array.isArray(viewDetailsSchedule.droppingStops) && viewDetailsSchedule.droppingStops.length > 0 ? (
                <div className="adm-review-stops-list">
                  {viewDetailsSchedule.droppingStops.map((stop, idx) => (
                    <span key={`d-stop-${idx}`} className="adm-review-stop-pill">
                      🏁 {stop.point}: <strong>{normalizeTimeValue(stop.time) || stop.time || "--:--"}</strong>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="adm-no-stops-text">No dropping stops specified.</p>
              )}
            </div>

            <div className="adm-review-modal-actions" style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className="adm-review-save-btn"
                onClick={() => setViewDetailsSchedule(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
