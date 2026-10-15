package com.busbooking.backend;

import com.busbooking.backend.entity.User;
import com.busbooking.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminDataInitializer {

    private static final String ADMIN_NAME = "BusGo Admin";
    private static final String ADMIN_EMAIL = "admin@gmail.com";
    private static final String ADMIN_PASSWORD = "Admin@123";

    @Bean
    CommandLineRunner seedAdminUser(UserRepository userRepository) {
        return args -> {
            if (userRepository.existsByEmail(ADMIN_EMAIL)) {
                return;
            }

            User admin = new User();
            admin.setName(ADMIN_NAME);
            admin.setEmail(ADMIN_EMAIL);
            admin.setPassword(ADMIN_PASSWORD);
            admin.setRole("ADMIN");

            userRepository.save(admin);
        };
    }
}
