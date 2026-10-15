package com.busbooking.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class BookingSchemaCleanup {

    @Bean
    CommandLineRunner removeLegacyBookingPaymentColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            dropColumnIfExists(jdbcTemplate, "bookings", "advance_payment");
            dropColumnIfExists(jdbcTemplate, "bookings", "pay_at_bus");
            dropColumnIfExists(jdbcTemplate, "routes", "duration");
        };
    }

    private void dropColumnIfExists(JdbcTemplate jdbcTemplate, String tableName, String columnName) {
        Integer columnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                        "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class,
                tableName,
                columnName
        );

        if (columnCount != null && columnCount > 0) {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP COLUMN " + columnName);
        }
    }
}
