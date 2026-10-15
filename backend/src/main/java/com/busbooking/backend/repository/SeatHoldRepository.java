package com.busbooking.backend.repository;

import com.busbooking.backend.entity.SeatHold;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {
    List<SeatHold> findBySchedule_IdAndExpiresAtAfter(Long scheduleId, LocalDateTime expiresAt);

    void deleteByHoldToken(String holdToken);

    void deleteByExpiresAtBefore(LocalDateTime expiresAt);
}
