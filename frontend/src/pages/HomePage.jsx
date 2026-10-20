import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./HomePage.css";

function CitySearchSelect({
  id,
  label,
  icon,
  placeholder,
  value,
  onChange,
  options = [],
  disabled = false,
  headerAction = null,
  onError = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (value) {
          setQuery(value);
        } else {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const lower = query.trim().toLowerCase();
    return options.filter((city) => city.trim().toLowerCase().includes(lower));
  }, [options, query]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    setIsOpen(true);
    if (onError) onError("");

    const match = options.find((opt) => opt.trim().toLowerCase() === text.trim().toLowerCase());
    if (match) {
      onChange(match);
    } else {
      if (value) onChange("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const trimmed = query.trim();
      if (!trimmed) return;
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
        if (onError) onError("");
      } else {
        setIsOpen(false);
        if (onError) {
          onError("No matching city found.");
        }
      }
    }
  };

  const handleSelect = (city) => {
    setQuery(city);
    onChange(city);
    setIsOpen(false);
    if (onError) onError("");
  };

  return (
    <div className={`search-field ${headerAction ? "search-field-with-swap" : ""}`} ref={containerRef}>
      <div className="search-field-header">
        <label htmlFor={id}>
          {icon}
          {label}
        </label>
        {headerAction}
      </div>
      <div className={`city-autocomplete-wrap ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}>
        <input
          id={id}
          type="text"
          className="city-autocomplete-input"
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
            className="city-clear-btn"
            onClick={(e) => {
              e.stopPropagation();
              setQuery("");
              onChange("");
              if (onError) onError("");
              setIsOpen(true);
            }}
            title="Clear"
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="city-toggle-btn"
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          disabled={disabled}
          title="Toggle options"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && !disabled && (
          <ul className="city-dropdown-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((city) => (
                <li
                  key={city}
                  className={`city-dropdown-item ${city === value ? "selected" : ""}`}
                  onClick={() => handleSelect(city)}
                >
                  <span className="city-item-name">{city}</span>
                  {city === value && <span className="city-check-mark">✓</span>}
                </li>
              ))
            ) : (
              <li className="city-dropdown-empty">No matching city found</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function HomePage() {
  const [routes, setRoutes] = useState([]);
  const [routesLoadError, setRoutesLoadError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [droppingCity, setDroppingCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [isDateTyping, setIsDateTyping] = useState(false);
  const homeDateInputRef = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  const fetchRoutes = async () => {
    try {
      setRoutesLoadError("");
      const response = await api.get("/routes");
      setRoutes(response.data || []);
    } catch (err) {
      console.error("Failed to load routes for search suggestions", err);
      setRoutesLoadError("Unable to connect to route server. Please check your connection.");
    }
  };

  const fromCities = useMemo(() => {
    let cities = [];
    const targetTo = droppingCity?.trim().toLowerCase();
    if (targetTo) {
      cities = routes
        .filter((r) => r.toCity && r.toCity.trim().toLowerCase() === targetTo)
        .map((r) => r.fromCity?.trim())
        .filter(Boolean);
    } else {
      cities = routes.map((r) => r.fromCity?.trim()).filter(Boolean);
    }
    if (targetTo) {
      cities = cities.filter((c) => c.toLowerCase() !== targetTo);
    }
    return [...new Set(cities)];
  }, [routes, droppingCity]);

  const toCities = useMemo(() => {
    let cities = [];
    const targetFrom = pickupCity?.trim().toLowerCase();
    if (targetFrom) {
      cities = routes
        .filter((r) => r.fromCity && r.fromCity.trim().toLowerCase() === targetFrom)
        .map((r) => r.toCity?.trim())
        .filter(Boolean);
    } else {
      cities = routes.map((r) => r.toCity?.trim()).filter(Boolean);
    }
    if (targetFrom) {
      cities = cities.filter((c) => c.toLowerCase() !== targetFrom);
    }
    return [...new Set(cities)];
  }, [routes, pickupCity]);

  const handleSwapCities = (e) => {
    e.preventDefault();
    if (!pickupCity && !droppingCity) return;
    const currentFrom = pickupCity?.trim() || "";
    const currentTo = droppingCity?.trim() || "";

    setPickupCity(currentTo);
    if (currentTo && currentFrom) {
      const validTo = routes.some(
        (r) =>
          r.fromCity?.trim().toLowerCase() === currentTo.toLowerCase() &&
          r.toCity?.trim().toLowerCase() === currentFrom.toLowerCase()
      );
      setDroppingCity(validTo ? currentFrom : "");
    } else {
      setDroppingCity(currentFrom);
    }
    setSearchError("");
  };

  const handleFindTickets = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!pickupCity) {
      setSearchError("Please select a departure city (From).");
      return;
    }
    if (!droppingCity) {
      setSearchError("Please select a destination city (To).");
      return;
    }
    if (!departureDate) {
      setSearchError("Please select the date of journey.");
      return;
    }

    const todayStr = getLocalDateString();
    if (departureDate < todayStr) {
      setSearchError("Please select today or a future journey date.");
      return;
    }

    setSearchError("");
    navigate("/routes-listing", {
      state: { pickupCity, droppingCity, departureDate },
    });
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="hero-left">
          <h1 className="hero-title">
            GET YOUR TICKETS<br />
            WITH <span className="hero-highlight">JUST 3 STEPS</span>
          </h1>
          <p className="hero-subtitle">
            Book your bus tickets easily and travel comfortably
          </p>
          <div className="hero-contact">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.17 4 2 2 0 012.18 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              +91 7285983856
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              info@busgo.com
            </span>
          </div>
        </div>

        {/* Hero Search Card */}
        <form className="hero-search-card" onSubmit={handleFindTickets} noValidate>
          {routesLoadError && (
            <div className="hero-routes-error">
              <span>{routesLoadError}</span>
              <button type="button" onClick={fetchRoutes} className="hero-retry-btn">
                Retry
              </button>
            </div>
          )}

          {searchError && <div className="hero-search-error">⚠️ {searchError}</div>}

          <CitySearchSelect
            id="search-from-city"
            label="From"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="16" height="16">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            placeholder="Type or select departure city"
            value={pickupCity}
            onChange={(city) => {
              setPickupCity(city);
              if (city && droppingCity) {
                const isValidPair = routes.some(
                  (r) =>
                    r.fromCity?.trim().toLowerCase() === city.trim().toLowerCase() &&
                    r.toCity?.trim().toLowerCase() === droppingCity.trim().toLowerCase()
                );
                if (!isValidPair) {
                  setDroppingCity("");
                }
              }
              setSearchError("");
            }}
            options={fromCities}
            onError={setSearchError}
          />

          <CitySearchSelect
            id="search-to-city"
            label="To"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="16" height="16">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            placeholder="Type or select destination city"
            value={droppingCity}
            onChange={(city) => {
              setDroppingCity(city);
              if (city && pickupCity) {
                const isValidPair = routes.some(
                  (r) =>
                    r.fromCity?.trim().toLowerCase() === pickupCity.trim().toLowerCase() &&
                    r.toCity?.trim().toLowerCase() === city.trim().toLowerCase()
                );
                if (!isValidPair) {
                  setPickupCity("");
                }
              }
              setSearchError("");
            }}
            options={toCities}
            onError={setSearchError}
            headerAction={
              <div className="swap-cities-wrap">
                <button
                  type="button"
                  className="swap-cities-btn"
                  onClick={handleSwapCities}
                  aria-label="Swap departure and destination cities"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            }
          />

          <div className="search-field">
            <label htmlFor="search-departure-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Date of Journey
            </label>
            <div
              className="date-input-wrap"
              onClick={() => {
                try {
                  homeDateInputRef.current?.showPicker();
                } catch {}
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <input
                id="search-departure-date"
                ref={homeDateInputRef}
                type="date"
                className={!departureDate && !isDateTyping ? "date-input-empty" : "date-input-typing"}
                value={departureDate}
                onInput={() => setIsDateTyping(true)}
                onKeyDown={(e) => {
                  if (e.key !== "Tab" && e.key !== "Escape") {
                    setIsDateTyping(true);
                  }
                }}
                onChange={(e) => {
                  setDepartureDate(e.target.value);
                  setSearchError("");
                  if (e.target.value) {
                    setIsDateTyping(true);
                  } else {
                    setIsDateTyping(false);
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value && !departureDate) {
                    setIsDateTyping(false);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                min={getLocalDateString()}
              />
              <button
                type="button"
                className="date-calendar-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    homeDateInputRef.current?.showPicker();
                  } catch {}
                }}
                tabIndex="-1"
                aria-label="Open calendar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="find-tickets-btn">
            Find Tickets
          </button>
        </form>
      </section>

      {/* Why Choose BusGo Section */}
      <section className="why-section">
        <h2 className="why-title">Why Choose BusGo?</h2>
        <p className="why-subtitle">Your trusted travel partner</p>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon-wrap why-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b39d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Safe &amp; Secure</h3>
            <p>Your safety is our priority with verified buses and drivers</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap why-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3>On-Time Service</h3>
            <p>Punctual departures and arrivals for your convenience</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap why-icon-purple">
              <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <text x="12" y="19" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#7c3aed">₹</text>
              </svg>
            </div>
            <h3>Best Prices</h3>
            <p>Affordable fares with no hidden charges</p>
          </div>
        </div>
      </section>

      {/* Peace of Mind Assurance Banner */}
      <section className="primo-section">
        <div className="primo-card">
          <div className="primo-header">
            <h2 className="primo-heading">Travel with Absolute Peace of Mind</h2>
            <p className="primo-lead">
              Our buses adhere to rigorous standards for safety, hygiene, and punctual departures, guaranteeing an exceptional road travel experience.
            </p>
          </div>

          <div className="primo-grid count-3">
            <div className="primo-feature">
              <div className="primo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="24" height="24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="primo-feature-text">
                <h4>Verified &amp; Trained Drivers</h4>
                <p>Background-checked, experienced captains trained in defensive driving and passenger courtesy.</p>
              </div>
            </div>

            <div className="primo-feature">
              <div className="primo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="24" height="24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="primo-feature-text">
                <h4>Deep Sanitization &amp; Hygiene</h4>
                <p>Buses undergo thorough sanitization before every trip with freshly laundered linens in sleeper berths.</p>
              </div>
            </div>

            <div className="primo-feature">
              <div className="primo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="24" height="24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className="primo-feature-text">
                <h4>24/7 Roadside Assistance</h4>
                <p>Dedicated central emergency response desk available to resolve any travel or breakdown queries immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
