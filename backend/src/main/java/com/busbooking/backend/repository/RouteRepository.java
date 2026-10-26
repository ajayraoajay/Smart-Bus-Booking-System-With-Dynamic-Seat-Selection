package com.busbooking.backend.repository;

import com.busbooking.backend.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RouteRepository extends JpaRepository<Route, Long> {
    @Query("SELECT r FROM Route r WHERE r.active IS NULL OR r.active = true ORDER BY r.id DESC")
    List<Route> findAllActiveRoutes();

    List<Route> findAllByOrderByIdDesc();
}
