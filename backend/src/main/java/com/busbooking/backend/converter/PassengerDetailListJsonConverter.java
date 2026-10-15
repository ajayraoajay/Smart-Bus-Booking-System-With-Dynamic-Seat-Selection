package com.busbooking.backend.converter;

import com.busbooking.backend.model.PassengerDetail;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

@Converter
public class PassengerDetailListJsonConverter implements AttributeConverter<List<PassengerDetail>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<PassengerDetail> attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to store passenger details.", exception);
        }
    }

    @Override
    public List<PassengerDetail> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return new ArrayList<>();
        }

        try {
            return OBJECT_MAPPER.readValue(dbData, new TypeReference<List<PassengerDetail>>() { });
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to read passenger details.", exception);
        }
    }
}
