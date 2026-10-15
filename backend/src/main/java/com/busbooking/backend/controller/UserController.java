package com.busbooking.backend.controller;

import com.busbooking.backend.entity.User;
import com.busbooking.backend.service.PasswordResetService;
import com.busbooking.backend.service.UserService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final PasswordResetService passwordResetService;

    public UserController(UserService userService, PasswordResetService passwordResetService) {
        this.userService = userService;
        this.passwordResetService = passwordResetService;
    }

    
    @PostMapping("/register")
    public User register(@RequestBody User user) {
        return userService.register(user);
    }

    
    @PostMapping("/login")
    public User login(@RequestBody Map<String, String> body) {
        return userService.login(body.get("email"), body.get("password"));
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody Map<String, String> body) {
        String code = passwordResetService.createCode(body.get("email"));
        return Map.of(
                "message", "Verification code generated successfully.",
                "code", code
        );
    }

    @PostMapping("/verify-code")
    public Map<String, String> verifyCode(@RequestBody Map<String, String> body) {
        passwordResetService.verifyCode(body.get("email"), body.get("code"));
        return Map.of("message", "Verification code verified successfully.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@RequestBody Map<String, String> body) {
        passwordResetService.resetPassword(body.get("email"), body.get("newPassword"));
        return Map.of("message", "Password reset successfully.");
    }

    
    @PutMapping("/{id}/profile")
    public User updateProfile(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return userService.updateProfile(
                id,
                body.get("name"),
                body.get("email"),
                body.get("phone")
        );
    }

    
    @PutMapping("/{id}/change-password")
    public Map<String, String> changePassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        userService.changePassword(id, body.get("currentPassword"), body.get("newPassword"));
        return Map.of("message", "Password changed successfully.");
    }
}
