package com.busbooking.backend.service;

import com.busbooking.backend.entity.User;
import com.busbooking.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final Map<String, ResetState> resetStates = new ConcurrentHashMap<>();

    public PasswordResetService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String createCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        findUserByEmail(normalizedEmail);

        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
        resetStates.put(normalizedEmail, new ResetState(code, false));
        return code;
    }

    public void verifyCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        ResetState resetState = resetStates.get(normalizedEmail);

        if (resetState == null || resetState.isExpired()) {
            resetStates.remove(normalizedEmail);
            throw new RuntimeException("Verification code has expired or does not exist. Please request a new code.");
        }

        if (!resetState.code.equals(code == null ? "" : code.trim())) {
            throw new RuntimeException("Invalid verification code.");
        }

        resetStates.put(normalizedEmail, new ResetState(resetState.code, true));
    }

    public void resetPassword(String email, String newPassword) {
        String normalizedEmail = normalizeEmail(email);
        ResetState resetState = resetStates.get(normalizedEmail);

        if (resetState == null || !resetState.verified) {
            throw new RuntimeException("Please verify the reset code first.");
        }

        if (resetState.isExpired()) {
            resetStates.remove(normalizedEmail);
            throw new RuntimeException("Reset session has expired. Please request a new verification code.");
        }

        User user = findUserByEmail(normalizedEmail);
        String currentPassword = user.getPassword();

        if (currentPassword != null && currentPassword.equals(newPassword)) {
            throw new RuntimeException("New password cannot be the same as your current password. Please choose a different password.");
        }

        java.util.List<String> history = user.getPreviousPasswordList();
        if (history != null && history.contains(newPassword)) {
            throw new RuntimeException("New password cannot be a previously used password. Please choose a different password.");
        }

        user.addPreviousPassword(currentPassword);
        user.setPassword(newPassword);
        userRepository.save(user);
        resetStates.remove(normalizedEmail);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found for this email."));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required.");
        }

        return email.trim().toLowerCase();
    }

    private static class ResetState {
        private final String code;
        private final boolean verified;
        private final long createdAt;

        private ResetState(String code, boolean verified) {
            this.code = code;
            this.verified = verified;
            this.createdAt = System.currentTimeMillis();
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - createdAt > 600_000L; // 10 minutes
        }
    }
}
