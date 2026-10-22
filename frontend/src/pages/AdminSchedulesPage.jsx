import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminDashboardPage.css";

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
    totalMinutes = arrMinutes - depMinutes;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
  }

  if (totalMinutes < 0) totalMinutes = 0;

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

    if (name === "arrivalDay") {
      if (value === "") {
        setForm((currentForm) => ({ ...currentForm, arrivalDay: "" }));
        return;
      }
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        return;
      }
      setForm((currentForm) => ({ ...currentForm, arrivalDay: String(num) }));
      return;
    }

    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const updateSelection = (type, point, field, value) => {
    const key = type === "boarding" ? "boardingSelections" : "droppingSelections";
    setForm((currentForm) => ({
      ...currentForm,
      [key]: currentForm[key].map((selection) => {
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

  const validateForm = () => {
    if (!form.routeId || !form.travelDate || !form.departureTime || !form.arrivalTime || !form.busNumber.trim() || !form.totalSeats || !form.price) {
      setError("Please fill in all fields.");
      return false;
    }

    const arrivalDayNum = parseInt(form.arrivalDay, 10);
    if (!form.arrivalDay || isNaN(arrivalDayNum) || arrivalDayNum < 1) {
      setError("Arrival day must be 1 or greater.");
      return false;
    }

    const boardingStops = toStopPayload(form.boardingSelections);
    const droppingStops = toStopPayload(form.droppingSelections);
    if (boardingStops.length === 0 || droppingStops.length === 0) {
      setError("Please select at least one boarding point and one dropping point.");
      return false;
    }

    if (boardingStops.some((stop) => !stop.time) || droppingStops.some((stop) => !stop.time)) {
      setError("Please select a time for every chosen boarding and dropping point.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitLoading(true);

      await api.post("/schedules", {
        routeId: Number(form.routeId),
        travelDate: form.travelDate,
        departureTime: form.departureTime,
        arrivalDay: Number(form.arrivalDay || 1),
        arrivalTime: form.arrivalTime,
        busNumber: form.busNumber,
        totalSeats: Number(form.totalSeats),
        acType: form.acType,
        busType: form.busType,
        price: Number(form.price),
        boardingStops: toStopPayload(form.boardingSelections),
        droppingStops: toStopPayload(form.droppingSelections),
      });

      setSuccessMessage("Schedule created successfully.");
      setForm(createEmptyForm());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create schedule.");
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
          <input type="date" name="travelDate" value={form.travelDate} onChange={handleChange} />
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
          <input type="time" name="arrivalTime" value={form.arrivalTime} onChange={handleChange} />
        </div>

        {calculateScheduleDuration(form.departureTime, form.arrivalTime, form.arrivalDay) && (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Calculated Duration: <strong>{calculateScheduleDuration(form.departureTime, form.arrivalTime, form.arrivalDay)}</strong>
            {Number(form.arrivalDay) > 1 ? ` (Arrives on Day ${form.arrivalDay})` : " (Same day arrival)"}
          </p>
        )}

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
    </div>
  );
}

export default AdminSchedulesPage;
