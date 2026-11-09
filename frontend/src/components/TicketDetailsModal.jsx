import { useEffect, useMemo, useState } from "react";
import { getBookingDisplayStatus, isBookingBoardingPassed } from "../pages/AdminDashboardPage";
import api from "../services/api";
import ConfirmationModal from "./ConfirmationModal";
import "../pages/BookingSuccessPage.css";
import "./TicketDetailsModal.css";

const formatTimeValue = (value) => (value ? value.substring(0, 5) : "-");
const formatDisplayTime = (value) => (value ? formatTimeValue(value) : "--");
const getBusLayoutLabel = (busType) => (busType === "Sleeper" ? "Sleeper" : "Seater");

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/→/g, "->")
    .replace(/•/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");

const normalizePassengerDetails = (rawPassengerDetails, selectedSeats, fallbackPassengerName, bookingStatus) => {
  if (Array.isArray(rawPassengerDetails) && rawPassengerDetails.length > 0) {
    return rawPassengerDetails
      .map((detail, index) => ({
        seatNumber: detail?.seatNumber ?? selectedSeats[index] ?? "",
        name: detail?.name ?? "",
        gender: detail?.gender ?? "",
        status: detail?.status || (bookingStatus === "CANCELLED" ? "CANCELLED" : "BOOKED"),
        refundAmount: detail?.refundAmount ?? 0,
        cancellationCharge: detail?.cancellationCharge ?? 0,
        cancelledBy: detail?.cancelledBy ?? null,
      }))
      .filter((detail) => detail.name || detail.seatNumber || detail.gender);
  }

  if (fallbackPassengerName) {
    return [{
      seatNumber: selectedSeats[0] ?? "",
      name: fallbackPassengerName,
      gender: "",
      status: bookingStatus === "CANCELLED" ? "CANCELLED" : "BOOKED",
      refundAmount: 0,
      cancellationCharge: 0,
      cancelledBy: null,
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
      const statusLabel = detail.status === "CANCELLED" ? " [Cancelled]" : "";
      return `${seatLabel}: ${detail.name}${genderLabel}${statusLabel}`;
    })
    .join("; ");
};

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
  const isPartiallyCancelled =
    normalizedStatus === "PARTIALLY CANCELLED" ||
    normalizedStatus === "PARTIALLY_CANCELLED";
  const statusLabel = isCancelled
    ? "Cancelled"
    : isPartiallyCancelled
    ? "Partially Cancelled"
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
      const statusNote = (isCancelled || p.status === "CANCELLED") ? " [Cancelled]" : "";
      lines.push({ text: `  - ${seatInfo}: ${p.name || "-"}${genderInfo}${statusNote}`, x: textXLeft, y: passengerY, size: 11, font: "F1" });
    });
  } else if (passengerList.length === 1) {
    const p = passengerList[0];
    const seatInfo = p.seatNumber ? ` (Seat ${p.seatNumber}${p.gender ? `, ${p.gender}` : ""})` : (p.gender ? ` (${p.gender})` : "");
    const statusNote = (isCancelled || p.status === "CANCELLED") ? " [Cancelled]" : "";
    lines.push({ text: `Passenger: ${p.name || "-"}${seatInfo}${statusNote}`, x: textXLeft, y: passengerY, size: 11, font: "F1" });
  } else {
    const statusNote = isCancelled ? " [Cancelled]" : "";
    lines.push({ text: `Passenger: ${passengerSummary || "-"}${statusNote}`, x: textXLeft, y: passengerY, size: 11, font: "F1" });
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

  if (isCancelled || isPartiallyCancelled || refundAmount > 0 || cancellationCharge > 0) {
    paymentY -= 18;
    lines.push(
      { text: `Refund Amount: Rs. ${refundAmount.toLocaleString()}`, x: textXLeft, y: paymentY, size: 11, font: "F1" },
      { text: `Cancellation Charge: Rs. ${cancellationCharge.toLocaleString()}`, x: textXRight, y: paymentY, size: 11, font: "F1" }
    );

    if (cancelledByLabel && cancelledByLabel !== "-") {
      paymentY -= 18;
      lines.push(
        { text: `Cancelled By: ${cancelledByLabel}`, x: textXLeft, y: paymentY, size: 11, font: "F1" }
      );
    }
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
  refundAmount,
  cancellationCharge,
  cancelledBy,
}) => {
  const bookingIds = bookings.map((booking) => booking.bookingId).join(", ");
  const routeName = schedule?.route
    ? `${schedule.route.fromCity} → ${schedule.route.toCity}`
    : "-";

  const lines = [
    "BusGo Ticket",
    `Booking ID: ${bookingIds || "-"}`,
    `Route: ${routeName}`,
    `Bus Number: ${schedule?.busNumber || "-"}`,
    `A/C Type: ${schedule?.acType === "A/C" ? "A/C" : "Non-A/C"}`,
    `Bus Layout: ${getBusLayoutLabel(schedule?.busType)}`,
    `Travel Date: ${schedule?.travelDate || "-"}`,
    `Departure Time: ${formatDisplayTime(schedule?.departureTime)}`,
    `Arrival Time: ${formatDisplayTime(schedule?.arrivalTime)}${schedule?.arrivalDay && Number(schedule.arrivalDay) > 1 ? ` (Day ${schedule.arrivalDay})` : ""}`,
    `Duration: ${schedule?.duration || "-"}`,
    `Passengers: ${passengerSummary}`,
    `Email: ${email}`,
    `Phone Number: ${phoneNumber}`,
    `Boarding Point: ${boardingPoint} (${formatDisplayTime(boardingTime)})`,
    `Dropping Point: ${droppingPoint} (${formatDisplayTime(droppingTime)})`,
    `Selected Seats: ${selectedSeats.map((seat) => `Seat ${seat}`).join(", ")}`,
    `Seat Count: ${selectedSeats.length}`,
    `Status: ${
      normalizedStatus === "CANCELLED"
        ? "Cancelled"
        : normalizedStatus === "PARTIALLY CANCELLED"
        ? "Partially Cancelled"
        : normalizedStatus === "COMPLETED"
        ? "Completed"
        : "Confirmed"
    }`,
    `Total Price: Rs. ${totalPrice.toLocaleString()}`,
    `Amount Paid: Rs. ${amountPaid.toLocaleString()}`,
  ];

  if (normalizedStatus === "CANCELLED" || normalizedStatus === "PARTIALLY CANCELLED" || refundAmount > 0 || cancellationCharge > 0) {
    lines.push(`Refund Amount: Rs. ${(refundAmount ?? 0).toLocaleString()}`);
    lines.push(`Cancellation Charge: Rs. ${(cancellationCharge ?? 0).toLocaleString()}`);
    lines.push(`Cancelled By: ${getCancelledByLabel(cancelledBy)}`);
  }

  return lines.join("\n");
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
  onBookingUpdated,
  role = "ADMIN",
  emailFallback = "-",
}) {
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [cancelPassengerTarget, setCancelPassengerTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    setCurrentBooking(booking);
    setCancelPassengerTarget(null);
    setActionMessage("");
  }, [booking]);

  const canCancel = useMemo(() => {
    if (!currentBooking) return false;
    if (currentBooking.status === "CANCELLED") return false;
    if (isBookingBoardingPassed(currentBooking)) return false;
    const dispStatus = getBookingDisplayStatus(currentBooking);
    if (dispStatus === "Completed" || dispStatus === "COMPLETED") return false;
    return true;
  }, [currentBooking]);

  const ticketData = useMemo(() => {
    if (!currentBooking) {
      return null;
    }

    const selectedSeats = parseSelectedSeats(currentBooking);
    const schedule = currentBooking.schedule ?? null;
    const routeName = schedule?.route
      ? `${schedule.route.fromCity} → ${schedule.route.toCity}`
      : "-";
    const displayStatus = getBookingDisplayStatus(currentBooking);
    const isCancelled =
      currentBooking.status === "CANCELLED" || displayStatus === "CANCELLED";
    const isPartiallyCancelled =
      currentBooking.status === "PARTIALLY CANCELLED" ||
      currentBooking.status === "PARTIALLY_CANCELLED" ||
      displayStatus === "Partially Cancelled" ||
      displayStatus === "PARTIALLY CANCELLED";

    const normalizedStatus = isCancelled
      ? "CANCELLED"
      : isPartiallyCancelled
      ? "PARTIALLY CANCELLED"
      : displayStatus === "Completed" || displayStatus === "COMPLETED"
      ? "COMPLETED"
      : "BOOKED";

    const email = currentBooking.email || currentBooking.passengerEmail || "-";
    const passengerDetails = normalizePassengerDetails(
      currentBooking.passengerDetails,
      selectedSeats,
      currentBooking.passengerName ?? "-",
      normalizedStatus
    );
    const passengerSummary = buildPassengerSummary(passengerDetails, currentBooking.passengerName ?? "-");

    return {
      bookings: [currentBooking],
      bookingIdForFile: currentBooking.bookingId ?? "ticket",
      selectedSeats,
      totalPrice: currentBooking.totalPrice ?? 0,
      amountPaid: currentBooking.totalPrice ?? 0,
      passengerDetails,
      passengerSummary,
      email,
      phoneNumber: currentBooking.phoneNumber || currentBooking.passengerPhone || "-",
      schedule,
      routeName,
      busLayoutType: getBusLayoutLabel(schedule?.busType),
      normalizedStatus,
      boardingPoint: currentBooking.boardingPoint ?? "-",
      boardingTime: currentBooking.boardingTime ?? "-",
      droppingPoint: currentBooking.droppingPoint ?? "-",
      droppingTime: currentBooking.droppingTime ?? "-",
      refundAmount: currentBooking.refundAmount ?? 0,
      cancellationCharge: currentBooking.cancellationCharge ?? 0,
      cancelledBy: currentBooking.cancelledBy ?? "",
    };
  }, [currentBooking]);

  const handleConfirmCancelPassenger = async () => {
    if (!cancelPassengerTarget || !currentBooking) return;
    try {
      setCancelLoading(true);
      const isSinglePassenger = (ticketData?.passengerDetails?.length || 0) <= 1;
      const seatNum = isSinglePassenger ? null : (cancelPassengerTarget.seatNumber ? Number(cancelPassengerTarget.seatNumber) : null);
      const params = new URLSearchParams();
      params.append("cancelledBy", role);
      if (seatNum != null) {
        params.append("seatNumber", seatNum);
      }
      const response = await api.put(`/bookings/${currentBooking.id}/cancel?${params.toString()}`);
      const updated = response.data;
      const mergedBooking = {
        ...currentBooking,
        status: updated.status || currentBooking.status,
        refundAmount: updated.refundAmount ?? currentBooking.refundAmount,
        cancellationCharge: updated.cancellationCharge ?? currentBooking.cancellationCharge,
        cancelledBy: updated.cancelledBy || currentBooking.cancelledBy,
        passengerDetails: updated.passengerDetails || currentBooking.passengerDetails,
      };
      setCurrentBooking(mergedBooking);
      if (onBookingUpdated) {
        onBookingUpdated(mergedBooking);
      }
      setCancelPassengerTarget(null);
    } catch (err) {
      console.error("Failed to cancel ticket:", err);
      alert(err.response?.data?.message || err.message || "Failed to cancel ticket.");
    } finally {
      setCancelLoading(false);
    }
  };

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
    refundAmount,
    cancellationCharge,
    cancelledBy,
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
        refundAmount,
        cancellationCharge,
        cancelledBy,
      });
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `BusGo-Ticket-${bookingIdForFile}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setActionMessage("");
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
            refundAmount,
            cancellationCharge,
            cancelledBy,
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
            setActionMessage("");
            return;
          }
        }

        await navigator.share({
          title: shareTitle,
          text: ticketText,
        });
        setActionMessage("");
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
      <div className="tdm-dialog" role="dialog" aria-modal="true" aria-label="Ticket details" onClick={(e) => e.stopPropagation()}>
        <button
          className="tdm-close-btn"
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close ticket details"
        >
          ✕
        </button>

        <div className="bsp-success-header">
          <div className={`tdm-status-circle ${normalizedStatus === "CANCELLED" ? "cancelled" : normalizedStatus === "COMPLETED" ? "completed" : ""}`}>
            {normalizedStatus === "CANCELLED" ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <h1 className="bsp-title">
            {normalizedStatus === "CANCELLED"
              ? "Cancelled Ticket"
              : normalizedStatus === "COMPLETED"
              ? "Completed Journey"
              : "Ticket Details"}
          </h1>
          <p className="bsp-subtitle">
            {normalizedStatus === "CANCELLED"
              ? "This booking was cancelled and the full ticket details are shown below."
              : normalizedStatus === "COMPLETED"
              ? "This journey has been completed and the full ticket details are shown below."
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
              <span>{schedule.route?.fromCity} → {schedule.route?.toCity}</span>
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
              <span>
                {formatDisplayTime(schedule.arrivalTime)}
                {schedule.arrivalDay && Number(schedule.arrivalDay) > 1 ? ` (Day ${schedule.arrivalDay})` : ""}
              </span>
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
              {passengerDetails.map((detail, index) => {
                const isPassengerCancelled =
                  detail.status === "CANCELLED" || normalizedStatus === "CANCELLED";

                return (
                  <div className="bsp-passenger-card" key={`${detail.seatNumber}-${index}`}>
                    <div className="bsp-passenger-card-top">
                      <span className="bsp-passenger-seat">Seat {detail.seatNumber || "-"}</span>
                      <span className="bsp-passenger-gender">{detail.gender || "Gender not specified"}</span>
                    </div>
                    <div className="bsp-passenger-card-bottom">
                      <div className="bsp-passenger-name">{detail.name || "-"}</div>
                      {isPassengerCancelled ? (
                        <span className="tdm-passenger-cancelled-badge">Cancelled</span>
                      ) : canCancel ? (
                        <button
                          type="button"
                          className="tdm-passenger-cancel-btn"
                          onClick={() => setCancelPassengerTarget(detail)}
                        >
                          Cancel Ticket
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
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
            <span className={`bsp-status bsp-status-${normalizedStatus.toLowerCase().replace(/\s+/g, '-')}`}>
              {normalizedStatus === "CANCELLED"
                ? "Cancelled"
                : normalizedStatus === "PARTIALLY CANCELLED"
                ? "Partially Cancelled"
                : normalizedStatus === "COMPLETED"
                ? "Completed"
                : "Confirmed"}
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
            <span className="bsp-price-advance tdm-price-paid">Rs. {amountPaid.toLocaleString()}</span>
          </div>
          {(normalizedStatus === "CANCELLED" || normalizedStatus === "PARTIALLY CANCELLED" || refundAmount > 0 || cancellationCharge > 0) && (
            <>
              <div className="bsp-detail-row">
                <span>Refund Amount</span>
                <span className="tdm-price-refund">Rs. {refundAmount.toLocaleString()}</span>
              </div>
              <div className="bsp-detail-row">
                <span>Cancellation Charge</span>
                <span className="tdm-price-charge">Rs. {cancellationCharge.toLocaleString()}</span>
              </div>
              <div className="bsp-detail-row">
                <span>Cancelled By</span>
                <span className="tdm-cancelled-by">{getCancelledByLabel(cancelledBy)}</span>
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

      <ConfirmationModal
        open={!!cancelPassengerTarget}
        icon="X"
        title="Confirm Cancellation"
        message={
          ticketData && (ticketData.passengerDetails?.length || 0) <= 1
            ? "Are you sure you want to cancel this booking?"
            : `Are you sure you want to cancel ticket for ${cancelPassengerTarget?.name || `Seat ${cancelPassengerTarget?.seatNumber}`} (Seat ${cancelPassengerTarget?.seatNumber})?`
        }
        note={
          role === "USER"
            ? ticketData && (ticketData.passengerDetails?.length || 0) <= 1
              ? "30% cancellation charges apply. Only 70% of the amount will be refunded."
              : "30% cancellation charges apply. Only 70% of the seat amount will be refunded."
            : ticketData && (ticketData.passengerDetails?.length || 0) <= 1
              ? "This cancellation is being done by admin, so 100% of the amount will be refunded."
              : "This cancellation is being done by admin, so 100% of the seat amount will be refunded."
        }
        cancelLabel="Cancel"
        confirmLabel="Yes, Cancel"
        confirmVariant="danger"
        loading={cancelLoading}
        onCancel={() => !cancelLoading && setCancelPassengerTarget(null)}
        onConfirm={handleConfirmCancelPassenger}
      />
    </div>
  );
}
