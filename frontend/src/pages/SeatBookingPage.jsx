import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./SeatBookingPage.css";

const SEAT_HOLD_DURATION_MINUTES = 5;
const SEAT_HOLD_REFRESH_INTERVAL_MS = 30000;
const SEAT_HOLD_STORAGE_PREFIX = "busgo-seat-hold-";
const GENDER_OPTIONS = ["Male", "Female", "Other"];

const formatTimeValue = (value) => (value ? value.substring(0, 5) : "");
const getBusLayoutLabel = (busType) => (busType === "Sleeper" ? "Sleeper" : "Seater");

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isTodayOrFuture = (travelDate) => {
  if (!travelDate) {
    return false;
  }

  const parsedDate = new Date(`${travelDate}T00:00:00`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate >= getStartOfToday();
};

const formatHoldCountdown = (timeLeftMs) => {
  const totalSeconds = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const parseHoldExpiryMs = (expiresAt) => {
  if (!expiresAt) {
    return Number.NaN;
  }

  if (typeof expiresAt === "number") {
    return expiresAt;
  }

  const normalizedValue = String(expiresAt).replace(/\.(\d{3})\d+/, ".$1");
  const parsedDate = new Date(normalizedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getTime();
  }

  return Number.NaN;
};

const getHoldStorageKey = (scheduleId) => `${SEAT_HOLD_STORAGE_PREFIX}${scheduleId}`;

const getOrCreateHoldToken = (scheduleId) => {
  if (!scheduleId) {
    return "";
  }

  const storageKey = getHoldStorageKey(scheduleId);
  const existingToken = window.sessionStorage.getItem(storageKey);
  if (existingToken) {
    return existingToken;
  }

  const nextToken = window.crypto?.randomUUID?.()
    ?? `hold-${scheduleId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.sessionStorage.setItem(storageKey, nextToken);
  return nextToken;
};

const getBoardingOptions = (schedule) => {
  if (!schedule) {
    return [];
  }

  if (Array.isArray(schedule.boardingStops) && schedule.boardingStops.length > 0) {
    return schedule.boardingStops;
  }

  if (schedule.route?.fromCity) {
    return [{ point: schedule.route.fromCity, time: schedule.departureTime }];
  }

  return [];
};

const getDroppingOptions = (schedule) => {
  if (!schedule) {
    return [];
  }

  if (Array.isArray(schedule.droppingStops) && schedule.droppingStops.length > 0) {
    return schedule.droppingStops;
  }

  if (schedule.route?.toCity) {
    return [{ point: schedule.route.toCity, time: schedule.arrivalTime ?? schedule.departureTime }];
  }

  return [];
};

const createPassengerDetail = (seatNumber, existingDetail = null) => ({
  seatNumber,
  name: existingDetail?.name ?? "",
  gender: existingDetail?.gender ?? "",
});

export default function SeatBookingPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isLoggedIn } = useAuth();
  const holdExpiryHandledRef = useRef(false);
  const holdSyncIntervalRef = useRef(null);

  const [schedule, setSchedule] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerDetails, setPassengerDetails] = useState([]);
  const [email, setEmail] = useState(user?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone ?? "");
  const [boardingPoint, setBoardingPoint] = useState("");
  const [droppingPoint, setDroppingPoint] = useState("");
  const [holdToken, setHoldToken] = useState("");
  const [holdExpiresAtMs, setHoldExpiresAtMs] = useState(0);
  const [holdTimeLeft, setHoldTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const pricePerSeat = schedule?.price ?? schedule?.route?.price ?? 0;
  const totalPrice = pricePerSeat * selectedSeats.length;
  const route = schedule?.route;
  const busLayoutType = getBusLayoutLabel(schedule?.busType);
  const boardingOptions = getBoardingOptions(schedule);
  const droppingOptions = getDroppingOptions(schedule);
  const selectedBoardingStop = boardingOptions.find((stop) => stop.point === boardingPoint);
  const selectedDroppingStop = droppingOptions.find((stop) => stop.point === droppingPoint);
  const isScheduleAvailable = schedule ? isTodayOrFuture(schedule.travelDate) : true;
  const passengerNameSummary = passengerDetails
    .map((detail) => detail.name.trim())
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    } else if (!isLoggedIn) {
      navigate("/login", { state: { redirectTo: `/booking/${scheduleId}` }, replace: true });
    }
  }, [isAdmin, isLoggedIn, navigate, scheduleId]);

  useEffect(() => {
    setEmail(user?.email ?? "");
    setPhoneNumber(user?.phone ?? "");
  }, [user?.email, user?.phone]);

  const fetchUnavailableSeats = async (currentHoldToken = holdToken) => {
    try {
      const response = await api.get(`/bookings/schedule/${scheduleId}/booked-seats`, {
        params: currentHoldToken ? { holdToken: currentHoldToken } : {},
      });
      const unavailableSeats = Array.isArray(response.data) ? response.data : [];
      setBookedSeats(unavailableSeats);
      return unavailableSeats;
    } catch (err) {
      setError((currentError) => currentError || "Failed to load booked seats.");
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleDetails = async () => {
    try {
      const response = await api.get("/schedules");
      const foundSchedule = response.data.find((item) => item.id === Number(scheduleId));

      if (!foundSchedule) {
        setError("Schedule not found.");
        return;
      }

      setSchedule(foundSchedule);

      const bOptions = getBoardingOptions(foundSchedule);
      const dOptions = getDroppingOptions(foundSchedule);
      let passedB = location.state?.selectedBoardingPoint;
      let passedD = location.state?.selectedDroppingPoint;

      if (!passedB && !passedD) {
        const stored = sessionStorage.getItem("busgo_login_redirect_state");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            passedB = parsed.selectedBoardingPoint;
            passedD = parsed.selectedDroppingPoint;
          } catch {
            // ignore
          }
        }
      }
      sessionStorage.removeItem("busgo_login_redirect_state");

      const matchedB = passedB
        ? bOptions.find((o) => o.point?.trim().toLowerCase() === passedB.trim().toLowerCase())?.point
        : null;
      const matchedD = passedD
        ? dOptions.find((o) => o.point?.trim().toLowerCase() === passedD.trim().toLowerCase())?.point
        : null;

      setBoardingPoint(matchedB || (bOptions[0]?.point ?? ""));
      setDroppingPoint(matchedD || (dOptions[0]?.point ?? ""));

      if (!isTodayOrFuture(foundSchedule.travelDate)) {
        setError("This schedule is no longer available for booking.");
      }
    } catch (err) {
      setError("Failed to load schedule details.");
      console.error(err);
    }
  };

  const releaseSeatHold = async (tokenToRelease = holdToken, clearStoredToken = false) => {
    if (!tokenToRelease) {
      return;
    }

    try {
      await api.delete(`/seat-holds/${tokenToRelease}`);
    } catch (err) {
      console.error(err);
    } finally {
      setHoldExpiresAtMs(0);
      setHoldTimeLeft(0);
      holdExpiryHandledRef.current = false;

      if (clearStoredToken) {
        window.sessionStorage.removeItem(getHoldStorageKey(scheduleId));
      }
    }
  };

  useEffect(() => {
    setSchedule(null);
    setBookedSeats([]);
    setSelectedSeats([]);
    setPassengerDetails([]);
    setBoardingPoint("");
    setDroppingPoint("");
    setHoldExpiresAtMs(0);
    setHoldTimeLeft(0);
    setError("");
    setHoldToken(getOrCreateHoldToken(scheduleId));
  }, [scheduleId]);

  useEffect(() => {
    setPassengerDetails((currentDetails) => {
      const detailMap = new Map(
        currentDetails.map((detail) => [Number(detail.seatNumber), detail])
      );

      return selectedSeats.map((seatNumber) =>
        createPassengerDetail(seatNumber, detailMap.get(Number(seatNumber)))
      );
    });
  }, [selectedSeats]);

  useEffect(() => {
    if (!holdToken) {
      return undefined;
    }

    setLoading(true);
    fetchScheduleDetails();
    fetchUnavailableSeats(holdToken);

    return undefined;
  }, [scheduleId, holdToken]);

  useEffect(() => {
    if (!holdToken) {
      return undefined;
    }

    if (selectedSeats.length === 0) {
      if (holdSyncIntervalRef.current) {
        window.clearInterval(holdSyncIntervalRef.current);
        holdSyncIntervalRef.current = null;
      }

      setHoldExpiresAtMs(0);
      setHoldTimeLeft(0);
      holdExpiryHandledRef.current = false;
      releaseSeatHold(holdToken, false);
      fetchUnavailableSeats(holdToken);
      return undefined;
    }

    let cancelled = false;

    const syncSeatHold = async () => {
      try {
        const response = await api.post("/seat-holds", {
          scheduleId: Number(scheduleId),
          holdToken,
          seatNumbers: selectedSeats,
        });

        if (cancelled) {
          return;
        }

        const nextHoldExpiryMs = parseHoldExpiryMs(response.data?.expiresAt);
        setHoldExpiresAtMs(
          Number.isNaN(nextHoldExpiryMs)
            ? Date.now() + (SEAT_HOLD_DURATION_MINUTES * 60 * 1000)
            : nextHoldExpiryMs
        );
        holdExpiryHandledRef.current = false;
        setError("");
        await fetchUnavailableSeats(holdToken);
      } catch (err) {
        if (cancelled) {
          return;
        }

        const unavailableSeats = await fetchUnavailableSeats(holdToken);
        setSelectedSeats((currentSeats) => currentSeats.filter((seat) => !unavailableSeats.includes(seat)));
        setHoldExpiresAtMs(0);
        setHoldTimeLeft(0);
        holdExpiryHandledRef.current = false;
        setError(err.response?.data?.message || "Selected seat could not be locked. Please choose again.");
        console.error(err);
      }
    };

    syncSeatHold();
    if (holdSyncIntervalRef.current) {
      window.clearInterval(holdSyncIntervalRef.current);
    }
    holdSyncIntervalRef.current = window.setInterval(syncSeatHold, SEAT_HOLD_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (holdSyncIntervalRef.current) {
        window.clearInterval(holdSyncIntervalRef.current);
        holdSyncIntervalRef.current = null;
      }
    };
  }, [selectedSeats, scheduleId, holdToken]);

  useEffect(() => {
    if (!holdExpiresAtMs) {
      setHoldTimeLeft(0);
      holdExpiryHandledRef.current = false;
      return undefined;
    }

    const updateCountdown = () => {
      const timeLeft = holdExpiresAtMs - Date.now();

      if (timeLeft <= 0) {
        setHoldTimeLeft(0);

        if (!holdExpiryHandledRef.current) {
          holdExpiryHandledRef.current = true;
          if (holdSyncIntervalRef.current) {
            window.clearInterval(holdSyncIntervalRef.current);
            holdSyncIntervalRef.current = null;
          }
          releaseSeatHold(holdToken, false);
          setHoldExpiresAtMs(0);
          setSelectedSeats([]);
          setError("Your seat lock expired. Please select your seats again.");
          fetchUnavailableSeats(holdToken);
        }

        return;
      }

      setHoldTimeLeft(timeLeft);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [holdExpiresAtMs, holdToken]);

  useEffect(() => () => {
    if (holdSyncIntervalRef.current) {
      window.clearInterval(holdSyncIntervalRef.current);
      holdSyncIntervalRef.current = null;
    }
    if (holdToken) {
      api.delete(`/seat-holds/${holdToken}`).catch(() => {});
      window.sessionStorage.removeItem(getHoldStorageKey(scheduleId));
    }
  }, [holdToken, scheduleId]);

  const handleSeatClick = (seatNumber) => {
    if (!isScheduleAvailable || bookedSeats.includes(seatNumber)) {
      return;
    }

    setSelectedSeats((currentSeats) =>
      currentSeats.includes(seatNumber)
        ? currentSeats.filter((seat) => seat !== seatNumber)
        : [...currentSeats, seatNumber].sort((a, b) => a - b)
    );
    setError("");
  };

  const updatePassengerDetail = (seatNumber, field, value) => {
    setPassengerDetails((currentDetails) =>
      currentDetails.map((detail) => (
        detail.seatNumber === seatNumber
          ? { ...detail, [field]: value }
          : detail
      ))
    );
    setError("");
  };

  const validateForm = () => {
    if (!isScheduleAvailable) {
      setError("This schedule is no longer available for booking.");
      return false;
    }

    if (selectedSeats.length === 0) {
      setError("Please select at least one seat.");
      return false;
    }

    const missingName = passengerDetails.find((detail) => !detail.name.trim());
    if (missingName) {
      setError(`Please enter full name for Seat ${missingName.seatNumber}.`);
      return false;
    }

    const missingGender = passengerDetails.find((detail) => !detail.gender.trim());
    if (missingGender) {
      setError(`Please select gender for Seat ${missingGender.seatNumber}.`);
      return false;
    }

    if (!phoneNumber.trim()) {
      setError("Please enter phone number.");
      return false;
    }

    if (!/^\d{10}$/.test(phoneNumber.trim())) {
      setError("Phone number must be 10 digits.");
      return false;
    }

    if (!boardingPoint) {
      setError("Please select a boarding point.");
      return false;
    }

    if (!droppingPoint) {
      setError("Please select a dropping point.");
      return false;
    }

    return true;
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitLoading(true);

      const response = await api.post("/bookings", {
        passengerName: passengerNameSummary,
        passengerDetails,
        phoneNumber,
        scheduleId: Number(scheduleId),
        seatNumber: selectedSeats[0],
        seatNumbers: selectedSeats,
        boardingPoint,
        droppingPoint,
        totalPrice,
        userId: user?.id ?? null,
        holdToken,
      });

      window.sessionStorage.removeItem(getHoldStorageKey(scheduleId));
      setHoldExpiresAtMs(0);
      setHoldTimeLeft(0);
      holdExpiryHandledRef.current = false;

      await fetchUnavailableSeats(holdToken);

      navigate("/booking-success", {
        state: {
          bookings: [response.data],
          selectedSeats,
          totalPrice,
          amountPaid: totalPrice,
          passengerName: passengerNameSummary,
          passengerDetails,
          email,
          phoneNumber,
          boardingPoint,
          droppingPoint,
          boardingTime: selectedBoardingStop?.time ?? "",
          droppingTime: selectedDroppingStop?.time ?? "",
          schedule,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create booking.");
      console.error(err);
      await fetchUnavailableSeats(holdToken);
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderSeats = () => {
    if (!schedule) {
      return null;
    }

    const getSeatStatus = (seatNumber) => {
      if (bookedSeats.includes(seatNumber)) {
        return "booked";
      }

      if (selectedSeats.includes(seatNumber)) {
        return "selected";
      }

      return "available";
    };

    const renderSeatButton = (seatNumber, layoutClass = "", tierLabel = "") => {
      const seatStatus = getSeatStatus(seatNumber);

      return (
        <button
          key={seatNumber}
          type="button"
          className={`seat ${layoutClass} seat-${seatStatus}`}
          onClick={() => handleSeatClick(seatNumber)}
          disabled={seatStatus === "booked" || !isScheduleAvailable}
          title={seatStatus === "booked" ? "Already booked" : `Seat ${seatNumber}`}
        >
          <span className="seat-number">{seatNumber}</span>
          {tierLabel && <span className="seat-sub-label">{tierLabel}</span>}
        </button>
      );
    };

    if (busLayoutType === "Sleeper") {
      const buildDeckRows = (startSeat, endSeat) => {
        const rows = [];

        for (let seatNumber = startSeat; seatNumber <= endSeat; seatNumber += 3) {
          rows.push([
            seatNumber <= endSeat ? seatNumber : null,
            seatNumber + 1 <= endSeat ? seatNumber + 1 : null,
            seatNumber + 2 <= endSeat ? seatNumber + 2 : null,
          ]);
        }

        return rows;
      };

      const renderSleeperSeat = (seatNumber, key) => {
        if (!seatNumber) {
          return <div className="sleeper-seat-placeholder" key={key} />;
        }

        const seatStatus = getSeatStatus(seatNumber);

        return (
          <div className="sleeper-seat-stack" key={key}>
            <button
              type="button"
              className={`seat seat-sleeper-berth seat-${seatStatus}`}
              onClick={() => handleSeatClick(seatNumber)}
              disabled={seatStatus === "booked" || !isScheduleAvailable}
              title={seatStatus === "booked" ? "Already booked" : `Seat ${seatNumber}`}
            >
              <span className="seat-number">{seatNumber}</span>
            </button>
            {seatStatus === "booked" && (
              <span className="sleeper-seat-meta is-booked">Sold</span>
            )}
          </div>
        );
      };

      const lowerDeckSeatCount = Math.ceil(schedule.totalSeats / 2);
      const decks = [
        {
          key: "lower",
          label: "Lower deck",
          rows: buildDeckRows(1, lowerDeckSeatCount),
          showDriver: true,
        },
        {
          key: "upper",
          label: "Upper deck",
          rows: buildDeckRows(lowerDeckSeatCount + 1, schedule.totalSeats),
          showDriver: false,
        },
      ];

      return (
        <div className="sleeper-deck-grid">
          {decks.map((deck) => (
            <div className="sleeper-deck-card" key={deck.key}>
              <div className="sleeper-deck-header">
                <span>{deck.label}</span>
                {deck.showDriver && (
                  <svg className="sleeper-driver-wheel" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <circle cx="12" cy="12" r="2.5" />
                    <path d="M12 9.5v-5" />
                    <path d="M9.6 13 5 16" />
                    <path d="M14.4 13 19 16" />
                  </svg>
                )}
              </div>

              <div className="sleeper-deck-body">
                {deck.rows.map((row, rowIndex) => (
                  <div className="sleeper-deck-row" key={`${deck.key}-${rowIndex}`}>
                    <div className="sleeper-deck-column sleeper-deck-column-single">
                      {renderSleeperSeat(row[0], `${deck.key}-${rowIndex}-0`)}
                    </div>
                    <div className="sleeper-deck-aisle" />
                    <div className="sleeper-deck-column sleeper-deck-column-double">
                      {renderSleeperSeat(row[1], `${deck.key}-${rowIndex}-1`)}
                      {renderSleeperSeat(row[2], `${deck.key}-${rowIndex}-2`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const rows = [];
    const seatsPerRow = 4;

    for (let rowStart = 1; rowStart <= schedule.totalSeats; rowStart += seatsPerRow) {
      const rowSeats = [];

      for (
        let seatNumber = rowStart;
        seatNumber < rowStart + seatsPerRow && seatNumber <= schedule.totalSeats;
        seatNumber += 1
      ) {
        if (seatNumber - rowStart === 2) {
          rowSeats.push(<div key={`aisle-${seatNumber}`} className="aisle-gap" />);
        }

        rowSeats.push(renderSeatButton(seatNumber, "seat-seater"));
      }

      rows.push(
        <div className="seat-row" key={rowStart}>
          {rowSeats}
        </div>
      );
    }

    return rows;
  };

  if (isAdmin) {
    return null;
  }

  return (
    <div className="booking-page">
      <div className="booking-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          &larr; Back
        </button>
        <div className="booking-page-title">
          <h1>Select Your Seat</h1>
          <p>Choose available seats and complete full payment to book instantly</p>
        </div>
      </div>

      <div className="booking-body">
        <div className="booking-left">
          {schedule && (
            <div className="schedule-info-card">
              <h2 className="info-card-title">Journey Details</h2>
              {route && (
                <div className="info-row">
                  <span className="info-label">Route</span>
                  <span className="info-value">
                    {route.fromCity} &rarr; {route.toCity}
                  </span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Bus Number</span>
                <div className="info-value-badges">
                  <span className="info-value bus-badge">{schedule.busNumber}</span>
                  <span className={schedule.acType === "A/C" ? "ac-badge ac-yes" : "ac-badge ac-no"}>
                    {schedule.acType === "A/C" ? "A/C" : "Non-A/C"}
                  </span>
                  <span className={busLayoutType === "Sleeper" ? "bus-layout-badge bus-layout-badge-sleeper" : "bus-layout-badge bus-layout-badge-seater"}>
                    {busLayoutType}
                  </span>
                </div>
              </div>
              <div className="info-row">
                <span className="info-label">Travel Date</span>
                <span className="info-value">{schedule.travelDate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Departure</span>
                <span className="info-value">{formatTimeValue(schedule.departureTime)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Arrival</span>
                <span className="info-value">{formatTimeValue(schedule.arrivalTime) || "-"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Duration</span>
                <span className="info-value">{schedule.duration || "-"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Seat Layout</span>
                <span className="info-value">{busLayoutType}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total Seats</span>
                <span className="info-value">{schedule.totalSeats}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Price per Seat</span>
                <span className="info-value price-blue">Rs. {pricePerSeat.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="seat-legend">
            <div className="legend-item">
              <span className="legend-box legend-available" />
              <span>Available</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-booked" />
              <span>Booked</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-selected" />
              <span>Selected</span>
            </div>
          </div>

          <div className={`seat-map-container ${busLayoutType === "Sleeper" ? "seat-map-container-sleeper" : ""}`}>
            {busLayoutType === "Sleeper" ? (
              <div className="seat-map-header">
                <span className="bus-layout-note">{busLayoutType} Layout</span>
                <span className="seat-map-note">Choose your preferred berth</span>
              </div>
            ) : (
              <div className="bus-front">
                <span>Driver</span>
                <span className="bus-layout-note">{busLayoutType} Layout</span>
              </div>
            )}
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading seat layout...</p>
              </div>
            ) : (
              <div className="seat-map">{renderSeats()}</div>
            )}
          </div>

          {selectedSeats.length > 0 && (
            <div className="selected-seat-banner">
              <span>
                {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} selected:
                <strong> {selectedSeats.map((seat) => `Seat ${seat}`).join(", ")}</strong>
              </span>
              {holdTimeLeft > 0 && (
                <span className="seat-hold-timer">
                  Locked for {formatHoldCountdown(holdTimeLeft)}
                </span>
              )}
            </div>
          )}

          {selectedSeats.length > 0 && holdTimeLeft > 0 && (
            <div className="seat-hold-banner">
              Selected seats are locked for {SEAT_HOLD_DURATION_MINUTES} minutes while you complete payment.
            </div>
          )}
        </div>

        <div className="booking-right">
          <div className="booking-form-card">
            <h2 className="form-card-title">Passenger Details</h2>

            {error && <div className="error-banner">Warning: {error}</div>}

            <form onSubmit={handleBookingSubmit}>
              <div className="form-group">
                <label htmlFor="boardingPoint">Boarding Point</label>
                <select
                  id="boardingPoint"
                  value={boardingPoint}
                  onChange={(event) => setBoardingPoint(event.target.value)}
                >
                  <option value="">Select boarding point</option>
                  {boardingOptions.map((stop) => (
                    <option key={`boarding-${stop.point}`} value={stop.point}>
                      {stop.point} ({formatTimeValue(stop.time) || "--:--"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="droppingPoint">Dropping Point</label>
                <select
                  id="droppingPoint"
                  value={droppingPoint}
                  onChange={(event) => setDroppingPoint(event.target.value)}
                >
                  <option value="">Select dropping point</option>
                  {droppingOptions.map((stop) => (
                    <option key={`dropping-${stop.point}`} value={stop.point}>
                      {stop.point} ({formatTimeValue(stop.time) || "--:--"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="passenger-section-head">
                <span>Passenger information</span>
                <span>{selectedSeats.length > 0 ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? "s" : ""}` : "No seats selected"}</span>
              </div>

              {selectedSeats.length === 0 ? (
                <div className="passenger-seat-empty">
                  Select one or more seats to enter passenger names and gender.
                </div>
              ) : (
                <div className="passenger-seat-list">
                  {passengerDetails.map((detail, index) => (
                    <div className="passenger-seat-card" key={detail.seatNumber}>
                      <div className="passenger-seat-card-top">
                        <span className="passenger-seat-pill">Seat {detail.seatNumber}</span>
                        <span className="passenger-seat-index">Passenger {index + 1}</span>
                      </div>

                      <div className="form-group">
                        <label htmlFor={`passengerName-${detail.seatNumber}`}>Full Name</label>
                        <input
                          id={`passengerName-${detail.seatNumber}`}
                          type="text"
                          value={detail.name}
                          onChange={(event) => updatePassengerDetail(detail.seatNumber, "name", event.target.value)}
                          placeholder="e.g. John Perera"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`passengerGender-${detail.seatNumber}`}>Gender</label>
                        <select
                          id={`passengerGender-${detail.seatNumber}`}
                          value={detail.gender}
                          onChange={(event) => updatePassengerDetail(detail.seatNumber, "gender", event.target.value)}
                        >
                          <option value="">Select gender</option>
                          {GENDER_OPTIONS.map((gender) => (
                            <option key={`${detail.seatNumber}-${gender}`} value={gender}>
                              {gender}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="passengerEmail">Email</label>
                <input
                  id="passengerEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e.g. traveler@example.com"
                  className={user?.email ? "input-prefilled" : ""}
                />
                {user?.email && <span className="field-note">Auto-filled from your account</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="text"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="10-digit number"
                  maxLength={10}
                  className={user?.phone ? "input-prefilled" : ""}
                />
                {user?.phone && <span className="field-note">Auto-filled from your account</span>}
              </div>

              <div className="booking-summary">
                <div className="summary-row">
                  <span>No. of Seats</span>
                  <span>{selectedSeats.length > 0 ? selectedSeats.length : "-"}</span>
                </div>
                <div className="summary-row">
                  <span>Selected Seats</span>
                  <span>{selectedSeats.length > 0 ? selectedSeats.join(", ") : "-"}</span>
                </div>
                <div className="summary-row">
                  <span>Boarding</span>
                  <span>{selectedBoardingStop ? `${selectedBoardingStop.point} (${formatTimeValue(selectedBoardingStop.time) || "--:--"})` : "-"}</span>
                </div>
                <div className="summary-row">
                  <span>Dropping</span>
                  <span>{selectedDroppingStop ? `${selectedDroppingStop.point} (${formatTimeValue(selectedDroppingStop.time) || "--:--"})` : "-"}</span>
                </div>
                <div className="summary-row">
                  <span>1 Seat Price</span>
                  <span>Rs. {pricePerSeat.toLocaleString()}</span>
                </div>

                <div className="summary-divider" />

                <div className="summary-row summary-total-row">
                  <span>Total Price</span>
                  <span className="summary-total">Rs. {totalPrice.toLocaleString()}</span>
                </div>
                <div className="summary-row summary-sub">
                  <span>Amount to Pay Now</span>
                  <span>Rs. {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <button
                className="confirm-btn"
                type="submit"
                disabled={submitLoading || selectedSeats.length === 0 || !isScheduleAvailable}
              >
                {submitLoading
                  ? (
                    <>
                      <span className="btn-spinner" /> Processing Payment...
                    </>
                  )
                  : `Pay Rs. ${totalPrice.toLocaleString()} & Book`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
