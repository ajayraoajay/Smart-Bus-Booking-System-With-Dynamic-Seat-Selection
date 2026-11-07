package com.busbooking.backend.dto;

import com.busbooking.backend.model.PassengerDetail;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private String message;
    private String bookingId;
    private String passengerName;
    private List<PassengerDetail> passengerDetails;
    private String phoneNumber;
    private String email;
    private Integer seatNumber;
    private String status;
    private Long scheduleId;
    private int totalPrice;
    private Integer refundAmount;
    private Integer cancellationCharge;
    private String cancelledBy;
    private String boardingPoint;
    private String boardingTime;
    private String droppingPoint;
    private String droppingTime;
}
