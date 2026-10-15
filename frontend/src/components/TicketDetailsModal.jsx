import { useMemo, useState } from "react";
import "../pages/BookingSuccessPage.css";
import "./TicketDetailsModal.css";

const formatTimeValue = (value) => (value ? value.substring(0, 5) : "-");
const formatDisplayTime = (value) => (value ? formatTimeValue(value) : "--");
const getBusLayoutLabel = (busType) => (busType === "Sleeper" ? "Sleeper" : "Seater");

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");

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

const buildPdfObject = (objectNumber, content) => `${objectNumber} 0 obj\n${content}\nendobj\n`;

const buildTicketPdfBlob = ({
  bookingIdForFile,
  routeName,
  schedule,
  busLayoutType,
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
}) => {
  const lines = [
    { text: "BusGo Ticket", x: 48, y: 800, size: 24, font: "F2" },
    { text: `Booking ID: ${bookingIdForFile}`, x: 48, y: 776, size: 11, font: "F1" },
    { text: "Journey Details", x: 52, y: 732, size: 14, font: "F2" },
    { text: `Route: ${routeName}`, x: 52, y: 708, size: 11, font: "F1" },
    { text: `Bus Number: ${schedule?.busNumber || "-"}`, x: 52, y: 690, size: 11, font: "F1" },
    { text: `A/C Type: ${schedule?.acType === "A/C" ? "A/C" : "Non-A/C"}`, x: 52, y: 672, size: 11, font: "F1" },
    { text: `Bus Layout: ${busLayoutType}`, x: 52, y: 654, size: 11, font: "F1" },
    { text: `Travel Date: ${schedule?.travelDate || "-"}`, x: 52, y: 636, size: 11, font: "F1" },
    { text: `Departure: ${formatDisplayTime(schedule?.departureTime)}`, x: 310, y: 708, size: 11, font: "F1" },
    { text: `Arrival: ${formatDisplayTime(schedule?.arrivalTime)}`, x: 310, y: 690, size: 11, font: "F1" },
    { text: `Duration: ${schedule?.duration || "-"}`, x: 310, y: 672, size: 11, font: "F1" },
    { text: "Passenger Details", x: 52, y: 590, size: 14, font: "F2" },
    { text: `Passengers: ${passengerSummary}`, x: 52, y: 566, size: 11, font: "F1" },
    { text: `Email: ${email}`, x: 52, y: 548, size: 11, font: "F1" },
    { text: `Phone: ${phoneNumber}`, x: 52, y: 530, size: 11, font: "F1" },
    { text: `Seats: ${selectedSeats.map((seat) => `Seat ${seat}`).join(", ")}`, x: 52, y: 512, size: 11, font: "F1" },
    { text: `Status: ${normalizedStatus === "CANCELLED" ? "Cancelled" : "Confirmed"}`, x: 310, y: 566, size: 11, font: "F1" },
    { text: `Boarding: ${boardingPoint} (${formatDisplayTime(boardingTime)})`, x: 310, y: 548, size: 11, font: "F1" },
    { text: `Dropping: ${droppingPoint} (${formatDisplayTime(droppingTime)})`, x: 310, y: 530, size: 11, font: "F1" },
    { text: "Payment Summary", x: 52, y: 466, size: 14, font: "F2" },
    { text: `Total Price: Rs. ${totalPrice.toLocaleString()}`, x: 52, y: 442, size: 11, font: "F1" },
    { text: `Amount Paid: Rs. ${amountPaid.toLocaleString()}`, x: 310, y: 442, size: 11, font: "F1" },
    { text: `Ticket sent to ${email} and ${phoneNumber}.`, x: 52, y: 396, size: 11, font: "F1" },
    { text: "Thank you for booking with BusGo.", x: 52, y: 378, size: 11, font: "F1" },
  ];

  const contentCommands = [
    "0.93 0.96 1 rg",
    "40 760 515 58 re f",
    "0.96 0.98 1 rg",
    "40 620 515 122 re f",
    "0.97 0.98 0.99 rg",
    "40 496 515 106 re f",
    "0.94 0.97 1 rg",
    "40 420 515 58 re f",
    "0 0 0 rg",
    "0.88 0.91 0.95 RG",
    "1 w",
    "40 620 515 122 re S",
    "40 496 515 106 re S",
    "40 420 515 58 re S",
  ];

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

const parseSelectedSeats = (booking) => {
  if (booking?.seatNumbers && booking.seatNumbers.trim() !== "") {
    return booking.seatNumbers
      .split(",")
      .map((seat) => seat.trim())
      .filter(Boolean);
  }

  if (booking?.seatNumber !== null && booking?.seatNumber !== undefined) {
    return [String(booking.seatNumber)];
  }

  return [];
};

const getCancelledByLabel = (cancelledBy) => {
  if (cancelledBy === "USER") {
    return "User";
  }

  if (cancelledBy === "ADMIN") {
    return "Admin";
  }

  return "-";
};

export default function TicketDetailsModal({
  open,
  booking,
  onClose,
  emailFallback = "-",
}) {
  const [actionMessage, setActionMessage] = useState("");

  const ticketData = useMemo(() => {
    if (!booking) {
      return null;
    }

    const selectedSeats = parseSelectedSeats(booking);
    const schedule = booking.schedule ?? null;
    const routeName = schedule?.route
      ? `${schedule.route.fromCity} -> ${schedule.route.toCity}`
      : "-";
    const normalizedStatus = booking.status === "CANCELLED" ? "CANCELLED" : "BOOKED";
    const email = booking.email ?? booking.user?.email ?? emailFallback ?? "-";
    const passengerDetails = normalizePassengerDetails(
      booking.passengerDetails,
      selectedSeats,
      booking.passengerName ?? "-"
    );
    const passengerSummary = buildPassengerSummary(passengerDetails, booking.passengerName ?? "-");

    return {
      bookings: [booking],
      bookingIdForFile: booking.bookingId ?? "ticket",
      selectedSeats,
      totalPrice: booking.totalPrice ?? 0,
      amountPaid: booking.totalPrice ?? 0,
      passengerDetails,
      passengerSummary,
      email,
      phoneNumber: booking.phoneNumber ?? "-",
      schedule,
      routeName,
      busLayoutType: getBusLayoutLabel(schedule?.busType),
      normalizedStatus,
      boardingPoint: booking.boardingPoint ?? "-",
      boardingTime: booking.boardingTime ?? "-",
      droppingPoint: booking.droppingPoint ?? "-",
      droppingTime: booking.droppingTime ?? "-",
      refundAmount: booking.refundAmount ?? 0,
      cancellationCharge: booking.cancellationCharge ?? 0,
      cancelledBy: booking.cancelledBy ?? "",
    };
  }, [booking, emailFallback]);

  if (!open || !ticketData) {
    return null;
  }

  const {
    bookings,
    bookingIdForFile,
    selectedSeats,
    totalPrice,
    amountPaid,
    passengerDetails,
    passengerSummary,
    email,
    phoneNumber,
    schedule,
    routeName,
    busLayoutType,
    normalizedStatus,
    boardingPoint,
    boardingTime,
    droppingPoint,
    droppingTime,
    refundAmount,
    cancellationCharge,
    cancelledBy,
  } = ticketData;

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
    <div className="tdm-overlay" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="tdm-dialog" role="dialog" aria-modal="true" aria-label="Ticket details">
        <button className="tdm-close" type="button" onClick={onClose} aria-label="Close ticket details">
          x
        </button>

        <div className="tdm-scroll">
          <div className="bsp-card tdm-card">
            <div className="bsp-success-header">
              <div className={`tdm-status-circle ${normalizedStatus === "CANCELLED" ? "cancelled" : ""}`}>
                {normalizedStatus === "CANCELLED" ? "!" : "OK"}
              </div>
              <h1 className="bsp-title">
                {normalizedStatus === "CANCELLED" ? "Cancelled Ticket" : "Ticket Details"}
              </h1>
              <p className="bsp-subtitle">
                {normalizedStatus === "CANCELLED"
                  ? "This booking was cancelled and the full ticket details are shown below."
                  : "This ticket is confirmed and all booking details are shown below."}
              </p>
            </div>

            <div className="bsp-booking-ids">
              <div className="bsp-id-badge">
                <span className="bsp-id-label">Booking ID</span>
                <span className="bsp-id-value">{bookingIdForFile}</span>
              </div>
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
                  <span>{schedule.busNumber || "-"}</span>
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
                  <span>{schedule.travelDate || "-"}</span>
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
                <span>{email || "-"}</span>
              </div>
              <div className="bsp-detail-row">
                <span>Passenger Count</span>
                <span>{passengerDetails.length || selectedSeats.length || "-"}</span>
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
                <span>{selectedSeats.length || "-"}</span>
              </div>
              <div className="bsp-detail-row">
                <span>Selected Seats</span>
                <span>{selectedSeats.length ? selectedSeats.map((seat) => `Seat ${seat}`).join(", ") : "-"}</span>
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
              {normalizedStatus === "CANCELLED" && (
                <>
                  <div className="bsp-detail-row">
                    <span>Refund Amount</span>
                    <span>Rs. {refundAmount.toLocaleString()}</span>
                  </div>
                  <div className="bsp-detail-row">
                    <span>Cancellation Charge</span>
                    <span>Rs. {cancellationCharge.toLocaleString()}</span>
                  </div>
                  <div className="bsp-detail-row">
                    <span>Cancelled By</span>
                    <span>{getCancelledByLabel(cancelledBy)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="bsp-notice">
              {email && email !== "-"
                ? `Ticket is sent to ${email} and mobile number ${phoneNumber}. You can also download or share your ticket.`
                : "You can download or share this ticket from here."}
            </div>

            {actionMessage && <div className="bsp-action-message">{actionMessage}</div>}

            <div className="bsp-actions tdm-actions">
              <button className="bsp-download-btn" type="button" onClick={handleDownloadTicket}>
                Download Ticket
              </button>
              <button className="bsp-share-btn" type="button" onClick={handleShareTicket}>
                Share Ticket
              </button>
              <button className="bsp-home-btn" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
