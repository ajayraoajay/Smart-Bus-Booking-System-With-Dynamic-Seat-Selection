package com.busbooking.backend.repository;

import com.busbooking.backend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findBySchedule_IdOrderByIdDesc(Long scheduleId);

    boolean existsBySchedule_IdAndSeatNumberAndStatus(Long scheduleId, Integer seatNumber, String status);

    List<Booking> findByUserIdOrderByIdDesc(Long userId);
}
