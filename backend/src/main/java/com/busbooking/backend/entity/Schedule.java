package com.busbooking.backend.entity;

import com.busbooking.backend.converter.ScheduleStopListJsonConverter;
import com.busbooking.backend.model.ScheduleStop;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "schedules")
@Data
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "departure_time", nullable = false)
    private LocalTime departureTime;

    @Column(name = "arrival_time")
    private LocalTime arrivalTime;

    @Column(name = "duration")
    private String duration;

    @Column(name = "bus_number", nullable = false)
    private String busNumber;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    
    @Column(name = "ac_type", nullable = false)
    private String acType = "Non-A/C";

    @Column(name = "bus_type")
    private String busType = "Seater";

    
    @Column(name = "price", nullable = false)
    private Integer price = 0;

    @Convert(converter = ScheduleStopListJsonConverter.class)
    @Column(name = "boarding_stops", columnDefinition = "TEXT")
    private List<ScheduleStop> boardingStops = new ArrayList<>();

    @Convert(converter = ScheduleStopListJsonConverter.class)
    @Column(name = "dropping_stops", columnDefinition = "TEXT")
    private List<ScheduleStop> droppingStops = new ArrayList<>();

    @OneToMany(mappedBy = "schedule")
    @JsonIgnore
    private List<Booking> bookings;
}
