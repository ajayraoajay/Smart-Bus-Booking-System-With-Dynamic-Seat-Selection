package com.busbooking.backend.controller;

import com.busbooking.backend.dto.ScheduleRequest;
import com.busbooking.backend.entity.Schedule;
import com.busbooking.backend.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @GetMapping
    public List<Schedule> getAllSchedules() {
        return scheduleService.getAllSchedules();
    }

    @GetMapping("/route/{routeId}")
    public List<Schedule> getSchedulesByRoute(@PathVariable Long routeId) {
        return scheduleService.getSchedulesByRoute(routeId);
    }

    @PostMapping
    public Schedule createSchedule(@Valid @RequestBody ScheduleRequest scheduleRequest) {
        return scheduleService.createSchedule(scheduleRequest);
    }

    @PutMapping("/{id}")
    public Schedule updateSchedule(@PathVariable Long id, @Valid @RequestBody ScheduleRequest scheduleRequest) {
        return scheduleService.updateSchedule(id, scheduleRequest);
    }

    @DeleteMapping("/{id}")
    public void deleteSchedule(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
    }
}
