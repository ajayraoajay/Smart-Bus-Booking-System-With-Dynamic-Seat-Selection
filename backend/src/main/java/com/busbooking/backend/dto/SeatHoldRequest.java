package com.busbooking.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class SeatHoldRequest {

    @NotNull(message = "Schedule ID is required")
    private Long scheduleId;

    @NotBlank(message = "Seat hold token is required")
    private String holdToken;

    @NotEmpty(message = "Please select at least one seat.")
    private List<Integer> seatNumbers;
}
