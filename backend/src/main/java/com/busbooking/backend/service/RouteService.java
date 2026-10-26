package com.busbooking.backend.service;

import com.busbooking.backend.entity.Route;
import com.busbooking.backend.entity.Schedule;
import com.busbooking.backend.exception.ResourceNotFoundException;
import com.busbooking.backend.repository.RouteRepository;
import com.busbooking.backend.repository.ScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

@Service
public class RouteService {

    private final RouteRepository routeRepository;
    private final ScheduleRepository scheduleRepository;

    public RouteService(RouteRepository routeRepository, ScheduleRepository scheduleRepository) {
        this.routeRepository = routeRepository;
        this.scheduleRepository = scheduleRepository;
    }

    public List<Route> getAllRoutes() {
        return routeRepository.findAllActiveRoutes();
    }

    public Route addRoute(Route route) {
        route.setBoardingPoints(sanitizePoints(route.getBoardingPoints()));
        route.setDroppingPoints(sanitizePoints(route.getDroppingPoints()));
        route.setActive(true);
        return routeRepository.save(route);
    }

    @Transactional
    public Route updateRoute(Long id, Route updatedRoute) {
        Route existingRoute = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found."));

        boolean hasSchedules = scheduleRepository.existsByRouteId(id);
        if (!hasSchedules) {
            // No existing schedules depend on this route; safe to update in-place
            existingRoute.setFromCity(updatedRoute.getFromCity());
            existingRoute.setToCity(updatedRoute.getToCity());
            existingRoute.setPrice(updatedRoute.getPrice());
            existingRoute.setBoardingPoints(sanitizePoints(updatedRoute.getBoardingPoints()));
            existingRoute.setDroppingPoints(sanitizePoints(updatedRoute.getDroppingPoints()));
            existingRoute.setActive(true);
            return routeRepository.save(existingRoute);
        } else {
            // Existing schedules depend on this route!
            // Archive the old route version so already scheduled buses are NOT affected:
            existingRoute.setActive(false);
            routeRepository.save(existingRoute);

            // Create a new active route entity with the updated details:
            Route newRoute = new Route();
            newRoute.setFromCity(updatedRoute.getFromCity());
            newRoute.setToCity(updatedRoute.getToCity());
            newRoute.setPrice(updatedRoute.getPrice());
            newRoute.setBoardingPoints(sanitizePoints(updatedRoute.getBoardingPoints()));
            newRoute.setDroppingPoints(sanitizePoints(updatedRoute.getDroppingPoints()));
            newRoute.setActive(true);
            return routeRepository.save(newRoute);
        }
    }

    @Transactional
    public void deleteRoute(Long id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found."));

        boolean hasSchedules = scheduleRepository.existsByRouteId(id);
        if (!hasSchedules) {
            // No schedules depend on this route; safe to delete directly
            routeRepository.delete(route);
        } else {
            // Schedules depend on this route! Soft delete (mark inactive)
            // so already scheduled buses keep their route details completely intact
            route.setActive(false);
            routeRepository.save(route);
        }
    }

    private List<String> sanitizePoints(List<String> points) {
        if (points == null) {
            return new ArrayList<>();
        }

        return points.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(point -> !point.isBlank())
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                        ArrayList::new
                ));
    }
}
