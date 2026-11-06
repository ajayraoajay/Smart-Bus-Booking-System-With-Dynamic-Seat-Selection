package com.busbooking.backend.service;

import com.busbooking.backend.dto.BookingRequest;
import com.busbooking.backend.dto.BookingResponse;
import com.busbooking.backend.entity.Booking;
import com.busbooking.backend.entity.Schedule;
import com.busbooking.backend.exception.ResourceNotFoundException;
import com.busbooking.backend.exception.SeatAlreadyBookedException;
import com.busbooking.backend.model.PassengerDetail;
import com.busbooking.backend.model.ScheduleStop;
import com.busbooking.backend.repository.BookingRepository;
import com.busbooking.backend.repository.ScheduleRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final String CANCELLED_BY_USER = "USER";
    private static final String CANCELLED_BY_ADMIN = "ADMIN";

    private final BookingRepository bookingRepository;
    private final ScheduleRepository scheduleRepository;
    private final SeatHoldService seatHoldService;

    public BookingService(
            BookingRepository bookingRepository,
            ScheduleRepository scheduleRepository,
            SeatHoldService seatHoldService
    ) {
        this.bookingRepository = bookingRepository;
        this.scheduleRepository = scheduleRepository;
        this.seatHoldService = seatHoldService;
    }

    public List<Booking> getAllBookings() {
        return normalizeLegacyStatuses(bookingRepository.findAll(Sort.by(Sort.Direction.DESC, "id")));
    }

    public List<Booking> getBookingsBySchedule(Long scheduleId) {
        return normalizeLegacyStatuses(bookingRepository.findBySchedule_IdOrderByIdDesc(scheduleId));
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return normalizeLegacyStatuses(bookingRepository.findByUserIdOrderByIdDesc(userId));
    }

    public List<Integer> getBookedSeatNumbers(Long scheduleId) {
        return getBookedSeatNumbers(scheduleId, null);
    }

    public List<Integer> getBookedSeatNumbers(Long scheduleId, String holdToken) {
        return seatHoldService.getUnavailableSeatNumbers(scheduleId, holdToken);
    }

    public BookingResponse createBooking(BookingRequest bookingRequest) {
        List<Integer> requestedSeats = resolveRequestedSeats(bookingRequest);
        List<PassengerDetail> passengerDetails = resolvePassengerDetails(bookingRequest, requestedSeats);
        List<Integer> takenSeats = seatHoldService.getUnavailableSeatNumbers(
                bookingRequest.getScheduleId(),
                bookingRequest.getHoldToken()
        );

        for (Integer seat : requestedSeats) {
            if (takenSeats.contains(seat)) {
                throw new SeatAlreadyBookedException("Seat #" + seat + " is already booked.");
            }
        }

        Schedule schedule = scheduleRepository.findById(bookingRequest.getScheduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found."));
        ScheduleStop boardingStop = resolveSelectedStop(
                bookingRequest.getBoardingPoint(),
                fallbackBoardingStops(schedule),
                "boarding"
        );
        ScheduleStop droppingStop = resolveSelectedStop(
                bookingRequest.getDroppingPoint(),
                fallbackDroppingStops(schedule),
                "dropping"
        );
        int totalPrice = (schedule.getPrice() != null ? schedule.getPrice() : 0) * requestedSeats.size();

        Booking booking = new Booking();
        booking.setBookingId(generateBookingId());
        booking.setPassengerName(
                passengerDetails.stream()
                        .map(PassengerDetail::getName)
                        .collect(Collectors.joining(", "))
        );
        booking.setPassengerDetails(passengerDetails);
        booking.setPhoneNumber(bookingRequest.getPhoneNumber());
        booking.setEmail(bookingRequest.getEmail());
        booking.setStatus("BOOKED");
        booking.setSchedule(schedule);
        booking.setTotalPrice(totalPrice);
        booking.setUserId(bookingRequest.getUserId());
        booking.setBoardingPoint(boardingStop.getPoint());
        booking.setBoardingTime(boardingStop.getTime());
        booking.setDroppingPoint(droppingStop.getPoint());
        booking.setDroppingTime(droppingStop.getTime());
        booking.setSeatNumber(requestedSeats.get(0));
        booking.setSeatNumbers(
                requestedSeats.stream()
                        .map(String::valueOf)
                        .collect(Collectors.joining(","))
        );

        Booking saved = bookingRepository.save(booking);
        seatHoldService.releaseSeatHold(bookingRequest.getHoldToken());

        return new BookingResponse(
                "Booking confirmed successfully",
                saved.getBookingId(),
                saved.getPassengerName(),
                saved.getPassengerDetails(),
                saved.getPhoneNumber(),
                saved.getSeatNumber(),
                saved.getStatus(),
                saved.getSchedule().getId(),
                saved.getTotalPrice(),
                saved.getRefundAmount(),
                saved.getCancellationCharge(),
                saved.getCancelledBy(),
                saved.getBoardingPoint(),
                saved.getBoardingTime(),
                saved.getDroppingPoint(),
                saved.getDroppingTime()
        );
    }

    public BookingResponse cancelBooking(Long bookingId, String cancelledBy) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found."));

        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new RuntimeException("Booking is already cancelled.");
        }

        String cancellationSource = normalizeCancellationSource(cancelledBy);
        int refundAmount = calculateRefundAmount(booking.getTotalPrice(), cancellationSource);
        int cancellationCharge = booking.getTotalPrice() - refundAmount;

        booking.setStatus("CANCELLED");
        booking.setRefundAmount(refundAmount);
        booking.setCancellationCharge(cancellationCharge);
        booking.setCancelledBy(cancellationSource);

        Booking updated = bookingRepository.save(booking);

        String message = CANCELLED_BY_USER.equals(cancellationSource)
                ? "Booking cancelled successfully. 30% cancellation charges apply and Rs. " + refundAmount + " will be refunded."
                : "Booking cancelled by admin. Full refund of Rs. " + refundAmount + " will be processed.";

        return buildResponse(message, updated);
    }

    private BookingResponse buildResponse(String message, Booking booking) {
        return new BookingResponse(
                message,
                booking.getBookingId(),
                booking.getPassengerName(),
                booking.getPassengerDetails(),
                booking.getPhoneNumber(),
                booking.getSeatNumber(),
                booking.getStatus(),
                booking.getSchedule().getId(),
                booking.getTotalPrice(),
                booking.getRefundAmount(),
                booking.getCancellationCharge(),
                booking.getCancelledBy(),
                booking.getBoardingPoint(),
                booking.getBoardingTime(),
                booking.getDroppingPoint(),
                booking.getDroppingTime()
        );
    }

    private String generateBookingId() {
        return "BSB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private List<Integer> resolveRequestedSeats(BookingRequest bookingRequest) {
        if (bookingRequest.getSeatNumbers() != null && !bookingRequest.getSeatNumbers().isEmpty()) {
            return bookingRequest.getSeatNumbers().stream()
                    .filter(Objects::nonNull)
                    .distinct()
                    .sorted()
                    .toList();
        }

        if (bookingRequest.getSeatNumber() == null) {
            throw new SeatAlreadyBookedException("Please select at least one seat.");
        }

        return List.of(bookingRequest.getSeatNumber());
    }

    private List<PassengerDetail> resolvePassengerDetails(BookingRequest bookingRequest, List<Integer> requestedSeats) {
        if (bookingRequest.getPassengerDetails() == null || bookingRequest.getPassengerDetails().isEmpty()) {
            return List.of(new PassengerDetail(
                    requestedSeats.get(0),
                    bookingRequest.getPassengerName(),
                    ""
            ));
        }

        Map<Integer, PassengerDetail> passengerBySeat = new LinkedHashMap<>();
        for (PassengerDetail detail : bookingRequest.getPassengerDetails()) {
            if (detail == null || detail.getSeatNumber() == null) {
                continue;
            }

            passengerBySeat.put(
                    detail.getSeatNumber(),
                    new PassengerDetail(
                            detail.getSeatNumber(),
                            detail.getName() == null ? "" : detail.getName().trim(),
                            detail.getGender() == null ? "" : detail.getGender().trim()
                    )
            );
        }

        List<PassengerDetail> passengerDetails = requestedSeats.stream()
                .map(passengerBySeat::get)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(PassengerDetail::getSeatNumber))
                .toList();

        if (passengerDetails.size() != requestedSeats.size()) {
            throw new IllegalArgumentException("Please enter passenger details for every selected seat.");
        }

        boolean hasMissingPassengerInfo = passengerDetails.stream().anyMatch(detail ->
                detail.getName().isBlank() || detail.getGender().isBlank()
        );

        if (hasMissingPassengerInfo) {
            throw new IllegalArgumentException("Please enter full name and gender for every selected seat.");
        }

        return passengerDetails;
    }

    private List<Booking> normalizeLegacyStatuses(List<Booking> bookings) {
        boolean hasLegacyStatuses = bookings.stream().anyMatch(this::isLegacyAwaitingConfirmation);

        if (!hasLegacyStatuses) {
            return bookings;
        }

        bookings.forEach(booking -> {
            if (isLegacyAwaitingConfirmation(booking)) {
                booking.setStatus("BOOKED");
            }
        });

        return bookingRepository.saveAll(bookings);
    }

    private boolean isLegacyAwaitingConfirmation(Booking booking) {
        return "PENDING".equalsIgnoreCase(booking.getStatus())
                || "RESERVED".equalsIgnoreCase(booking.getStatus());
    }

    private String normalizeCancellationSource(String cancelledBy) {
        return CANCELLED_BY_USER.equalsIgnoreCase(cancelledBy)
                ? CANCELLED_BY_USER
                : CANCELLED_BY_ADMIN;
    }

    private int calculateRefundAmount(int totalPrice, String cancellationSource) {
        if (CANCELLED_BY_USER.equals(cancellationSource)) {
            return (int) Math.round(totalPrice * 0.7);
        }

        return totalPrice;
    }

    private ScheduleStop resolveSelectedStop(String selectedPoint, List<ScheduleStop> stops, String label) {
        if (selectedPoint == null || selectedPoint.isBlank()) {
            throw new IllegalArgumentException("Please select a " + label + " point.");
        }

        return stops.stream()
                .filter(Objects::nonNull)
                .filter(stop -> stop.getPoint() != null)
                .filter(stop -> stop.getPoint().trim().equalsIgnoreCase(selectedPoint.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Selected " + label + " point is not available for this schedule."));
    }

    private List<ScheduleStop> fallbackBoardingStops(Schedule schedule) {
        if (schedule.getBoardingStops() != null && !schedule.getBoardingStops().isEmpty()) {
            return schedule.getBoardingStops();
        }

        List<ScheduleStop> fallbackStops = new ArrayList<>();
        if (schedule.getRoute() != null && schedule.getRoute().getFromCity() != null) {
            fallbackStops.add(new ScheduleStop(
                    schedule.getRoute().getFromCity(),
                    normalizeTime(schedule.getDepartureTime())
            ));
        }
        return fallbackStops;
    }

    private List<ScheduleStop> fallbackDroppingStops(Schedule schedule) {
        if (schedule.getDroppingStops() != null && !schedule.getDroppingStops().isEmpty()) {
            return schedule.getDroppingStops();
        }

        List<ScheduleStop> fallbackStops = new ArrayList<>();
        if (schedule.getRoute() != null && schedule.getRoute().getToCity() != null) {
            fallbackStops.add(new ScheduleStop(
                    schedule.getRoute().getToCity(),
                    normalizeTime(schedule.getArrivalTime() != null ? schedule.getArrivalTime() : schedule.getDepartureTime())
            ));
        }
        return fallbackStops;
    }

    private String normalizeTime(LocalTime time) {
        return time == null ? "" : time.toString();
    }
}
