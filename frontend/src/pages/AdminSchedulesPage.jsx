import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const createEmptyForm = () => ({
  routeId: "",
  travelDate: "",
  departureTime: "",
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
          <select name="routeId" value={form.routeId} onChange={handleChange}>
            <option value="">Select a route</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.fromCity} {"->"} {route.toCity}
              </option>
            ))}
          </select>
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
          <label>Arrival Time</label>
          <input type="time" name="arrivalTime" value={form.arrivalTime} onChange={handleChange} />
        </div>

        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
          Duration will be calculated automatically from departure and arrival time.
        </p>

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

        <div className="form-group">
          <label>Boarding Points and Times</label>
          {selectedRoute ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {form.boardingSelections.map((selection) => (
                <div key={`boarding-${selection.point}`} style={{ display: "grid", gap: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
          ) : (
            <p>Select a route first.</p>
          )}
        </div>

        <div className="form-group">
          <label>Dropping Points and Times</label>
          {selectedRoute ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {form.droppingSelections.map((selection) => (
                <div key={`dropping-${selection.point}`} style={{ display: "grid", gap: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
          ) : (
            <p>Select a route first.</p>
          )}
        </div>

        <button className="primary-btn full-width-btn" type="submit" disabled={submitLoading}>
          {submitLoading ? "Creating Schedule..." : "Create Schedule"}
        </button>
      </form>
    </div>
  );
}

export default AdminSchedulesPage;
