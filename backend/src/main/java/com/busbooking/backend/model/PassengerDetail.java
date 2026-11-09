package com.busbooking.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PassengerDetail {
    private Integer seatNumber;
    private String name;
    private String gender;
    private String status = "BOOKED";
    private Integer refundAmount = 0;
    private Integer cancellationCharge = 0;
    private String cancelledBy;

    public PassengerDetail(Integer seatNumber, String name, String gender) {
        this.seatNumber = seatNumber;
        this.name = name;
        this.gender = gender;
        this.status = "BOOKED";
        this.refundAmount = 0;
        this.cancellationCharge = 0;
        this.cancelledBy = null;
    }

    public String getStatus() {
        return status != null && !status.isBlank() ? status : "BOOKED";
    }

    public Integer getRefundAmount() {
        return refundAmount != null ? refundAmount : 0;
    }

    public Integer getCancellationCharge() {
        return cancellationCharge != null ? cancellationCharge : 0;
    }
}
