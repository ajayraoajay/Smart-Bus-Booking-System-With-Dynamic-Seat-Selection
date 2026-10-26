package com.busbooking.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

@Configuration
public class BookingSchemaCleanup {

    @Bean
    CommandLineRunner removeLegacyBookingPaymentColumns(JdbcTemplate jdbcTemplate) {
        return args -> {
            dropColumnIfExists(jdbcTemplate, "bookings", "advance_payment");
            dropColumnIfExists(jdbcTemplate, "bookings", "pay_at_bus");
            dropColumnIfExists(jdbcTemplate, "routes", "duration");
            ensureActiveColumnInRoutes(jdbcTemplate);
            ensureScheduleIdColumnInSchedules(jdbcTemplate);
        };
    }

    private void ensureScheduleIdColumnInSchedules(JdbcTemplate jdbcTemplate) {
        try {
            Integer columnCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns " +
                            "WHERE table_schema = DATABASE() AND table_name = 'schedules' AND column_name = 'schedule_id'",
                    Integer.class
            );

            if (columnCount == null || columnCount == 0) {
                jdbcTemplate.execute("ALTER TABLE schedules ADD COLUMN schedule_id VARCHAR(50)");
            }

            List<Long> idsWithoutScheduleId = jdbcTemplate.queryForList(
                    "SELECT id FROM schedules WHERE schedule_id IS NULL OR schedule_id = ''",
                    Long.class
            );
            for (Long id : idsWithoutScheduleId) {
                String scheduleId = "SCH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                jdbcTemplate.update("UPDATE schedules SET schedule_id = ? WHERE id = ?", scheduleId, id);
            }

            Integer indexCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.statistics " +
                            "WHERE table_schema = DATABASE() AND table_name = 'schedules' AND column_name = 'schedule_id'",
                    Integer.class
            );
            if (indexCount == null || indexCount == 0) {
                try {
                    jdbcTemplate.execute("ALTER TABLE schedules ADD UNIQUE (schedule_id)");
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void ensureActiveColumnInRoutes(JdbcTemplate jdbcTemplate) {
        try {
            Integer columnCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns " +
                            "WHERE table_schema = DATABASE() AND table_name = 'routes' AND column_name = 'active'",
                    Integer.class
            );

            if (columnCount == null || columnCount == 0) {
                jdbcTemplate.execute("ALTER TABLE routes ADD COLUMN active BOOLEAN DEFAULT TRUE");
            }
            jdbcTemplate.execute("UPDATE routes SET active = TRUE WHERE active IS NULL");
        } catch (Exception ignored) {
        }
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
