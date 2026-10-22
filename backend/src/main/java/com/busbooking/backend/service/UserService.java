package com.busbooking.backend.service;

import com.busbooking.backend.entity.User;
import com.busbooking.backend.exception.ResourceNotFoundException;
import com.busbooking.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    
    public User register(User user) {
        user.setEmail(normalizeEmail(user.getEmail()));
        boolean emailExists = userRepository.existsByEmail(user.getEmail());
        boolean phoneExists = userRepository.existsByPhone(user.getPhone());

        
        if (emailExists && phoneExists) {
            throw new RuntimeException("This user already exists.");
        }
        
        if (emailExists) {
            throw new RuntimeException("Email already registered.");
        }
        
        if (phoneExists) {
            throw new RuntimeException("Phone number already registered.");
        }

        user.setRole("USER");
        
        return userRepository.save(user);
    }

    
    public User login(String email, String password) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));
        
        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("Invalid email or password.");
        }
        return user;
    }

    
    public User updateProfile(Long id, String name, String email, String phone) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        user.setName(name);
        user.setEmail(normalizeEmail(email));
        user.setPhone(phone);
        return userRepository.save(user);
    }

    
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        
        if (!user.getPassword().equals(currentPassword)) {
            if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                throw new RuntimeException("Current password is incorrect. Forgot your password? Log out and reset it using “Forgot Password” on the login page.");
            }
            throw new RuntimeException("Current password is incorrect.");
        }

        if (currentPassword.equals(newPassword)) {
            throw new RuntimeException("New password cannot be the same as your current password. Please choose a different password.");
        }

        java.util.List<String> history = user.getPreviousPasswordList();
        if (history != null && history.contains(newPassword)) {
            throw new RuntimeException("New password cannot be a previously used password. Please choose a different password.");
        }

        user.addPreviousPassword(currentPassword);
        user.setPassword(newPassword);
        userRepository.save(user);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required.");
        }

        return email.trim().toLowerCase();
    }
}
