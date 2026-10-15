package com.busbooking.backend.dto;

import com.busbooking.backend.model.PassengerDetail;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BookingRequest {

    @NotBlank(message = "Passenger name is required")
    private String passengerName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotNull(message = "Schedule ID is required")
    private Long scheduleId;

    @NotNull(message = "Seat number is required")
    private Integer seatNumber;

    private List<Integer> seatNumbers;
    private List<PassengerDetail> passengerDetails;

    @NotBlank(message = "Boarding point is required")
    private String boardingPoint;

    @NotBlank(message = "Dropping point is required")
    private String droppingPoint;

    private int totalPrice;
    private Long userId;
    private String holdToken;
}
