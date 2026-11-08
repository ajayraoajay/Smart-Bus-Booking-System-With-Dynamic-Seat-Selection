import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./BookingSuccessPage.css";

const formatTimeValue = (value) => (value ? value.substring(0, 5) : "-");
const formatDisplayTime = (value) => (value ? formatTimeValue(value) : "--");
const getBusLayoutLabel = (busType) => (busType === "Sleeper" ? "Sleeper" : "Seater");

const normalizePassengerDetails = (rawPassengerDetails, selectedSeats, fallbackPassengerName) => {
  if (Array.isArray(rawPassengerDetails) && rawPassengerDetails.length > 0) {
    return rawPassengerDetails
      .map((detail, index) => ({
        seatNumber: detail?.seatNumber ?? selectedSeats[index] ?? "",
        name: detail?.name ?? "",
        gender: detail?.gender ?? "",
      }))
      .filter((detail) => detail.name || detail.seatNumber || detail.gender);
  }

  if (fallbackPassengerName) {
    return [{
      seatNumber: selectedSeats[0] ?? "",
      name: fallbackPassengerName,
      gender: "",
    }];
  }

  return [];
};

const buildPassengerSummary = (passengerDetails, fallbackPassengerName = "-") => {
  if (passengerDetails.length === 0) {
    return fallbackPassengerName || "-";
  }

  return passengerDetails
    .map((detail) => {
      const seatLabel = detail.seatNumber ? `Seat ${detail.seatNumber}` : "Passenger";
      const genderLabel = detail.gender ? ` (${detail.gender})` : "";
      return `${seatLabel}: ${detail.name}${genderLabel}`;
    })
    .join("; ");
};

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");

const buildPdfObject = (objectNumber, content) => `${objectNumber} 0 obj\n${content}\nendobj\n`;

const buildTicketPdfBlob = ({
  bookingIdForFile,
  routeName,
  schedule,
  busLayoutType,
  passengerDetails = [],
  passengerSummary = "",
  email = "-",
  phoneNumber = "-",
  boardingPoint = "-",
  boardingTime = "",
  droppingPoint = "-",
  droppingTime = "",
  selectedSeats = [],
  normalizedStatus = "BOOKED",
  totalPrice = 0,
  amountPaid = 0,
  refundAmount = 0,
  cancellationCharge = 0,
  cancelledBy = "",
}) => {
  const isCancelled = normalizedStatus === "CANCELLED";
  const statusLabel = isCancelled
    ? "Cancelled"
    : normalizedStatus === "COMPLETED"
    ? "Completed"
    : "Confirmed";

  const cancelledByLabel =
    cancelledBy === "USER"
      ? "User"
      : cancelledBy === "ADMIN"
      ? "Admin"
      : cancelledBy || "-";

  let passengerList = [];
  if (Array.isArray(passengerDetails) && passengerDetails.length > 0) {
    passengerList = passengerDetails.filter((p) => p && (p.name || p.seatNumber));
  }
  if (passengerList.length === 0 && passengerSummary && passengerSummary !== "-") {
    const parts = passengerSummary.split(";").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      passengerList = parts.map((part) => ({ name: part, seatNumber: "", gender: "" }));
    }
  }

  const lines = [];
  const contentCommands = [];

  const boxX = 40;
  const boxW = 515;
  const textXLeft = 52;
  const textXRight = 310;

  // 1. Header Box
  const headerTop = 804;
  const headerHeight = 54;
  const headerBottom = headerTop - headerHeight;

  contentCommands.push(
    "0.93 0.96 1 rg",
    `${boxX} ${headerBottom} ${boxW} ${headerHeight} re f`,
    "0.88 0.91 0.95 RG",
    "1 w",
    `${boxX} ${headerBottom} ${boxW} ${headerHeight} re S`
  );

  lines.push(
    { text: "BusGo Ticket", x: 48, y: headerTop - 24, size: 22, font: "F2" },
    { text: `Booking ID: ${bookingIdForFile}`, x: 48, y: headerTop - 42, size: 11, font: "F1" }
  );

  // 2. Journey Details Box
  const journeyTop = headerBottom - 14;
  let journeyY = journeyTop - 18;

  lines.push({ text: "Journey Details", x: textXLeft, y: journeyY, size: 13, font: "F2" });

  journeyY -= 18;
  lines.push(
    { text: `Route: ${routeName}`, x: textXLeft, y: journeyY, size: 11, font: "F1" },
    { text: `Departure: ${formatDisplayTime(schedule?.departureTime)}`, x: textXRight, y: journeyY, size: 11, font: "F1" }
  );

  journeyY -= 18;
  lines.push(
    { text: `Bus Number: ${schedule?.busNumber || "-"}`, x: textXLeft, y: journeyY, size: 11, font: "F1" },
    { text: `Arrival: ${formatDisplayTime(schedule?.arrivalTime)}${schedule?.arrivalDay && Number(schedule.arrivalDay) > 1 ? ` (Day ${schedule.arrivalDay})` : ""}`, x: textXRight, y: journeyY, size: 11, font: "F1" }
  );

  journeyY -= 18;
  lines.push(
    { text: `A/C Type: ${schedule?.acType === "A/C" ? "A/C" : "Non-A/C"}`, x: textXLeft, y: journeyY, size: 11, font: "F1" },
    { text: `Duration: ${schedule?.duration || "-"}`, x: textXRight, y: journeyY, size: 11, font: "F1" }
  );

  journeyY -= 18;
  lines.push(
    { text: `Bus Layout: ${busLayoutType}`, x: textXLeft, y: journeyY, size: 11, font: "F1" }
  );

  journeyY -= 18;
  lines.push(
    { text: `Travel Date: ${schedule?.travelDate || "-"}`, x: textXLeft, y: journeyY, size: 11, font: "F1" }
  );

  const journeyBottom = journeyY - 12;
  const journeyHeight = journeyTop - journeyBottom;

  contentCommands.push(
    "0.96 0.98 1 rg",
    `${boxX} ${journeyBottom} ${boxW} ${journeyHeight} re f`,
    "0.88 0.91 0.95 RG",
    "1 w",
    `${boxX} ${journeyBottom} ${boxW} ${journeyHeight} re S`
  );

  // 3. Passenger Details Box
  const passengerTop = journeyBottom - 14;
  let passengerY = passengerTop - 18;

  lines.push({ text: "Passenger Details", x: textXLeft, y: passengerY, size: 13, font: "F2" });

  passengerY -= 18;
  lines.push(
    { text: `Status: ${statusLabel}`, x: textXLeft, y: passengerY, size: 11, font: "F1" },
    { text: `Selected Seats: ${selectedSeats.map((seat) => `Seat ${seat}`).join(", ") || "-"}`, x: textXRight, y: passengerY, size: 11, font: "F1" }
  );

  passengerY -= 18;
  lines.push(
    { text: `Phone: ${phoneNumber}`, x: textXLeft, y: passengerY, size: 11, font: "F1" },
    { text: `Email: ${email}`, x: textXRight, y: passengerY, size: 11, font: "F1" }
  );

  passengerY -= 18;
  lines.push(
    { text: `Boarding: ${boardingPoint} (${formatDisplayTime(boardingTime)})`, x: textXLeft, y: passengerY, size: 11, font: "F1" },
    { text: `Dropping: ${droppingPoint} (${formatDisplayTime(droppingTime)})`, x: textXRight, y: passengerY, size: 11, font: "F1" }
  );

  passengerY -= 18;
  if (passengerList.length > 1) {
    lines.push({ text: `Passengers (${passengerList.length}):`, x: textXLeft, y: passengerY, size: 11, font: "F2" });
    passengerList.forEach((p, idx) => {
      passengerY -= 18;
      const seatInfo = p.seatNumber ? `Seat ${p.seatNumber}` : `Passenger ${idx + 1}`;
      const genderInfo = p.gender ? ` (${p.gender})` : "";
      lines.push({ text: `  - ${seatInfo}: ${p.name || "-"}${genderInfo}`, x: textXLeft, y: passengerY, size: 11, font: "F1" });
    });
  } else if (passengerList.length === 1) {
    const p = passengerList[0];
    const seatInfo = p.seatNumber ? ` (Seat ${p.seatNumber}${p.gender ? `, ${p.gender}` : ""})` : (p.gender ? ` (${p.gender})` : "");
    lines.push({ text: `Passenger: ${p.name || "-"}${seatInfo}`, x: textXLeft, y: passengerY, size: 11, font: "F1" });
  } else {
    lines.push({ text: `Passenger: ${passengerSummary || "-"}`, x: textXLeft, y: passengerY, size: 11, font: "F1" });
  }

  const passengerBottom = passengerY - 12;
  const passengerHeight = passengerTop - passengerBottom;

  contentCommands.push(
    "0.97 0.98 0.99 rg",
    `${boxX} ${passengerBottom} ${boxW} ${passengerHeight} re f`,
    "0.88 0.91 0.95 RG",
    "1 w",
    `${boxX} ${passengerBottom} ${boxW} ${passengerHeight} re S`
  );

  // 4. Payment Summary Box
  const paymentTop = passengerBottom - 14;
  let paymentY = paymentTop - 18;

  lines.push({ text: "Payment Summary", x: textXLeft, y: paymentY, size: 13, font: "F2" });

  paymentY -= 18;
  lines.push(
    { text: `Total Price: Rs. ${totalPrice.toLocaleString()}`, x: textXLeft, y: paymentY, size: 11, font: "F1" },
    { text: `Amount Paid: Rs. ${amountPaid.toLocaleString()}`, x: textXRight, y: paymentY, size: 11, font: "F1" }
  );

  if (isCancelled) {
    paymentY -= 18;
    lines.push(
      { text: `Refund Amount: Rs. ${refundAmount.toLocaleString()}`, x: textXLeft, y: paymentY, size: 11, font: "F1" },
      { text: `Cancellation Charge: Rs. ${cancellationCharge.toLocaleString()}`, x: textXRight, y: paymentY, size: 11, font: "F1" }
    );

    paymentY -= 18;
    lines.push(
      { text: `Cancelled By: ${cancelledByLabel}`, x: textXLeft, y: paymentY, size: 11, font: "F1" }
    );
  }

  const paymentBottom = paymentY - 12;
  const paymentHeight = paymentTop - paymentBottom;

  contentCommands.push(
    "0.94 0.97 1 rg",
    `${boxX} ${paymentBottom} ${boxW} ${paymentHeight} re f`,
    "0.88 0.91 0.95 RG",
    "1 w",
    `${boxX} ${paymentBottom} ${boxW} ${paymentHeight} re S`
  );

  // 5. Footer Notice
  const footerY1 = paymentBottom - 18;
  const footerY2 = footerY1 - 18;
  lines.push(
    { text: `Ticket sent to ${email} and ${phoneNumber}.`, x: textXLeft, y: footerY1, size: 11, font: "F1" },
    { text: "Thank you for booking with BusGo.", x: textXLeft, y: footerY2, size: 11, font: "F1" }
  );

  lines.forEach((line) => {
    contentCommands.push(
      `BT /${line.font} ${line.size} Tf 0.10 0.14 0.22 rg 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`
    );
  });

  const contentStream = `${contentCommands.join("\n")}\n`;
  const contentBytes = new TextEncoder().encode(contentStream).length;

  const objects = [
    buildPdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    buildPdfObject(2, "<< /Type /Pages /Count 1 /Kids [3 0 R] >>"),
    buildPdfObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>"
    ),
    `4 0 obj\n<< /Length ${contentBytes} >>\nstream\n${contentStream}endstream\nendobj\n`,
    buildPdfObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    buildPdfObject(6, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

const buildTicketText = ({
  bookings,
  selectedSeats,
  totalPrice,
  amountPaid,
  passengerSummary,
  email,
  phoneNumber,
  schedule,
  normalizedStatus,
  boardingPoint,
  boardingTime,
  droppingPoint,
  droppingTime,
}) => {
  const bookingIds = bookings.map((booking) => booking.bookingId).join(", ");
  const routeName = schedule?.route
    ? `${schedule.route.fromCity} -> ${schedule.route.toCity}`
    : "-";

  return [
    "BusGo Ticket",
    `Booking ID: ${bookingIds || "-"}`,
    `Route: ${routeName}`,
    `Bus Number: ${schedule?.busNumber || "-"}`,
    `A/C Type: ${schedule?.acType === "A/C" ? "A/C" : "Non-A/C"}`,
    `Bus Layout: ${getBusLayoutLabel(schedule?.busType)}`,
    `Travel Date: ${schedule?.travelDate || "-"}`,
    `Departure Time: ${formatDisplayTime(schedule?.departureTime)}`,
    `Arrival Time: ${formatDisplayTime(schedule?.arrivalTime)}`,
    `Duration: ${schedule?.duration || "-"}`,
    `Passengers: ${passengerSummary}`,
    `Email: ${email}`,
    `Phone Number: ${phoneNumber}`,
    `Boarding Point: ${boardingPoint} (${formatDisplayTime(boardingTime)})`,
    `Dropping Point: ${droppingPoint} (${formatDisplayTime(droppingTime)})`,
    `Selected Seats: ${selectedSeats.map((seat) => `Seat ${seat}`).join(", ")}`,
    `Seat Count: ${selectedSeats.length}`,
    `Status: ${normalizedStatus === "CANCELLED" ? "Cancelled" : "Confirmed"}`,
    `Total Price: Rs. ${totalPrice.toLocaleString()}`,
    `Amount Paid: Rs. ${amountPaid.toLocaleString()}`,
  ].join("\n");
};

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const [actionMessage, setActionMessage] = useState("");

  if (!state) {
    return (
      <div className="bsp-page">
        <div className="bsp-card">
          <div className="bsp-error-icon">X</div>
          <h1>No Booking Data Found</h1>
          <p>Please create a booking first.</p>
          <button className="bsp-home-btn" onClick={() => navigate("/")}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const bookings = Array.isArray(state.bookings) ? state.bookings : [state];
  const selectedSeats = Array.isArray(state.selectedSeats) ? state.selectedSeats : [state.seatNumber];
  const totalPrice = state.totalPrice ?? bookings[0]?.totalPrice ?? 0;
  const amountPaid = state.amountPaid ?? totalPrice;
  const passengerName = state.passengerName ?? bookings[0]?.passengerName ?? "-";
  const email = state.email ?? "-";
  const phoneNumber = state.phoneNumber ?? bookings[0]?.phoneNumber ?? "-";
  const schedule = state.schedule ?? null;
  const busLayoutType = getBusLayoutLabel(schedule?.busType);
  const scheduleId = schedule?.id ?? bookings[0]?.scheduleId;
  const routeName = schedule?.route
    ? `${schedule.route.fromCity} -> ${schedule.route.toCity}`
    : "-";
  const normalizedStatus = bookings[0]?.status === "CANCELLED" ? "CANCELLED" : "BOOKED";
  const boardingPoint = state.boardingPoint ?? bookings[0]?.boardingPoint ?? "-";
  const boardingTime = state.boardingTime ?? bookings[0]?.boardingTime ?? "-";
  const droppingPoint = state.droppingPoint ?? bookings[0]?.droppingPoint ?? "-";
  const droppingTime = state.droppingTime ?? bookings[0]?.droppingTime ?? "-";
  const bookingIdForFile = bookings[0]?.bookingId ?? "ticket";
  const passengerDetails = normalizePassengerDetails(
    state.passengerDetails ?? bookings[0]?.passengerDetails,
    selectedSeats,
    passengerName
  );
  const passengerSummary = buildPassengerSummary(passengerDetails, passengerName);
  const ticketText = buildTicketText({
    bookings,
    selectedSeats,
    totalPrice,
    amountPaid,
    passengerSummary,
    email,
    phoneNumber,
    schedule,
    normalizedStatus,
    boardingPoint,
    boardingTime,
    droppingPoint,
    droppingTime,
  });

  const handleDownloadTicket = () => {
    try {
      const pdfBlob = buildTicketPdfBlob({
        bookingIdForFile,
        routeName,
        schedule,
        busLayoutType,
        passengerDetails,
        passengerSummary,
        email,
        phoneNumber,
        boardingPoint,
        boardingTime,
        droppingPoint,
        droppingTime,
        selectedSeats,
        normalizedStatus,
        totalPrice,
        amountPaid,
      });
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `BusGo-Ticket-${bookingIdForFile}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setActionMessage("Ticket PDF downloaded successfully.");
    } catch {
      setActionMessage("Unable to download the ticket PDF right now. Please try again.");
    }
  };

  const handleShareTicket = async () => {
    const shareTitle = `BusGo Ticket ${bookingIdForFile}`;

    try {
      if (navigator.share) {
        if (navigator.canShare) {
          const pdfBlob = buildTicketPdfBlob({
            bookingIdForFile,
            routeName,
            schedule,
            busLayoutType,
            passengerDetails,
            passengerSummary,
            email,
            phoneNumber,
            boardingPoint,
            boardingTime,
            droppingPoint,
            droppingTime,
            selectedSeats,
            normalizedStatus,
            totalPrice,
            amountPaid,
          });
          const ticketFile = new File([pdfBlob], `BusGo-Ticket-${bookingIdForFile}.pdf`, {
            type: "application/pdf",
          });

          if (navigator.canShare({ files: [ticketFile] })) {
            await navigator.share({
              title: shareTitle,
              text: `Ticket for ${passengerSummary}`,
              files: [ticketFile],
            });
            setActionMessage("Ticket shared successfully.");
            return;
          }
        }

        await navigator.share({
          title: shareTitle,
          text: ticketText,
        });
        setActionMessage("Ticket shared successfully.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ticketText);
        setActionMessage("Ticket details copied to clipboard for sharing.");
        return;
      }

      setActionMessage("Sharing is not supported on this device.");
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(ticketText);
          setActionMessage("Sharing failed, so the ticket details were copied to clipboard.");
          return;
        } catch {
          
        }
      }

      setActionMessage("Unable to share the ticket right now. Please try again.");
    }
  };

  return (
    <div className="bsp-page">
      <div className="bsp-card">
        <div className="bsp-success-header">
          <div className="bsp-check-circle">OK</div>
          <h1 className="bsp-title">Booking Confirmed!</h1>
          <p className="bsp-subtitle">
            Your {selectedSeats.length > 1 ? `${selectedSeats.length} seats have` : "seat has"} been booked successfully.
          </p>
        </div>

        <div className="bsp-booking-ids">
          {bookings.map((booking) => (
            <div className="bsp-id-badge" key={booking.bookingId}>
              <span className="bsp-id-label">Booking ID</span>
              <span className="bsp-id-value">{booking.bookingId}</span>
            </div>
          ))}
        </div>

        {schedule && (
          <div className="bsp-section">
            <h3 className="bsp-section-title">Journey Details</h3>
            <div className="bsp-detail-row">
              <span>Route</span>
              <span>{schedule.route?.fromCity} {"->"} {schedule.route?.toCity}</span>
            </div>
            <div className="bsp-detail-row">
              <span>Bus Number</span>
              <span>{schedule.busNumber}</span>
            </div>
            <div className="bsp-detail-row">
              <span>A/C Type</span>
              <span>{schedule.acType === "A/C" ? "A/C" : "Non-A/C"}</span>
            </div>
            <div className="bsp-detail-row">
              <span>Bus Layout</span>
              <span>{busLayoutType}</span>
            </div>
            <div className="bsp-detail-row">
              <span>Travel Date</span>
              <span>{schedule.travelDate}</span>
            </div>
            <div className="bsp-detail-row">
              <span>Departure</span>
              <span>{formatDisplayTime(schedule.departureTime)}</span>
            </div>
            <div className="bsp-detail-row">
              <span>Arrival</span>
              <span>{formatDisplayTime(schedule.arrivalTime)}</span>
            </div>
            <div className="bsp-detail-row">
              <span>Duration</span>
              <span>{schedule.duration || "-"}</span>
            </div>
          </div>
        )}

        <div className="bsp-section">
          <h3 className="bsp-section-title">Passenger Details</h3>
          <div className="bsp-detail-row">
            <span>Phone Number</span>
            <span>{phoneNumber}</span>
          </div>
          <div className="bsp-detail-row">
            <span>Email</span>
            <span>{email}</span>
          </div>
          <div className="bsp-detail-row">
            <span>Passenger Count</span>
            <span>{passengerDetails.length || selectedSeats.length}</span>
          </div>
          {passengerDetails.length > 0 && (
            <div className="bsp-passenger-list">
              {passengerDetails.map((detail, index) => (
                <div className="bsp-passenger-card" key={`${detail.seatNumber}-${index}`}>
                  <div className="bsp-passenger-card-top">
                    <span className="bsp-passenger-seat">Seat {detail.seatNumber || "-"}</span>
                    <span className="bsp-passenger-gender">{detail.gender || "Gender not specified"}</span>
                  </div>
                  <div className="bsp-passenger-name">{detail.name || "-"}</div>
                </div>
              ))}
            </div>
          )}
          <div className="bsp-detail-row">
            <span>Boarding Point</span>
            <span>{boardingPoint} ({formatDisplayTime(boardingTime)})</span>
          </div>
          <div className="bsp-detail-row">
            <span>Dropping Point</span>
            <span>{droppingPoint} ({formatDisplayTime(droppingTime)})</span>
          </div>
          <div className="bsp-detail-row">
            <span>No. of Seats</span>
            <span>{selectedSeats.length}</span>
          </div>
          <div className="bsp-detail-row">
            <span>Selected Seats</span>
            <span>{selectedSeats.map((seat) => `Seat ${seat}`).join(", ")}</span>
          </div>
          <div className="bsp-detail-row">
            <span>Status</span>
            <span className={`bsp-status bsp-status-${normalizedStatus.toLowerCase()}`}>
              {normalizedStatus === "CANCELLED" ? "Cancelled" : "Confirmed"}
            </span>
          </div>
        </div>

        <div className="bsp-section bsp-payment-section">
          <h3 className="bsp-section-title">Payment Summary</h3>
          <div className="bsp-detail-row bsp-total-row">
            <span>Total Price</span>
            <span className="bsp-price-total">Rs. {totalPrice.toLocaleString()}</span>
          </div>
          <div className="bsp-detail-row">
            <span>Amount Paid</span>
            <span className="bsp-price-advance">Rs. {amountPaid.toLocaleString()}</span>
          </div>
        </div>

        <div className="bsp-notice">
          Ticket is sent to {email} and mobile number {phoneNumber}. You can also download or share your ticket.
        </div>

        {actionMessage && <div className="bsp-action-message">{actionMessage}</div>}

        <div className="bsp-actions">
          <button className="bsp-download-btn" onClick={handleDownloadTicket}>
            Download Ticket
          </button>
          <button className="bsp-share-btn" onClick={handleShareTicket}>
            Share Ticket
          </button>
          <button className="bsp-home-btn" onClick={() => navigate("/")}>
            Back to Home
          </button>
          <button
            className="bsp-again-btn"
            onClick={() => navigate(scheduleId ? `/booking/${scheduleId}` : "/routes")}
          >
            Book Another Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
