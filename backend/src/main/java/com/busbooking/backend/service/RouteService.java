package com.busbooking.backend.service;

import com.busbooking.backend.entity.Route;
import com.busbooking.backend.exception.ResourceNotFoundException;
import com.busbooking.backend.repository.RouteRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

@Service
public class RouteService {

    private final RouteRepository routeRepository;

    public RouteService(RouteRepository routeRepository) {
        this.routeRepository = routeRepository;
    }

    public List<Route> getAllRoutes() {
        return routeRepository.findAllByOrderByIdDesc();
    }

    public Route addRoute(Route route) {
        route.setBoardingPoints(sanitizePoints(route.getBoardingPoints()));
        route.setDroppingPoints(sanitizePoints(route.getDroppingPoints()));
        return routeRepository.save(route);
    }

    public Route updateRoute(Long id, Route updatedRoute) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found."));
        route.setFromCity(updatedRoute.getFromCity());
        route.setToCity(updatedRoute.getToCity());
        route.setPrice(updatedRoute.getPrice());
        route.setBoardingPoints(sanitizePoints(updatedRoute.getBoardingPoints()));
        route.setDroppingPoints(sanitizePoints(updatedRoute.getDroppingPoints()));
        return routeRepository.save(route);
    }

    public void deleteRoute(Long id) {
        routeRepository.deleteById(id);
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
