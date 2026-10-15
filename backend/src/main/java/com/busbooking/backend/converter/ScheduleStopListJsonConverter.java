package com.busbooking.backend.converter;

import com.busbooking.backend.model.ScheduleStop;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

@Converter
public class ScheduleStopListJsonConverter implements AttributeConverter<List<ScheduleStop>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<ScheduleStop> attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to store schedule stops.", exception);
        }
    }

    @Override
    public List<ScheduleStop> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return new ArrayList<>();
        }

        try {
            return OBJECT_MAPPER.readValue(dbData, new TypeReference<List<ScheduleStop>>() { });
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to read schedule stops.", exception);
        }
    }
}
