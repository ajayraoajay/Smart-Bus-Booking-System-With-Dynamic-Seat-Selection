package com.busbooking.backend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "password", nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name = "previous_passwords", columnDefinition = "TEXT")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String previousPasswords;

    @Column(name = "role", nullable = false)
    private String role;

    private static final com.fasterxml.jackson.databind.ObjectMapper OBJECT_MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    public java.util.List<String> getPreviousPasswordList() {
        if (previousPasswords == null || previousPasswords.trim().isEmpty()) {
            return new java.util.ArrayList<>();
        }
        String trimmed = previousPasswords.trim();
        if (trimmed.startsWith("[")) {
            try {
                return OBJECT_MAPPER.readValue(trimmed, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<String>>() {});
            } catch (Exception ignored) {
                // fallback to comma delimiter if not valid JSON
            }
        }
        return new java.util.ArrayList<>(java.util.Arrays.asList(trimmed.split(",")));
    }

    public void addPreviousPassword(String oldPassword) {
        if (oldPassword == null || oldPassword.trim().isEmpty()) return;
        java.util.List<String> list = getPreviousPasswordList();
        if (!list.contains(oldPassword)) {
            list.add(oldPassword);
        }
        try {
            this.previousPasswords = OBJECT_MAPPER.writeValueAsString(list);
        } catch (Exception ignored) {
            this.previousPasswords = String.join(",", list);
        }
    }
}
