CREATE DATABASE bus_booking_db;

USE bus_booking_db;

CREATE TABLE routes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL
);

CREATE TABLE schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT NOT NULL,
    travel_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    bus_number VARCHAR(50) NOT NULL,
    total_seats INT NOT NULL,
    FOREIGN KEY (route_id) REFERENCES routes(id)
);

CREATE TABLE bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL UNIQUE,
    passenger_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    schedule_id BIGINT NOT NULL,
    seat_number INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

INSERT INTO routes (from_city, to_city) VALUES
('Colombo', 'Kandy'),
('Galle', 'Matara'),
('Kurunegala', 'Jaffna');

INSERT INTO schedules (route_id, travel_date, departure_time, bus_number, total_seats) VALUES
(1, '2026-03-25', '08:00:00', 'NB-1234', 40),
(1, '2026-03-25', '14:00:00', 'NB-5678', 40),
(2, '2026-03-26', '09:30:00', 'NB-2222', 40),
(3, '2026-03-27', '07:15:00', 'NB-3333', 40);

INSERT INTO bookings (booking_id, passenger_name, phone_number, schedule_id, seat_number, status) VALUES
('BSB1001', 'Lahiru', '0771234567', 1, 5, 'RESERVED'),
('BSB1002', 'Amali', '0719998888', 1, 6, 'RESERVED'),
('BSB1003', 'Kavindu', '0754443322', 1, 7, 'CANCELLED');