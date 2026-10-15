package com.busbooking.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "seat_holds",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_seat_hold_schedule_seat", columnNames = {"schedule_id", "seat_number"})
        }
)
@Data
public class SeatHold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "schedule_id", nullable = false)
    private Schedule schedule;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Column(name = "hold_token", nullable = false)
    private String holdToken;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
