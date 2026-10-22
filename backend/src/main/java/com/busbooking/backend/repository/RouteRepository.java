package com.busbooking.backend.repository;

import com.busbooking.backend.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findAllByOrderByIdDesc();
}
