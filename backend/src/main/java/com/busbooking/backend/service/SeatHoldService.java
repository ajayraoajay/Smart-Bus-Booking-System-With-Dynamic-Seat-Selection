package com.busbooking.backend.service;

import com.busbooking.backend.dto.SeatHoldRequest;
import com.busbooking.backend.dto.SeatHoldResponse;
import com.busbooking.backend.entity.Booking;
import com.busbooking.backend.entity.Schedule;
import com.busbooking.backend.entity.SeatHold;
import com.busbooking.backend.exception.ResourceNotFoundException;
import com.busbooking.backend.exception.SeatAlreadyBookedException;
import com.busbooking.backend.repository.BookingRepository;
import com.busbooking.backend.repository.ScheduleRepository;
import com.busbooking.backend.repository.SeatHoldRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class SeatHoldService {

    private static final long HOLD_DURATION_MINUTES = 5;

    private final SeatHoldRepository seatHoldRepository;
    private final ScheduleRepository scheduleRepository;
    private final BookingRepository bookingRepository;

    public SeatHoldService(
            SeatHoldRepository seatHoldRepository,
            ScheduleRepository scheduleRepository,
            BookingRepository bookingRepository
    ) {
        this.seatHoldRepository = seatHoldRepository;
        this.scheduleRepository = scheduleRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<Integer> getUnavailableSeatNumbers(Long scheduleId, String excludedHoldToken) {
        clearExpiredHolds();

        List<Integer> bookedSeats = collectActiveBookedSeatNumbers(bookingRepository.findBySchedule_IdOrderByIdDesc(scheduleId));
        List<Integer> heldSeats = seatHoldRepository.findBySchedule_IdAndExpiresAtAfter(scheduleId, now()).stream()
                .filter(hold -> excludedHoldToken == null || excludedHoldToken.isBlank() || !excludedHoldToken.equals(hold.getHoldToken()))
                .map(SeatHold::getSeatNumber)
                .toList();

        return Stream.concat(bookedSeats.stream(), heldSeats.stream())
                .distinct()
                .sorted()
                .toList();
    }

    @Transactional
    public SeatHoldResponse placeSeatHold(SeatHoldRequest request) {
        clearExpiredHolds();

        Schedule schedule = scheduleRepository.findById(request.getScheduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found."));

        List<Integer> requestedSeats = normalizeSeatNumbers(request.getSeatNumbers());
        List<Integer> bookedSeats = collectActiveBookedSeatNumbers(bookingRepository.findBySchedule_IdOrderByIdDesc(request.getScheduleId()));
        List<Integer> conflictingBookedSeats = requestedSeats.stream()
                .filter(bookedSeats::contains)
                .toList();

        if (!conflictingBookedSeats.isEmpty()) {
            throw new SeatAlreadyBookedException(buildSeatConflictMessage(conflictingBookedSeats, "already booked"));
        }

        List<Integer> conflictingHeldSeats = seatHoldRepository
                .findBySchedule_IdAndExpiresAtAfter(request.getScheduleId(), now())
                .stream()
                .filter(hold -> !request.getHoldToken().equals(hold.getHoldToken()))
                .map(SeatHold::getSeatNumber)
                .filter(requestedSeats::contains)
                .distinct()
                .sorted()
                .toList();

        if (!conflictingHeldSeats.isEmpty()) {
            throw new SeatAlreadyBookedException(buildSeatConflictMessage(conflictingHeldSeats, "temporarily locked by another user"));
        }

        seatHoldRepository.deleteByHoldToken(request.getHoldToken());

        LocalDateTime expiresAt = now().plusMinutes(HOLD_DURATION_MINUTES);
        List<SeatHold> holds = requestedSeats.stream()
                .map(seatNumber -> {
                    SeatHold seatHold = new SeatHold();
                    seatHold.setSchedule(schedule);
                    seatHold.setSeatNumber(seatNumber);
                    seatHold.setHoldToken(request.getHoldToken());
                    seatHold.setExpiresAt(expiresAt);
                    return seatHold;
                })
                .toList();

        try {
            seatHoldRepository.saveAll(holds);
        } catch (DataIntegrityViolationException ex) {
            throw new SeatAlreadyBookedException("One or more selected seats were just taken. Please choose a different seat.");
        }

        return new SeatHoldResponse(
                "Selected seats are locked for 5 minutes while you complete payment.",
                requestedSeats,
                expiresAt.toString(),
                HOLD_DURATION_MINUTES
        );
    }

    @Transactional
    public void releaseSeatHold(String holdToken) {
        if (holdToken == null || holdToken.isBlank()) {
            return;
        }

        clearExpiredHolds();
        seatHoldRepository.deleteByHoldToken(holdToken);
    }

    @Transactional
    public void clearExpiredHolds() {
        seatHoldRepository.deleteByExpiresAtBefore(now());
    }

    private List<Integer> collectActiveBookedSeatNumbers(List<Booking> bookings) {
        return bookings.stream()
                .filter(this::isActiveBooking)
                .flatMap(booking -> {
                    if (booking.getSeatNumbers() != null && !booking.getSeatNumbers().isBlank()) {
                        return java.util.Arrays.stream(booking.getSeatNumbers().split(","))
                                .map(String::trim)
                                .filter(value -> !value.isBlank())
                                .map(Integer::parseInt);
                    }

                    return booking.getSeatNumber() != null
                            ? Stream.of(booking.getSeatNumber())
                            : Stream.empty();
                })
                .distinct()
                .sorted()
                .toList();
    }

    private boolean isActiveBooking(Booking booking) {
        return booking.getStatus() != null && !"CANCELLED".equalsIgnoreCase(booking.getStatus());
    }

    private List<Integer> normalizeSeatNumbers(List<Integer> seatNumbers) {
        return seatNumbers.stream()
                .filter(Objects::nonNull)
                .distinct()
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.toList());
    }

    private String buildSeatConflictMessage(List<Integer> seatNumbers, String reason) {
        if (seatNumbers.size() == 1) {
            return "Seat #" + seatNumbers.get(0) + " is " + reason + ".";
        }

        String seatLabel = seatNumbers.stream()
                .map(seat -> "#" + seat)
                .collect(Collectors.joining(", "));
        return "Seats " + seatLabel + " are " + reason + ".";
    }

    private LocalDateTime now() {
        return LocalDateTime.now();
    }
}
