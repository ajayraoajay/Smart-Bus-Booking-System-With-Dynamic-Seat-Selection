package com.busbooking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class SeatHoldResponse {
    private String message;
    private List<Integer> seatNumbers;
    private String expiresAt;
    private long holdDurationMinutes;
}
