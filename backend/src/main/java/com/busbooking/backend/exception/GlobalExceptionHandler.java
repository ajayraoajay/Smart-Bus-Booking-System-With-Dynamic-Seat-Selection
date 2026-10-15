package com.busbooking.backend.exception;

import com.busbooking.backend.dto.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse> handleNotFound(ResourceNotFoundException ex) {
        return new ResponseEntity<>(new ApiResponse(ex.getMessage()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(SeatAlreadyBookedException.class)
    public ResponseEntity<ApiResponse> handleSeatAlreadyBooked(SeatAlreadyBookedException ex) {
        return new ResponseEntity<>(new ApiResponse(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        return new ResponseEntity<>(
                new ApiResponse(extractDuplicateMessage(ex.getMessage())),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse> handleRuntimeException(RuntimeException ex) {
        return new ResponseEntity<>(new ApiResponse(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldError() != null
                ? ex.getBindingResult().getFieldError().getDefaultMessage()
                : "Validation error";
        return new ResponseEntity<>(new ApiResponse(message), HttpStatus.BAD_REQUEST);
    }

    
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneral(Exception ex) {
        
        Throwable cause = ex;
        while (cause != null) {
            String msg = cause.getMessage();
            if (msg != null && (
                    msg.contains("Duplicate entry") ||
                            msg.contains("unique_phone") ||
                            msg.contains("unique_email") ||
                            msg.contains("constraint")
            )) {
                return new ResponseEntity<>(
                        new ApiResponse(extractDuplicateMessage(msg)),
                        HttpStatus.BAD_REQUEST
                );
            }
            cause = cause.getCause();
        }
        return new ResponseEntity<>(
                new ApiResponse("Something went wrong. Please try again."),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }

    
    private String extractDuplicateMessage(String msg) {
        if (msg == null) return "Duplicate entry — record already exists.";
        String lower = msg.toLowerCase();
        if (lower.contains("unique_phone") || lower.contains("phone")) {
            return "Phone number already registered.";
        }
        if (lower.contains("email")) {
            return "Email already registered.";
        }
        return "Duplicate entry — this record already exists.";
    }
}