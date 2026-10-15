package com.busbooking.backend.controller;

import com.busbooking.backend.dto.ApiResponse;
import com.busbooking.backend.dto.SeatHoldRequest;
import com.busbooking.backend.dto.SeatHoldResponse;
import com.busbooking.backend.service.SeatHoldService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seat-holds")
public class SeatHoldController {

    private final SeatHoldService seatHoldService;

    public SeatHoldController(SeatHoldService seatHoldService) {
        this.seatHoldService = seatHoldService;
    }

    @PostMapping
    public SeatHoldResponse placeSeatHold(@Valid @RequestBody SeatHoldRequest request) {
        return seatHoldService.placeSeatHold(request);
    }

    @DeleteMapping("/{holdToken}")
    public ApiResponse releaseSeatHold(@PathVariable String holdToken) {
        seatHoldService.releaseSeatHold(holdToken);
        return new ApiResponse("Seat hold released.");
    }
}
