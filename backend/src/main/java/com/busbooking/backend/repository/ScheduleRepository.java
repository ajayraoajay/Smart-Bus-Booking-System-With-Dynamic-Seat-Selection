package com.busbooking.backend.repository;

import com.busbooking.backend.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByRouteId(Long routeId);

    @Query("SELECT COUNT(s) > 0 FROM Schedule s WHERE s.route.id = :routeId")
    boolean existsByRouteId(@Param("routeId") Long routeId);

    boolean existsByScheduleId(String scheduleId);

    Optional<Schedule> findByScheduleId(String scheduleId);
}