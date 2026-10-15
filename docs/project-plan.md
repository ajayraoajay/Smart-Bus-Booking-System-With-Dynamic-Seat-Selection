# Bus Seat Booking Application

## Purpose
This system allows passengers to view available seats, select seats, and book bus tickets easily.
It also helps bus company staff manage bus schedules and bookings.

## Main Users
- Passengers
- Bus company staff (Admin)

## Main Features
- View bus routes
- View available travel dates and times
- View seat layout
- Select seat
- Enter passenger details
- Confirm booking
- Generate booking ID
- Admin can add schedules
- Admin can view all bookings
- Admin can reserve or cancel seats

## Technology Stack
- Frontend: React
- Backend: Spring Boot
- Database: MySQL
- Version Control: GitHub

## 10 Day Plan
Day 1 - Project setup, folder structure, GitHub setup
Day 2 - Database design and backend project creation
Day 3 - Backend entities, repositories, and database connection
Day 4 - Backend APIs for routes, schedules, bookings
Day 5 - React frontend setup and pages
Day 6 - Route and schedule UI with API integration
Day 7 - Seat layout and booking form
Day 8 - Booking confirmation and validation
Day 9 - Admin pages
Day 10 - UI improvement, testing, screenshots, README update

## Database Design

### Table 1: routes
- id
- from_city
- to_city

### Table 2: schedules
- id
- route_id
- travel_date
- departure_time
- bus_number
- total_seats

### Table 3: bookings
- id
- booking_id
- passenger_name
- phone_number
- schedule_id
- seat_number
- status

## Table Relationships
- One route can have many schedules
- One schedule can have many bookings

## Main Pages
- Home page
- Schedule page
- Seat booking page
- Booking success page
- Admin page

## Backend Setup
- Spring Boot project created
- Dependencies added:
  - Spring Web
  - Spring Data JPA
  - MySQL Driver
  - Lombok
  - Validation
- Connected backend to MySQL database
- Backend test controller created

## API Building
- Created RouteService, ScheduleService, BookingService
- Added BookingRequest DTO
- Built APIs:
  - GET /api/routes
  - GET /api/schedules
  - GET /api/schedules/route/{routeId}
  - GET /api/bookings/schedule/{scheduleId}
  - POST /api/bookings
- Added seat duplicate checking
- Added booking ID generation

## Improved booking APIs
- Improved booking API responses
- Added BookingResponse and ApiResponse DTOs
- Added custom exceptions
- Added global exception handling
- Added booked seats API
- Added cancel booking API
- Added CORS for frontend connection

## Creating frontend
- Created React frontend using Vite
- Installed axios and react-router-dom
- Created frontend folder structure
- Added api service file
- Created HomePage
- Connected frontend to backend route API
- Displayed route list on UI

## Schedule page
- Added schedule page
- Added route-based navigation from home page
- Used routeId from URL
- Connected schedule page to backend API
- Displayed schedules for selected route

## Seat booking page
- Added seat booking page
- Added navigation from schedule page to seat page
- Loaded booked seat numbers from backend
- Displayed seat layout
- Added seat colors:
  - Green = available
  - Red = booked
  - Blue = selected
- Added selected seat display

## Passenger form
- Added passenger form to seat booking page
- Added passenger name and phone number inputs
- Connected booking form to backend POST /api/bookings API
- Added basic form validation
- Displayed booking success message and booking ID
- Refreshed booked seats after successful booking

### Booking Success Page
- Created separate booking success page
- Passed booking details through navigation state
- Displayed booking confirmation details clearly

### Admin Bookings Management
- Added backend API to get all bookings
- Created admin bookings page
- Displayed all bookings in table format
- Added cancel booking action
- Refreshed booking list after cancellation

## Improved general UI
- Added backend API to create schedules
- Created ScheduleRequest DTO
- Added admin schedule creation page
- Added route selection dropdown for admin
- Added travel date, departure time, bus number, and total seats form
- Added success and error messages
- Improved general UI polish
