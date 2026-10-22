import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./RoutesListingPage.css";

const formatTimeValue = (value) => (value ? value.substring(0, 5) : "-");
const getBusLayoutLabel = (busType) => (busType === "Sleeper" ? "Sleeper" : "Seater");
const formatJourneyDate = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const SORT_OPTIONS = [
  { value: "priceLowToHigh", label: "Price Low to High" },
  { value: "earlyDeparture", label: "Early Departure" },
  { value: "lateDeparture", label: "Late Departure" },
];

const BUS_FILTER_OPTIONS = [
  { value: "Seater", label: "Seater" },
  { value: "Sleeper", label: "Sleeper" },
  { value: "AC", label: "AC" },
  { value: "Non AC", label: "Non AC" },
];

const isTodayOrFuture = (travelDate) => {
  if (!travelDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduleDate = new Date(`${travelDate}T00:00:00`);
  return !Number.isNaN(scheduleDate.getTime()) && scheduleDate >= today;
};

const getDepartureMinutes = (departureTime) => {
  if (!departureTime) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [hours = 0, minutes = 0] = departureTime.split(":").map((value) => Number(value) || 0);
  return (hours * 60) + minutes;
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

const getScheduleBoardingPoints = (schedule) => {
  if (!schedule) return [];
  if (Array.isArray(schedule.boardingStops) && schedule.boardingStops.length > 0) {
    return schedule.boardingStops
      .map((s) => (typeof s === "string" ? s.trim() : s?.point?.trim()))
      .filter(Boolean);
  }
  if (Array.isArray(schedule.route?.boardingPoints) && schedule.route.boardingPoints.length > 0) {
    return schedule.route.boardingPoints
      .map((pt) => pt?.trim())
      .filter(Boolean);
  }
  return [];
};

const getScheduleDroppingPoints = (schedule) => {
  if (!schedule) return [];
  if (Array.isArray(schedule.droppingStops) && schedule.droppingStops.length > 0) {
    return schedule.droppingStops
      .map((s) => (typeof s === "string" ? s.trim() : s?.point?.trim()))
      .filter(Boolean);
  }
  if (Array.isArray(schedule.route?.droppingPoints) && schedule.route.droppingPoints.length > 0) {
    return schedule.route.droppingPoints
      .map((pt) => pt?.trim())
      .filter(Boolean);
  }
  return [];
};

const filterSchedulesList = (
  baseList,
  { busFilters = [], boardingPoint = "", droppingPoint = "", sortBy = "" }
) => {
  const layoutFilters = busFilters.filter((f) => f === "Seater" || f === "Sleeper");
  const comfortFilters = busFilters.filter((f) => f === "AC" || f === "Non AC");

  const filtered = baseList.filter((schedule) => {
    const route = schedule.route;
    if (!route) return false;

    if (layoutFilters.length > 0 && !layoutFilters.includes(getBusLayoutLabel(schedule.busType))) {
      return false;
    }

    const scheduleComfort = schedule.acType === "A/C" ? "AC" : "Non AC";
    if (comfortFilters.length > 0 && !comfortFilters.includes(scheduleComfort)) {
      return false;
    }

    if (boardingPoint) {
      const boardLower = boardingPoint.trim().toLowerCase();
      const busBoardingPoints = getScheduleBoardingPoints(schedule);
      if (!busBoardingPoints.some((pt) => pt.trim().toLowerCase() === boardLower)) {
        return false;
      }
    }

    if (droppingPoint) {
      const dropLower = droppingPoint.trim().toLowerCase();
      const busDroppingPoints = getScheduleDroppingPoints(schedule);
      if (!busDroppingPoints.some((pt) => pt.trim().toLowerCase() === dropLower)) {
        return false;
      }
    }

    return true;
  });

  return filtered.sort((left, right) => {
    if (sortBy === "priceLowToHigh") {
      return (left.price ?? 0) - (right.price ?? 0);
    }
    if (sortBy === "earlyDeparture") {
      return getDepartureMinutes(left.departureTime) - getDepartureMinutes(right.departureTime);
    }
    if (sortBy === "lateDeparture") {
      return getDepartureMinutes(right.departureTime) - getDepartureMinutes(left.departureTime);
    }
    return 0;
  });
};

function SearchableFilterSelect({
  label,
  placeholder,
  options = [],
  value,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, searchTerm]);

  return (
    <div className="rlp-filter-section" ref={dropdownRef}>
      <p className="rlp-filter-label">{label}</p>
      <div className="rlp-dropdown-wrap">
        <button
          type="button"
          className={`rlp-dropdown-trigger ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="rlp-dropdown-selected-text">
            {value || placeholder}
          </span>
          <svg
            className={`rlp-dropdown-chevron ${isOpen ? "rotate" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div className="rlp-dropdown-menu">
            <div className="rlp-dropdown-search-wrap">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                width="14"
                height="14"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="rlp-dropdown-search-input"
                placeholder="Search place..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  className="rlp-dropdown-search-clear"
                  onClick={() => setSearchTerm("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="rlp-dropdown-options-list">
              <div
                className={`rlp-dropdown-option ${!value ? "selected" : ""}`}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                <span>{placeholder} (All)</span>
                {!value && <span className="rlp-dropdown-check">✓</span>}
              </div>

              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`rlp-dropdown-option ${value === opt ? "selected" : ""}`}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    <span>{opt}</span>
                    {value === opt && <span className="rlp-dropdown-check">✓</span>}
                  </div>
                ))
              ) : (
                <div className="rlp-dropdown-no-results">No places found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterContent({
  sortBy,
  setSortBy,
  selectedBusFilters,
  toggleBusFilter,
  routeBoardingPoints,
  displayedBoardingPoints,
  selectedBoardingPoint,
  handleBoardingPointChange,
  routeDroppingPoints,
  displayedDroppingPoints,
  selectedDroppingPoint,
  handleDroppingPointChange,
  radioName = "sortBy",
}) {
  return (
    <>
      <div className="rlp-filter-section">
        <p className="rlp-filter-label">Sort By</p>
        {SORT_OPTIONS.map((option) => (
          <label key={option.value} className={`rlp-checkbox-row ${sortBy === option.value ? "selected" : ""}`}>
            <input
              type="radio"
              name={radioName}
              checked={sortBy === option.value}
              onChange={(e) => {
                e.currentTarget.blur();
                setSortBy(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      <div className="rlp-filter-section">
        <p className="rlp-filter-label">Bus Type</p>
        {BUS_FILTER_OPTIONS.map((option) => (
          <label key={option.value} className={`rlp-checkbox-row ${selectedBusFilters.includes(option.value) ? "selected" : ""}`}>
            <input
              type="checkbox"
              checked={selectedBusFilters.includes(option.value)}
              onChange={(e) => {
                e.currentTarget.blur();
                toggleBusFilter(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {routeBoardingPoints.length > 0 && (
        <SearchableFilterSelect
          label="Boarding Point"
          placeholder="All Boarding Points"
          options={displayedBoardingPoints}
          value={selectedBoardingPoint}
          onChange={handleBoardingPointChange}
        />
      )}

      {routeDroppingPoints.length > 0 && (
        <SearchableFilterSelect
          label="Dropping Point"
          placeholder="All Dropping Points"
          options={displayedDroppingPoints}
          value={selectedDroppingPoint}
          onChange={handleDroppingPointChange}
        />
      )}
    </>
  );
}

export default function RoutesListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoggedIn } = useAuth();

  const passedState = location.state || {};

  const initialSearch = useMemo(() => {
    if (passedState.pickupCity || passedState.droppingCity || passedState.departureDate) {
      return {
        pickupCity: passedState.pickupCity || "",
        droppingCity: passedState.droppingCity || "",
        departureDate: passedState.departureDate || "",
      };
    }
    try {
      const savedSearch = sessionStorage.getItem("busgo_active_search");
      if (savedSearch) {
        return JSON.parse(savedSearch);
      }
    } catch {}
    return {
      pickupCity: "",
      droppingCity: "",
      departureDate: "",
    };
  }, []);

  const pickupCity = initialSearch.pickupCity || "";
  const droppingCity = initialSearch.droppingCity || "";
  const [departureDate, setDepartureDate] = useState(initialSearch.departureDate || "");

  useEffect(() => {
    sessionStorage.setItem(
      "busgo_active_search",
      JSON.stringify({ pickupCity, droppingCity, departureDate })
    );
  }, [pickupCity, droppingCity, departureDate]);

  // Read saved filters matching current route and journey date from sessionStorage
  const savedFilters = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("busgo_routes_listing_filters");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.departureDate === (initialSearch.departureDate || "") &&
          parsed.pickupCity === (initialSearch.pickupCity || "") &&
          parsed.droppingCity === (initialSearch.droppingCity || "")
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading saved filters", e);
    }
    return null;
  }, [initialSearch.departureDate, initialSearch.pickupCity, initialSearch.droppingCity]);

  const [sortBy, setSortBy] = useState(() => savedFilters?.sortBy || "");
  const [selectedBusFilters, setSelectedBusFilters] = useState(() => savedFilters?.selectedBusFilters || []);
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState(() => savedFilters?.selectedBoardingPoint || "");
  const [selectedDroppingPoint, setSelectedDroppingPoint] = useState(() => savedFilters?.selectedDroppingPoint || "");

  useEffect(() => {
    if (sortBy || selectedBusFilters.length > 0 || selectedBoardingPoint || selectedDroppingPoint) {
      sessionStorage.setItem(
        "busgo_routes_listing_filters",
        JSON.stringify({
          departureDate,
          pickupCity,
          droppingCity,
          sortBy,
          selectedBusFilters,
          selectedBoardingPoint,
          selectedDroppingPoint,
        })
      );
    } else {
      sessionStorage.removeItem("busgo_routes_listing_filters");
    }
  }, [sortBy, selectedBusFilters, selectedBoardingPoint, selectedDroppingPoint, departureDate, pickupCity, droppingCity]);

  const isManualSearch = Boolean(
    pickupCity && droppingCity && !passedState.exploreAll
  );
  const journeyDateButtonText = isManualSearch ? "Change Journey Date" : "Select Journey Date";

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState(departureDate || "");
  const modalDateInputRef = useRef(null);

  const [pendingSortBy, setPendingSortBy] = useState(sortBy);
  const [pendingBusFilters, setPendingBusFilters] = useState(selectedBusFilters);
  const [pendingBoardingPoint, setPendingBoardingPoint] = useState(selectedBoardingPoint);
  const [pendingDroppingPoint, setPendingDroppingPoint] = useState(selectedDroppingPoint);

  const handleOpenFilterModal = (e) => {
    e.currentTarget.blur();
    setPendingSortBy(sortBy);
    setPendingBusFilters(selectedBusFilters);
    setPendingBoardingPoint(selectedBoardingPoint);
    setPendingDroppingPoint(selectedDroppingPoint);
    setFilterModalOpen(true);
  };

  const handleApplyModalFilters = () => {
    setSortBy(pendingSortBy);
    setSelectedBusFilters(pendingBusFilters);
    setSelectedBoardingPoint(pendingBoardingPoint);
    setSelectedDroppingPoint(pendingDroppingPoint);
    setFilterModalOpen(false);
  };

  const handleResetModalFilters = () => {
    setPendingSortBy("");
    setPendingBusFilters([]);
    setPendingBoardingPoint("");
    setPendingDroppingPoint("");
  };

  const togglePendingBusFilter = (filterValue) => {
    setPendingBusFilters((currentFilters) =>
      currentFilters.includes(filterValue)
        ? currentFilters.filter((filter) => filter !== filterValue)
        : [...currentFilters, filterValue]
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sortBy) count++;
    count += selectedBusFilters.length;
    if (selectedBoardingPoint) count++;
    if (selectedDroppingPoint) count++;
    return count;
  }, [sortBy, selectedBusFilters, selectedBoardingPoint, selectedDroppingPoint]);

  useEffect(() => {
    if (departureDate) {
      setPendingDate(departureDate);
    }
  }, [departureDate]);

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await api.get("/schedules");
        setSchedules(response.data || []);
      } catch (err) {
        setError("Failed to load data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const handleApplyNewJourneyDate = (newDate) => {
    if (!newDate) return;
    if (newDate !== departureDate) {
      // Applied filters removed on another journey date
      setSortBy("");
      setSelectedBusFilters([]);
      setSelectedBoardingPoint("");
      setSelectedDroppingPoint("");
      setPendingSortBy("");
      setPendingBusFilters([]);
      setPendingBoardingPoint("");
      setPendingDroppingPoint("");
      sessionStorage.removeItem("busgo_routes_listing_filters");
    }
    setDepartureDate(newDate);
    sessionStorage.setItem(
      "busgo_active_search",
      JSON.stringify({ pickupCity, droppingCity, departureDate: newDate })
    );
    navigate(".", {
      replace: true,
      state: {
        ...passedState,
        pickupCity,
        droppingCity,
        departureDate: newDate,
      },
    });
    setCalendarOpen(false);
  };

  const handleReset = () => {
    setSortBy("");
    setSelectedBusFilters([]);
    setSelectedBoardingPoint("");
    setSelectedDroppingPoint("");
    setPendingSortBy("");
    setPendingBusFilters([]);
    setPendingBoardingPoint("");
    setPendingDroppingPoint("");
    sessionStorage.removeItem("busgo_routes_listing_filters");
  };

  const handleSelectSeat = (schedule) => {
    if (isAdmin) {
      navigate("/admin/dashboard");
      return;
    }
    const navState = {
      selectedBoardingPoint,
      selectedDroppingPoint,
    };
    if (!isLoggedIn) {
      navigate("/login", {
        state: {
          redirectTo: `/booking/${schedule.id}`,
          ...navState,
          redirectState: navState,
        },
      });
      return;
    }
    navigate(`/booking/${schedule.id}`, { state: navState });
  };

  const toggleBusFilter = (filterValue) => {
    setSelectedBusFilters((currentFilters) =>
      currentFilters.includes(filterValue)
        ? currentFilters.filter((filter) => filter !== filterValue)
        : [...currentFilters, filterValue]
    );
  };

  const upcomingSchedules = useMemo(
    () => schedules.filter((schedule) => isTodayOrFuture(schedule.travelDate)),
    [schedules]
  );

  const selectedLayoutFilters = selectedBusFilters.filter((filter) => filter === "Seater" || filter === "Sleeper");
  const selectedComfortFilters = selectedBusFilters.filter((filter) => filter === "AC" || filter === "Non AC");
  const hasSearchCriteria = Boolean(pickupCity || droppingCity || departureDate);
  const journeySummary = [pickupCity, droppingCity].filter(Boolean).join(" To ");
  const formattedJourneyDate = formatJourneyDate(departureDate);
  const selectedSortOption = SORT_OPTIONS.find((opt) => opt.value === sortBy);

  // Determine fromCity and toCity to exclude them from boarding and dropping points
  const excludedEndpoints = useMemo(() => {
    const set = new Set();
    if (pickupCity) set.add(pickupCity.trim().toLowerCase());
    if (droppingCity) set.add(droppingCity.trim().toLowerCase());
    upcomingSchedules.forEach((schedule) => {
      const route = schedule.route;
      if (!route) return;
      if (pickupCity && route.fromCity !== pickupCity) return;
      if (droppingCity && route.toCity !== droppingCity) return;
      if (route.fromCity) set.add(route.fromCity.trim().toLowerCase());
      if (route.toCity) set.add(route.toCity.trim().toLowerCase());
    });
    return set;
  }, [pickupCity, droppingCity, upcomingSchedules]);

  // Schedules matching route and date before applying sidebar filters
  const routeSchedules = useMemo(() => {
    return upcomingSchedules.filter((schedule) => {
      const route = schedule.route;
      if (!route) return false;
      if (pickupCity && route.fromCity !== pickupCity) return false;
      if (droppingCity && route.toCity !== droppingCity) return false;
      if (departureDate && schedule.travelDate !== departureDate) return false;
      return true;
    });
  }, [upcomingSchedules, pickupCity, droppingCity, departureDate]);

  const targetSchedulesForFilter = useMemo(() => {
    return hasSearchCriteria ? routeSchedules : upcomingSchedules;
  }, [hasSearchCriteria, routeSchedules, upcomingSchedules]);

  // Collect boarding and dropping points of the active schedules (excluding from and to cities)
  const routeBoardingPoints = useMemo(() => {
    const pointsSet = new Set();
    targetSchedulesForFilter.forEach((schedule) => {
      const points = getScheduleBoardingPoints(schedule);
      points.forEach((pt) => {
        if (!excludedEndpoints.has(pt.toLowerCase())) {
          pointsSet.add(pt);
        }
      });
    });
    return Array.from(pointsSet).sort((a, b) => a.localeCompare(b));
  }, [targetSchedulesForFilter, excludedEndpoints]);

  const routeDroppingPoints = useMemo(() => {
    const pointsSet = new Set();
    targetSchedulesForFilter.forEach((schedule) => {
      const points = getScheduleDroppingPoints(schedule);
      points.forEach((pt) => {
        if (!excludedEndpoints.has(pt.toLowerCase())) {
          pointsSet.add(pt);
        }
      });
    });
    return Array.from(pointsSet).sort((a, b) => a.localeCompare(b));
  }, [targetSchedulesForFilter, excludedEndpoints]);

  // When explore more routes is clicked (not manual search), selecting a boarding point hides it from dropping points and vice versa.
  // In manual search mode (searched with from, to, date), this mutual exclusion does not apply.
  const displayedBoardingPoints = useMemo(() => {
    if (isManualSearch || !selectedDroppingPoint) {
      return routeBoardingPoints;
    }
    const dropLower = selectedDroppingPoint.trim().toLowerCase();
    return routeBoardingPoints.filter(
      (point) => point.trim().toLowerCase() !== dropLower
    );
  }, [isManualSearch, selectedDroppingPoint, routeBoardingPoints]);

  const displayedDroppingPoints = useMemo(() => {
    if (isManualSearch || !selectedBoardingPoint) {
      return routeDroppingPoints;
    }
    const boardLower = selectedBoardingPoint.trim().toLowerCase();
    return routeDroppingPoints.filter(
      (point) => point.trim().toLowerCase() !== boardLower
    );
  }, [isManualSearch, selectedBoardingPoint, routeDroppingPoints]);

  const handleBoardingPointChange = (pt) => {
    setSelectedBoardingPoint(pt);
    if (!isManualSearch && pt && selectedDroppingPoint && pt.trim().toLowerCase() === selectedDroppingPoint.trim().toLowerCase()) {
      setSelectedDroppingPoint("");
    }
  };

  const handleDroppingPointChange = (pt) => {
    setSelectedDroppingPoint(pt);
    if (!isManualSearch && pt && selectedBoardingPoint && pt.trim().toLowerCase() === selectedBoardingPoint.trim().toLowerCase()) {
      setSelectedBoardingPoint("");
    }
  };

  const modalDisplayedBoardingPoints = useMemo(() => {
    if (isManualSearch || !pendingDroppingPoint) {
      return routeBoardingPoints;
    }
    const dropLower = pendingDroppingPoint.trim().toLowerCase();
    return routeBoardingPoints.filter(
      (point) => point.trim().toLowerCase() !== dropLower
    );
  }, [isManualSearch, pendingDroppingPoint, routeBoardingPoints]);

  const modalDisplayedDroppingPoints = useMemo(() => {
    if (isManualSearch || !pendingBoardingPoint) {
      return routeDroppingPoints;
    }
    const boardLower = pendingBoardingPoint.trim().toLowerCase();
    return routeDroppingPoints.filter(
      (point) => point.trim().toLowerCase() !== boardLower
    );
  }, [isManualSearch, pendingBoardingPoint, routeDroppingPoints]);

  const handlePendingBoardingPointChange = (pt) => {
    setPendingBoardingPoint(pt);
    if (!isManualSearch && pt && pendingDroppingPoint && pt.trim().toLowerCase() === pendingDroppingPoint.trim().toLowerCase()) {
      setPendingDroppingPoint("");
    }
  };

  const handlePendingDroppingPointChange = (pt) => {
    setPendingDroppingPoint(pt);
    if (!isManualSearch && pt && pendingBoardingPoint && pt.trim().toLowerCase() === pendingBoardingPoint.trim().toLowerCase()) {
      setPendingBoardingPoint("");
    }
  };

  const hasRouteBuses = hasSearchCriteria ? routeSchedules.length > 0 : upcomingSchedules.length > 0;

  const sortedSchedules = useMemo(() => {
    const baseList = hasSearchCriteria ? routeSchedules : upcomingSchedules;
    return filterSchedulesList(baseList, {
      busFilters: selectedBusFilters,
      boardingPoint: selectedBoardingPoint,
      droppingPoint: selectedDroppingPoint,
      sortBy,
    });
  }, [
    hasSearchCriteria,
    routeSchedules,
    upcomingSchedules,
    selectedBusFilters,
    selectedBoardingPoint,
    selectedDroppingPoint,
    sortBy,
  ]);

  const pendingSortedSchedules = useMemo(() => {
    const baseList = hasSearchCriteria ? routeSchedules : upcomingSchedules;
    return filterSchedulesList(baseList, {
      busFilters: pendingBusFilters,
      boardingPoint: pendingBoardingPoint,
      droppingPoint: pendingDroppingPoint,
      sortBy: pendingSortBy,
    });
  }, [
    hasSearchCriteria,
    routeSchedules,
    upcomingSchedules,
    pendingBusFilters,
    pendingBoardingPoint,
    pendingDroppingPoint,
    pendingSortBy,
  ]);

  return (
    <div className="rlp-page">
      <div className="rlp-page-header">
        <div className="rlp-page-header-copy">
          <p className="rlp-page-eyebrow">Available buses</p>
          <h1>{journeySummary || "Available Buses"}</h1>
          <p className="rlp-page-subtitle">
            {hasSearchCriteria
              ? "Showing buses for your selected journey."
              : "Showing all upcoming buses. Start a new search anytime from the home page."}
          </p>
        </div>

        <div className="rlp-page-header-actions">
          {hasRouteBuses && (
            <button
              type="button"
              className="rlp-mobile-filter-btn"
              onClick={handleOpenFilterModal}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="rlp-mobile-filter-badge">{activeFilterCount}</span>
              )}
            </button>
          )}
          <button
            type="button"
            className="rlp-change-search-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setCalendarOpen(true);
            }}
          >
            {journeyDateButtonText}
          </button>
        </div>
      </div>

      {!loading && !error && (hasRouteBuses || hasSearchCriteria || sortBy || selectedBusFilters.length > 0 || selectedBoardingPoint || selectedDroppingPoint) && (
        <div className="rlp-summary-strip">
          <span className="rlp-results-count">
            {sortedSchedules.length} bus{sortedSchedules.length === 1 ? "" : "es"} found
          </span>
          {formattedJourneyDate && <span className="rlp-summary-pill">Journey Date: {formattedJourneyDate}</span>}
          {selectedSortOption && (
            <span
              className="rlp-summary-pill rlp-summary-pill-filter"
              onClick={() => setSortBy("")}
            >
              Sort: {selectedSortOption.label}
              <button
                type="button"
                className="rlp-pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortBy("");
                }}
                aria-label="Remove sort filter"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          )}
          {selectedBusFilters.map((busFilter) => (
            <span
              key={busFilter}
              className="rlp-summary-pill rlp-summary-pill-filter"
              onClick={() => toggleBusFilter(busFilter)}
            >
              Bus Type: {busFilter}
              <button
                type="button"
                className="rlp-pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBusFilter(busFilter);
                }}
                aria-label={`Remove ${busFilter} filter`}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
          {selectedBoardingPoint && (
            <span
              className="rlp-summary-pill rlp-summary-pill-filter"
              onClick={() => setSelectedBoardingPoint("")}
            >
              Boarding: {selectedBoardingPoint}
              <button
                type="button"
                className="rlp-pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBoardingPoint("");
                }}
                aria-label="Remove boarding point filter"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          )}
          {selectedDroppingPoint && (
            <span
              className="rlp-summary-pill rlp-summary-pill-filter"
              onClick={() => setSelectedDroppingPoint("")}
            >
              Dropping: {selectedDroppingPoint}
              <button
                type="button"
                className="rlp-pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDroppingPoint("");
                }}
                aria-label="Remove dropping point filter"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="rlp-page-error-wrap">
          <div className="rlp-error">Warning: {error}</div>
        </div>
      )}

      {/* No buses available for this route: remove bus word above text and do not show filtering */}
      {!loading && !error && !hasRouteBuses && hasSearchCriteria && (
        <div className="rlp-page-error-wrap">
          <div className="rlp-empty rlp-empty-summary">
            <h3>No buses available for this route</h3>
            <p>Try another date or change your search from the home page.</p>
            <button className="rlp-reset-btn-lg" onClick={() => setCalendarOpen(true)}>
              {journeyDateButtonText}
            </button>
          </div>
        </div>
      )}

      {!loading && !error && !hasRouteBuses && !hasSearchCriteria && (
        <div className="rlp-page-error-wrap">
          <div className="rlp-empty rlp-empty-summary">
            <h3>No upcoming buses found</h3>
            <p>Try again after schedules are added or use the filters later.</p>
          </div>
        </div>
      )}

      {/* Only show filtering and results body when buses are available for the route */}
      {!loading && !error && hasRouteBuses && (
        <div className="rlp-body">
          <aside className="rlp-sidebar">
            <div className="rlp-sidebar-header">
              <h3>Filter</h3>
              <button className="rlp-reset-btn" onClick={handleReset}>Reset All</button>
            </div>

            <FilterContent
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedBusFilters={selectedBusFilters}
              toggleBusFilter={toggleBusFilter}
              routeBoardingPoints={routeBoardingPoints}
              displayedBoardingPoints={displayedBoardingPoints}
              selectedBoardingPoint={selectedBoardingPoint}
              handleBoardingPointChange={handleBoardingPointChange}
              routeDroppingPoints={routeDroppingPoints}
              displayedDroppingPoints={displayedDroppingPoints}
              selectedDroppingPoint={selectedDroppingPoint}
              handleDroppingPointChange={handleDroppingPointChange}
              radioName="sidebar_sortBy"
            />
          </aside>

          <div className="rlp-results">
            {sortedSchedules.length === 0 ? (
              <div className="rlp-empty rlp-empty-filter">
                <h3>No bus available for this filter</h3>
                <p>Try clearing or adjusting some filters to view available buses.</p>
                <button className="rlp-reset-btn-lg rlp-reset-filter-btn" onClick={handleReset}>
                  Reset Filters
                </button>
              </div>
            ) : (
              sortedSchedules.map((schedule) => {
                const route = schedule.route;
                if (!route) {
                  return null;
                }

                return (
                  <div
                    className="rlp-card"
                    key={schedule.id}
                    onClick={() => handleSelectSeat(schedule)}
                  >
                    <div className="rlp-card-top">
                      <div className="rlp-card-title-row">
                        <div className="rlp-card-title-group">
                          <h3 className="rlp-card-title">
                            {route.fromCity} - {route.toCity}
                          </h3>
                          <div className="rlp-card-tags">
                            <span className={schedule.acType === "A/C" ? "rlp-tag rlp-tag-ac" : "rlp-tag rlp-tag-nonac"}>
                              {schedule.acType === "A/C" ? "A/C" : "Non-A/C"}
                            </span>
                            <span className={getBusLayoutLabel(schedule.busType) === "Sleeper" ? "rlp-tag rlp-tag-layout-sleeper" : "rlp-tag rlp-tag-layout-seater"}>
                              {getBusLayoutLabel(schedule.busType)}
                            </span>
                            <span className="rlp-tag rlp-tag-blue">{schedule.busNumber}</span>
                            {!hasSearchCriteria && schedule.travelDate && (
                              <span className="rlp-tag rlp-tag-date">
                                📅 {formatJourneyDate(schedule.travelDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="rlp-card-price-wrap">
                          <span className="rlp-card-price">₹{(schedule.price ?? 0).toLocaleString()}</span>
                          <span className="rlp-card-availability">Price per seat</span>
                        </div>
                      </div>
                    </div>

                    <div className="rlp-card-bottom">
                      <div className="rlp-card-time-row">
                        <div className="rlp-time-block">
                          <span className="rlp-time">{formatTimeValue(schedule.departureTime)}</span>
                          <span className="rlp-city">{route.fromCity}</span>
                        </div>
                        <div className="rlp-duration-block">
                          <span className="rlp-arrow-line">&rarr;</span>
                          <span className="rlp-duration-text">{calculateScheduleDuration(schedule.departureTime, schedule.arrivalTime, schedule.arrivalDay) || schedule.duration || "-"}</span>
                        </div>
                        <div className="rlp-time-block">
                          <span className="rlp-time">{formatTimeValue(schedule.arrivalTime)}</span>
                          <span className="rlp-city">{route.toCity}</span>
                        </div>
                      </div>

                      <button
                        className="rlp-select-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSeat(schedule);
                        }}
                      >
                        Select Seat
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="rlp-loading">
          <div className="rlp-spinner" />
          <p>Loading schedules...</p>
        </div>
      )}

      {/* Change Journey Date Calendar Modal */}
      {calendarOpen && (
        <div
          className="rlp-modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setCalendarOpen(false);
          }}
        >
          <div className="rlp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rlp-modal-header">
              <h3>{journeyDateButtonText}</h3>
              <button
                type="button"
                className="rlp-modal-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setCalendarOpen(false);
                }}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="rlp-modal-body">
              <label htmlFor="change-journey-date-input" className="rlp-modal-label">
                Select New Travel Date:
              </label>
              <div className="rlp-modal-date-wrap">
                <input
                  id="change-journey-date-input"
                  ref={modalDateInputRef}
                  type="date"
                  className="rlp-modal-date-input"
                  value={pendingDate}
                  min={getLocalDateString()}
                  onChange={(e) => setPendingDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {}
                  }}
                />
                <button
                  type="button"
                  className="rlp-modal-calendar-btn"
                  onClick={() => {
                    try {
                      modalDateInputRef.current?.showPicker();
                    } catch {}
                  }}
                  tabIndex="-1"
                  aria-label="Select date"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
              <div className="rlp-quick-dates">
                <button
                  type="button"
                  className="rlp-quick-btn"
                  onClick={() => {
                    setPendingDate(getLocalDateString());
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="rlp-quick-btn"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setPendingDate(getLocalDateString(d));
                  }}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            <div className="rlp-modal-actions">
              <button
                type="button"
                className="rlp-modal-btn rlp-modal-cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  setCalendarOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rlp-modal-btn rlp-modal-apply"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyNewJourneyDate(pendingDate);
                }}
                disabled={!pendingDate}
              >
                Apply Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal */}
      {filterModalOpen && (
        <div
          className="rlp-modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setFilterModalOpen(false);
          }}
        >
          <div className="rlp-modal-content rlp-filter-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rlp-modal-header rlp-filter-modal-header">
              <h3>Filter</h3>
              <button
                type="button"
                className="rlp-modal-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterModalOpen(false);
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="rlp-modal-body rlp-filter-modal-body">
              <FilterContent
                sortBy={pendingSortBy}
                setSortBy={setPendingSortBy}
                selectedBusFilters={pendingBusFilters}
                toggleBusFilter={togglePendingBusFilter}
                routeBoardingPoints={routeBoardingPoints}
                displayedBoardingPoints={modalDisplayedBoardingPoints}
                selectedBoardingPoint={pendingBoardingPoint}
                handleBoardingPointChange={handlePendingBoardingPointChange}
                routeDroppingPoints={routeDroppingPoints}
                displayedDroppingPoints={modalDisplayedDroppingPoints}
                selectedDroppingPoint={pendingDroppingPoint}
                handleDroppingPointChange={handlePendingDroppingPointChange}
                radioName="mobile_sortBy"
              />
            </div>

            <div className="rlp-modal-actions rlp-filter-modal-actions">
              <button
                type="button"
                className="rlp-modal-btn rlp-filter-modal-reset-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleResetModalFilters();
                }}
              >
                Reset All
              </button>
              <button
                type="button"
                className="rlp-modal-btn rlp-modal-apply"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyModalFilters();
                }}
              >
                Apply Filters ({pendingSortedSchedules.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
