package com.busbooking.backend.dto;

import com.busbooking.backend.model.ScheduleStop;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ScheduleRequest {

    @NotNull(message = "Route ID is required")
    private Long routeId;

    @NotBlank(message = "Travel date is required")
    private String travelDate;

    @NotBlank(message = "Departure time is required")
    private String departureTime;

    private Integer arrivalDay = 1;

    @NotBlank(message = "Arrival time is required")
    private String arrivalTime;

    @NotBlank(message = "Bus number is required")
    private String busNumber;

    @NotNull(message = "Total seats is required")
    private Integer totalSeats;

    
    private String acType;

    private String busType;

    
    private Integer price;

    private List<ScheduleStop> boardingStops;
    private List<ScheduleStop> droppingStops;

    public Integer getArrivalDay() {
        return (arrivalDay != null && arrivalDay >= 1) ? arrivalDay : 1;
    }

    public void setArrivalDay(Integer arrivalDay) {
        this.arrivalDay = (arrivalDay != null && arrivalDay >= 1) ? arrivalDay : 1;
    }
}
