package com.busbooking.backend.service;

import com.busbooking.backend.dto.ScheduleRequest;
import com.busbooking.backend.entity.Route;
import com.busbooking.backend.entity.Schedule;
import com.busbooking.backend.exception.ResourceNotFoundException;
import com.busbooking.backend.model.ScheduleStop;
import com.busbooking.backend.repository.RouteRepository;
import com.busbooking.backend.repository.ScheduleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final RouteRepository routeRepository;

    public ScheduleService(ScheduleRepository scheduleRepository, RouteRepository routeRepository) {
        this.scheduleRepository = scheduleRepository;
        this.routeRepository = routeRepository;
    }

    public List<Schedule> getAllSchedules() {
        return normalizeComputedDurations(scheduleRepository.findAll());
    }

    public List<Schedule> getSchedulesByRoute(Long routeId) {
        return normalizeComputedDurations(scheduleRepository.findByRouteId(routeId));
    }

    public Schedule createSchedule(ScheduleRequest scheduleRequest) {
        Route route = routeRepository.findById(scheduleRequest.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException("Route not found."));

        Schedule schedule = new Schedule();
        schedule.setRoute(route);
        schedule.setTravelDate(LocalDate.parse(scheduleRequest.getTravelDate()));
        schedule.setDepartureTime(LocalTime.parse(scheduleRequest.getDepartureTime()));
        schedule.setBusNumber(scheduleRequest.getBusNumber());
        schedule.setTotalSeats(scheduleRequest.getTotalSeats());
        schedule.setBusType(normalizeBusType(scheduleRequest.getBusType()));
        schedule.setAcType(scheduleRequest.getAcType() != null ? scheduleRequest.getAcType() : "Non-A/C"); 
        schedule.setPrice(scheduleRequest.getPrice() != null ? scheduleRequest.getPrice() : 0);            

        applyScheduleDetails(schedule, route, scheduleRequest);
        return scheduleRepository.save(schedule);
    }

    public Schedule updateSchedule(Long id, ScheduleRequest scheduleRequest) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found."));

        Route route = routeRepository.findById(scheduleRequest.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException("Route not found."));

        schedule.setRoute(route);
        schedule.setTravelDate(LocalDate.parse(scheduleRequest.getTravelDate()));
        schedule.setDepartureTime(LocalTime.parse(scheduleRequest.getDepartureTime()));
        schedule.setBusNumber(scheduleRequest.getBusNumber());
        schedule.setTotalSeats(scheduleRequest.getTotalSeats());
        schedule.setAcType(scheduleRequest.getAcType() != null ? scheduleRequest.getAcType() : "Non-A/C"); 
        schedule.setPrice(scheduleRequest.getPrice() != null ? scheduleRequest.getPrice() : 0);            

        applyScheduleDetails(schedule, route, scheduleRequest);
        return scheduleRepository.save(schedule);
    }

    public void deleteSchedule(Long id) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found."));
        scheduleRepository.delete(schedule);
    }

    private void applyScheduleDetails(Schedule schedule, Route route, ScheduleRequest request) {
        LocalTime departureTime = LocalTime.parse(request.getDepartureTime());
        LocalTime arrivalTime = LocalTime.parse(request.getArrivalTime());

        schedule.setRoute(route);
        schedule.setTravelDate(LocalDate.parse(request.getTravelDate()));
        schedule.setDepartureTime(departureTime);
        schedule.setArrivalTime(arrivalTime);
        schedule.setDuration(formatDuration(departureTime, arrivalTime));
        schedule.setBusNumber(request.getBusNumber().trim());
        schedule.setTotalSeats(request.getTotalSeats());
        schedule.setBusType(normalizeBusType(request.getBusType()));
        schedule.setAcType(request.getAcType() != null ? request.getAcType() : "Non-A/C");
        schedule.setPrice(request.getPrice() != null ? request.getPrice() : 0);
        schedule.setBoardingStops(sanitizeStops(request.getBoardingStops(), route.getBoardingPoints(), "boarding"));
        schedule.setDroppingStops(sanitizeStops(request.getDroppingStops(), route.getDroppingPoints(), "dropping"));
    }

    private List<ScheduleStop> sanitizeStops(List<ScheduleStop> requestedStops, List<String> allowedPoints, String label) {
        List<String> normalizedAllowedPoints = normalizeAllowedPoints(allowedPoints);
        if (normalizedAllowedPoints.isEmpty()) {
            throw new IllegalArgumentException("Please add " + label + " points to the route before creating a schedule.");
        }

        if (requestedStops == null || requestedStops.isEmpty()) {
            throw new IllegalArgumentException("Please select at least one " + label + " point for this schedule.");
        }

        Map<String, String> normalizedPointLookup = new LinkedHashMap<>();
        normalizedAllowedPoints.forEach(point -> normalizedPointLookup.put(point.toLowerCase(Locale.ROOT), point));

        Map<String, ScheduleStop> sanitizedStops = new LinkedHashMap<>();
        for (ScheduleStop stop : requestedStops) {
            if (stop == null || stop.getPoint() == null || stop.getPoint().isBlank()) {
                throw new IllegalArgumentException("Each " + label + " point must have a valid name.");
            }

            if (stop.getTime() == null || stop.getTime().isBlank()) {
                throw new IllegalArgumentException("Each " + label + " point must have a time.");
            }

            String requestedPoint = stop.getPoint().trim();
            String matchedPoint = normalizedPointLookup.get(requestedPoint.toLowerCase(Locale.ROOT));
            if (matchedPoint == null) {
                throw new IllegalArgumentException("Invalid " + label + " point selected: " + requestedPoint);
            }

            String normalizedTime = LocalTime.parse(stop.getTime().trim()).toString();
            sanitizedStops.put(matchedPoint.toLowerCase(Locale.ROOT), new ScheduleStop(matchedPoint, normalizedTime));
        }

        return new ArrayList<>(sanitizedStops.values());
    }

    private List<String> normalizeAllowedPoints(List<String> points) {
        if (points == null) {
            return List.of();
        }

        return points.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(point -> !point.isBlank())
                .distinct()
                .toList();
    }

    private List<Schedule> normalizeComputedDurations(List<Schedule> schedules) {
        List<Schedule> updatedSchedules = new ArrayList<>();

        for (Schedule schedule : schedules) {
            if (schedule == null) {
                continue;
            }

            boolean updated = false;

            if (schedule.getDepartureTime() != null && schedule.getArrivalTime() != null) {
                String computedDuration = formatDuration(schedule.getDepartureTime(), schedule.getArrivalTime());
                if (!computedDuration.equals(schedule.getDuration())) {
                    schedule.setDuration(computedDuration);
                    updated = true;
                }
            }

            String normalizedBusType = normalizeBusType(schedule.getBusType());
            if (!normalizedBusType.equals(schedule.getBusType())) {
                schedule.setBusType(normalizedBusType);
                updated = true;
            }

            if (updated) {
                updatedSchedules.add(schedule);
            }
        }

        if (!updatedSchedules.isEmpty()) {
            scheduleRepository.saveAll(updatedSchedules);
        }

        return schedules;
    }

    private String normalizeBusType(String busType) {
        if (busType == null || busType.isBlank()) {
            return "Seater";
        }

        return "sleeper".equals(busType.trim().toLowerCase(Locale.ROOT)) ? "Sleeper" : "Seater";
    }

    private String formatDuration(LocalTime departureTime, LocalTime arrivalTime) {
        if (departureTime == null || arrivalTime == null) {
            return "";
        }

        long minutes = Duration.between(departureTime, arrivalTime).toMinutes();
        if (minutes < 0) {
            minutes += 24 * 60;
        }

        long hoursPart = minutes / 60;
        long minutesPart = minutes % 60;

        if (minutesPart == 0) {
            return hoursPart + "h";
        }

        if (hoursPart == 0) {
            return minutesPart + "m";
        }

        return hoursPart + "h " + minutesPart + "m";
    }
}
