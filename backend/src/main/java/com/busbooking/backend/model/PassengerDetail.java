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
}
