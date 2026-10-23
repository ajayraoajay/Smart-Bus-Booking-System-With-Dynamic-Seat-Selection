import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminDashboardPage.css";

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalTimeString = (d = new Date()) => {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const checkDepartureTimeValidation = (departureTime, travelDate) => {
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

const getMinArrivalTime = (departureTime) => {
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

const calculateScheduleDuration = (departureTime, arrivalTime, arrivalDay = 1) => {
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

const createEmptyForm = () => ({
  routeId: "",
  travelDate: "",
  departureTime: "",
  arrivalDay: "1",
  arrivalTime: "",
  busNumber: "",
  totalSeats: "40",
  acType: "Non-A/C",
  busType: "Seater",
  price: "",
  boardingSelections: [],
  droppingSelections: [],
});

const normalizeTimeValue = (value) => (value ? value.substring(0, 5) : "");

const getRoutePoints = (route, type) => {
  if (!route) {
    return [];
  }

  return Array.isArray(route[type]) ? route[type].filter(Boolean) : [];
};

const buildSelections = (points, existingStops = []) => {
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
  selections.filter((selection) => selection.enabled).map((selection) => ({
    point: selection.point,
    time: selection.time,
  }));

function AdminSchedulesPage() {
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await api.get("/routes");
        setRoutes(response.data);
      } catch (err) {
        setError("Failed to load routes.");
        console.error(err);
      } finally {
        setLoadingRoutes(false);
      }
    };

    fetchRoutes();
  }, []);

  const selectedRoute = useMemo(
    () => routes.find((route) => String(route.id) === String(form.routeId)),
    [routes, form.routeId]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    const todayStr = getLocalDateString();

    // Dynamic error clearing when condition is satisfied
    if (error) {
      let satisfied = false;

      if (name === "routeId") {
        if (error === "Please select a route." && value) {
          satisfied = true;
        }
      } else if (name === "busNumber") {
        const trimmed = value.trim();
        if (error === "Bus number is required." && trimmed) {
          satisfied = true;
        } else if (error === "Bus number must be at least 3 characters long." && trimmed.length >= 3) {
          satisfied = true;
        }
      } else if (name === "totalSeats") {
        const num = Number(value);
        if (error === "Total seats is required." && value.trim() !== "") {
          satisfied = true;
        } else if (
          error === "Total seats must be at least 1." &&
          value.trim() !== "" &&
          !isNaN(num) &&
          num >= 1 &&
          Number.isInteger(num)
        ) {
          satisfied = true;
        }
      } else if (name === "departureTime") {
        if (error === "Departure time is required." && value) {
          satisfied = true;
        } else if (error.includes("Arrival time must be after departure time")) {
          if (form.arrivalTime && value && form.arrivalTime > value) {
            satisfied = true;
          }
        } else if (
          error.includes("Departure time must be at least 15 minutes") ||
          error.includes("Departure time cannot be scheduled for today")
        ) {
          const depTimeErr = checkDepartureTimeValidation(value, form.travelDate);
          if (!depTimeErr) {
            satisfied = true;
          }
        }
      } else if (name === "arrivalDay") {
        const dayNum = parseInt(value, 10);
        if (error === "Arrival day is required." && value.trim() !== "") {
          satisfied = true;
        } else if (error === "Arrival day must be 1 or greater." && !isNaN(dayNum) && dayNum >= 1) {
          satisfied = true;
        } else if (error.includes("Arrival time must be after departure time")) {
          if (!isNaN(dayNum) && dayNum > 1) {
            satisfied = true;
          }
        }
      } else if (name === "arrivalTime") {
        if (error === "Arrival time is required." && value) {
          satisfied = true;
        } else if (error.includes("Arrival time must be after departure time")) {
          const arrDay = parseInt(form.arrivalDay, 10);
          if (arrDay > 1 || (form.departureTime && value > form.departureTime)) {
            satisfied = true;
          }
        }
      } else if (name === "travelDate") {
        if (error === "Travel date is required." && value) {
          satisfied = true;
        } else if (error === "Travel date cannot be in the past." && value >= todayStr) {
          satisfied = true;
        } else if (
          error.includes("Departure time must be at least 15 minutes") ||
          error.includes("Departure time cannot be scheduled for today")
        ) {
          const depTimeErr = checkDepartureTimeValidation(form.departureTime, value);
          if (!depTimeErr) {
            satisfied = true;
          }
        }
      } else if (name === "price") {
        const pNum = Number(value);
        if (error === "Price per seat is required." && value.trim() !== "") {
          satisfied = true;
        } else if (
          (error === "Price per seat must be 0 or greater." || error === "Price must be 0 or greater.") &&
          value.trim() !== "" &&
          !isNaN(pNum) &&
          pNum >= 0
        ) {
          satisfied = true;
        }
      }

      if (satisfied) {
        setError("");
      }
    }

    if (name === "routeId") {
      const nextRoute = routes.find((route) => String(route.id) === String(value));
      setForm((currentForm) => ({
        ...currentForm,
        routeId: value,
        boardingSelections: buildSelections(getRoutePoints(nextRoute, "boardingPoints")),
        droppingSelections: buildSelections(getRoutePoints(nextRoute, "droppingPoints")),
      }));
      return;
    }

    if (name === "departureTime") {
      if (form.travelDate) {
        const depTimeErr = checkDepartureTimeValidation(value, form.travelDate);
        if (depTimeErr) {
          setError(depTimeErr);
        } else if (
          error &&
          (error.includes("Departure time must be at least 15 minutes") ||
            error.includes("Departure time cannot be scheduled for today"))
        ) {
          setError("");
        }
      }

      setForm((currentForm) => {
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
        setForm((currentForm) => ({ ...currentForm, arrivalDay: "", arrivalTime: "" }));
        return;
      }
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        setForm((currentForm) => ({ ...currentForm, arrivalDay: value, arrivalTime: "" }));
        return;
      }
      setForm((currentForm) => {
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
      const arrDayNum = parseInt(form.arrivalDay, 10);
      if (arrDayNum === 1 && form.departureTime && value) {
        if (value <= form.departureTime) {
          setError(`Arrival time must be after departure time (${form.departureTime}) and before 00:00 when arriving on Day 1.`);
          setForm((currentForm) => ({ ...currentForm, arrivalTime: value }));
          return;
        }
      }
      if (error && (error === "Arrival time is required." || error.includes("Arrival time must be after departure time"))) {
        setError("");
      }
      setForm((currentForm) => ({ ...currentForm, arrivalTime: value }));
      return;
    }

    if (name === "travelDate") {
      if (form.departureTime) {
        const depTimeErr = checkDepartureTimeValidation(form.departureTime, value);
        if (depTimeErr) {
          setError(depTimeErr);
        } else if (
          error &&
          (error.includes("Departure time must be at least 15 minutes") ||
            error.includes("Departure time cannot be scheduled for today"))
        ) {
          setError("");
        }
      }
      setForm((currentForm) => ({ ...currentForm, travelDate: value }));
      return;
    }

    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const updateSelection = (type, point, field, value) => {
    const key = type === "boarding" ? "boardingSelections" : "droppingSelections";
    setForm((currentForm) => {
      const updatedList = currentForm[key].map((selection) => {
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
      if (error) {
        if (type === "boarding") {
          const enabledStops = updatedList.filter((s) => s.enabled);
          if (error === "Please select at least one boarding point." && enabledStops.length > 0) {
            setError("");
          } else if (
            error === "Please select a time for every chosen boarding point." &&
            enabledStops.length > 0 &&
            enabledStops.every((s) => Boolean(s.time))
          ) {
            setError("");
          }
        } else if (type === "dropping") {
          const enabledStops = updatedList.filter((s) => s.enabled);
          if (error === "Please select at least one dropping point." && enabledStops.length > 0) {
            setError("");
          } else if (
            error === "Please select a time for every chosen dropping point." &&
            enabledStops.length > 0 &&
            enabledStops.every((s) => Boolean(s.time))
          ) {
            setError("");
          }
        }
      }

      return {
        ...currentForm,
        [key]: updatedList,
      };
    });
  };

  const validateForm = () => {
    const todayStr = getLocalDateString();
    const busNumTrimmed = (form.busNumber || "").trim();
    const arrivalDayNum = parseInt(form.arrivalDay, 10);
    const boardingStops = toStopPayload(form.boardingSelections);
    const droppingStops = toStopPayload(form.droppingSelections);

    let errorMsg = "";
    let focusSelector = null;

    if (!form.routeId) {
      errorMsg = "Please select a route.";
      focusSelector = ".adm-route-search-input";
    } else if (!busNumTrimmed) {
      errorMsg = "Bus number is required.";
      focusSelector = '[name="busNumber"]';
    } else if (busNumTrimmed.length < 3) {
      errorMsg = "Bus number must be at least 3 characters long.";
      focusSelector = '[name="busNumber"]';
    } else if (form.totalSeats === "" || form.totalSeats === null || form.totalSeats === undefined) {
      errorMsg = "Total seats is required.";
      focusSelector = '[name="totalSeats"]';
    } else if (isNaN(Number(form.totalSeats)) || Number(form.totalSeats) < 1 || !Number.isInteger(Number(form.totalSeats))) {
      errorMsg = "Total seats must be at least 1.";
      focusSelector = '[name="totalSeats"]';
    } else if (!form.departureTime) {
      errorMsg = "Departure time is required.";
      focusSelector = '[name="departureTime"]';
    } else if (form.arrivalDay === "" || form.arrivalDay === null || form.arrivalDay === undefined) {
      errorMsg = "Arrival day is required.";
      focusSelector = '[name="arrivalDay"]';
    } else if (isNaN(arrivalDayNum) || arrivalDayNum < 1) {
      errorMsg = "Arrival day must be 1 or greater.";
      focusSelector = '[name="arrivalDay"]';
    } else if (!form.arrivalTime) {
      errorMsg = "Arrival time is required.";
      focusSelector = '[name="arrivalTime"]';
    } else if (arrivalDayNum === 1 && form.departureTime && form.arrivalTime <= form.departureTime) {
      errorMsg = `Arrival time must be after departure time (${form.departureTime}) and before 00:00 when arriving on Day 1.`;
      focusSelector = '[name="arrivalTime"]';
    } else if (!form.travelDate) {
      errorMsg = "Travel date is required.";
      focusSelector = '[name="travelDate"]';
    } else if (form.travelDate < todayStr) {
      errorMsg = "Travel date cannot be in the past.";
      focusSelector = '[name="travelDate"]';
    } else if (checkDepartureTimeValidation(form.departureTime, form.travelDate)) {
      errorMsg = checkDepartureTimeValidation(form.departureTime, form.travelDate);
      focusSelector = '[name="departureTime"]';
    } else if (form.price === "" || form.price === null || form.price === undefined) {
      errorMsg = "Price per seat is required.";
      focusSelector = '[name="price"]';
    } else if (isNaN(Number(form.price)) || Number(form.price) < 0) {
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
      setError(errorMsg);
      if (focusSelector) {
        const el = document.querySelector(focusSelector);
        if (el) el.focus();
      }
      return false;
    }

    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setConfirmModal({
      route: selectedRoute,
      busNumber: form.busNumber.trim(),
      totalSeats: Number(form.totalSeats),
      acType: form.acType,
      busType: form.busType,
      departureTime: form.departureTime,
      arrivalDay: Number(form.arrivalDay || 1),
      arrivalTime: form.arrivalTime,
      duration: calculateScheduleDuration(form.departureTime, form.arrivalTime, form.arrivalDay),
      travelDate: form.travelDate,
      price: form.price,
      boardingSelections: form.boardingSelections.filter((s) => s.enabled),
      droppingSelections: form.droppingSelections.filter((s) => s.enabled),
    });
  };

  const handleConfirmSubmit = async () => {
    if (!confirmModal) return;

    const priceNum = Number(confirmModal.price);
    if (confirmModal.price === "" || isNaN(priceNum) || priceNum < 0) {
      setError("Price must be 0 or greater.");
      return;
    }

    try {
      setSubmitLoading(true);

      await api.post("/schedules", {
        routeId: Number(confirmModal.route.id),
        travelDate: confirmModal.travelDate,
        departureTime: confirmModal.departureTime,
        arrivalDay: Number(confirmModal.arrivalDay || 1),
        arrivalTime: confirmModal.arrivalTime,
        busNumber: confirmModal.busNumber,
        totalSeats: Number(confirmModal.totalSeats),
        acType: confirmModal.acType,
        busType: confirmModal.busType,
        price: priceNum,
        boardingStops: toStopPayload(confirmModal.boardingSelections),
        droppingStops: toStopPayload(confirmModal.droppingSelections),
      });

      setSuccessMessage("Schedule created successfully.");
      setForm(createEmptyForm());
      setConfirmModal(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create schedule.");
      setConfirmModal(null);
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="top-action-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div
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
        <button className="secondary-btn" onClick={() => navigate("/admin/bookings")}>
          View Bookings
        </button>
      </div>

      <h1 className="title">Admin - Add Schedule</h1>
      <p className="subtitle">Create a schedule with route-specific boarding and dropping times.</p>

      {loadingRoutes && <p>Loading routes...</p>}
      {error && <p className="error-text">{error}</p>}
      {successMessage && (
        <div className="success-box">
          <p>{successMessage}</p>
        </div>
      )}

      <form className="booking-form" onSubmit={handleSubmit}>
        <h2>Schedule Details</h2>

        <div className="form-group">
          <label>Route</label>
          <RouteSearchSelect
            routes={routes}
            value={form.routeId}
            onChange={(val) => handleChange({ target: { name: "routeId", value: val } })}
          />
        </div>

        <div className="form-group">
          <label>Travel Date</label>
          <input type="date" name="travelDate" value={form.travelDate} onChange={handleChange} min={getLocalDateString()} />
        </div>

        <div className="form-group">
          <label>Departure Time</label>
          <input type="time" name="departureTime" value={form.departureTime} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Arrival Day</label>
          <input
            type="number"
            name="arrivalDay"
            min="1"
            value={form.arrivalDay}
            onChange={handleChange}
            placeholder="e.g. 1 (same day), 2 (2nd day)"
            onKeyDown={(e) => {
              if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E" || e.key === ".") {
                e.preventDefault();
              }
            }}
          />
        </div>

        <div className="form-group">
          <label>Arrival Time</label>
          <input
            type="time"
            name="arrivalTime"
            value={form.arrivalTime}
            onChange={handleChange}
            disabled={!form.departureTime || !form.arrivalDay}
            min={Number(form.arrivalDay) === 1 && form.departureTime ? getMinArrivalTime(form.departureTime) : undefined}
            max={Number(form.arrivalDay) === 1 ? "23:59" : undefined}
          />
        </div>

        <div className="form-group">
          <label>Bus Number</label>
          <input type="text" name="busNumber" value={form.busNumber} onChange={handleChange} placeholder="Enter bus number" />
        </div>

        <div className="form-group">
          <label>Total Seats</label>
          <input type="number" name="totalSeats" value={form.totalSeats} onChange={handleChange} placeholder="Enter total seats" />
        </div>

        <div className="form-group">
          <label>A/C Type</label>
          <select name="acType" value={form.acType} onChange={handleChange}>
            <option value="Non-A/C">Non-A/C</option>
            <option value="A/C">A/C</option>
          </select>
        </div>

        <div className="form-group">
          <label>Bus Layout</label>
          <select name="busType" value={form.busType} onChange={handleChange}>
            <option value="Seater">Seater</option>
            <option value="Sleeper">Sleeper</option>
          </select>
        </div>

        <div className="form-group">
          <label>Price per Seat</label>
          <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="Enter price per seat" />
        </div>

        {selectedRoute && (
          <>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Boarding Points and Times</label>
              <div className="adm-stop-grid">
                {form.boardingSelections.map((selection) => (
                  <div key={`boarding-${selection.point}`} className={`adm-stop-card ${selection.enabled ? "active" : ""}`}>
                    <label className="adm-stop-toggle">
                      <input
                        type="checkbox"
                        checked={selection.enabled}
                        onChange={(event) => updateSelection("boarding", selection.point, "enabled", event.target.checked)}
                      />
                      <span>{selection.point}</span>
                    </label>
                    <input
                      type="time"
                      value={selection.time}
                      disabled={!selection.enabled}
                      onChange={(event) => updateSelection("boarding", selection.point, "time", event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Dropping Points and Times</label>
              <div className="adm-stop-grid">
                {form.droppingSelections.map((selection) => (
                  <div key={`dropping-${selection.point}`} className={`adm-stop-card ${selection.enabled ? "active" : ""}`}>
                    <label className="adm-stop-toggle">
                      <input
                        type="checkbox"
                        checked={selection.enabled}
                        onChange={(event) => updateSelection("dropping", selection.point, "enabled", event.target.checked)}
                      />
                      <span>{selection.point}</span>
                    </label>
                    <input
                      type="time"
                      value={selection.time}
                      disabled={!selection.enabled}
                      onChange={(event) => updateSelection("dropping", selection.point, "time", event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <button className="primary-btn full-width-btn" type="submit" disabled={submitLoading}>
          {submitLoading ? "Creating Schedule..." : "Create Schedule"}
        </button>
      </form>

      {confirmModal && (
        <div className="adm-modal-overlay" onClick={() => !submitLoading && setConfirmModal(null)}>
          <div className="adm-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-review-modal-header">
              <h3>📋 Review Schedule Details</h3>
            </div>

            <div className="adm-modal-notice-banner">
              ⚠️ Please make sure all the schedule details are correct. Only the price is editable.
            </div>

            <div className="adm-review-details-grid">
              <div className="adm-review-detail-item full-width">
                <span className="adm-review-detail-label">Route</span>
                <span className="adm-review-detail-val">
                  {confirmModal.route ? `${confirmModal.route.fromCity} → ${confirmModal.route.toCity}` : "—"}
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Bus Number</span>
                <span className="adm-review-detail-val">{confirmModal.busNumber}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Total Seats</span>
                <span className="adm-review-detail-val">{confirmModal.totalSeats} seats</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Travel Date</span>
                <span className="adm-review-detail-val">{confirmModal.travelDate}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Bus Type & A/C</span>
                <span className="adm-review-detail-val">
                  {confirmModal.acType} • {confirmModal.busType}
                </span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Departure Time</span>
                <span className="adm-review-detail-val">{confirmModal.departureTime}</span>
              </div>

              <div className="adm-review-detail-item">
                <span className="adm-review-detail-label">Arrival Time</span>
                <span className="adm-review-detail-val">
                  {confirmModal.arrivalTime} {Number(confirmModal.arrivalDay) > 1 ? `(Day ${confirmModal.arrivalDay})` : "(Same Day)"}
                </span>
              </div>

              <div className="adm-review-detail-item full-width">
                <span className="adm-review-detail-label">Calculated Duration</span>
                <span className="adm-review-detail-val">
                  {confirmModal.duration || calculateScheduleDuration(confirmModal.departureTime, confirmModal.arrivalTime, confirmModal.arrivalDay) || "—"}
                </span>
              </div>
            </div>

            {confirmModal.boardingSelections?.length > 0 && (
              <div className="adm-review-stops-group">
                <h4>Boarding Points & Times</h4>
                <div className="adm-review-stops-list">
                  {confirmModal.boardingSelections.map((stop) => (
                    <span key={`review-b-${stop.point}`} className="adm-review-stop-pill">
                      📍 {stop.point}: <strong>{stop.time}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {confirmModal.droppingSelections?.length > 0 && (
              <div className="adm-review-stops-group">
                <h4>Dropping Points & Times</h4>
                <div className="adm-review-stops-list">
                  {confirmModal.droppingSelections.map((stop) => (
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
                value={confirmModal.price}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!isNaN(val) && Number(val) >= 0)) {
                    setConfirmModal((prev) => ({ ...prev, price: val }));
                  }
                }}
                placeholder="Enter price per seat"
              />
            </div>

            <div className="adm-review-modal-actions">
              <button
                type="button"
                className="adm-modal-cancel"
                onClick={() => setConfirmModal(null)}
                disabled={submitLoading}
              >
                Back to Form
              </button>
              <button
                type="button"
                className="adm-review-save-btn"
                onClick={handleConfirmSubmit}
                disabled={submitLoading}
              >
                {submitLoading ? "Saving..." : "Confirm & Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSchedulesPage;
