package com.busbooking.backend.entity;

import com.busbooking.backend.converter.PassengerDetailListJsonConverter;
import com.busbooking.backend.model.PassengerDetail;
import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings")
@Data
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false, unique = true)
    private String bookingId;

    @Column(name = "passenger_name", nullable = false)
    private String passengerName;

    @Lob
    @Column(name = "passenger_details", columnDefinition = "LONGTEXT")
    @Convert(converter = PassengerDetailListJsonConverter.class)
    private List<PassengerDetail> passengerDetails = new ArrayList<>();

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "email")
    private String email;

    @ManyToOne
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Column(name = "seat_numbers")
    private String seatNumbers;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "total_price", nullable = false)
    private int totalPrice;

    @Column(name = "refund_amount")
    private Integer refundAmount;

    @Column(name = "cancellation_charge")
    private Integer cancellationCharge;

    @Column(name = "cancelled_by")
    private String cancelledBy;

    @Column(name = "boarding_point")
    private String boardingPoint;

    @Column(name = "boarding_time")
    private String boardingTime;

    @Column(name = "dropping_point")
    private String droppingPoint;

    @Column(name = "dropping_time")
    private String droppingTime;

    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private User user;

    public String getUserName() {
        return user != null ? user.getName() : null;
    }

    public String getUserEmail() {
        return user != null ? user.getEmail() : null;
    }
}
