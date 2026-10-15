package com.busbooking.backend.entity;

import com.busbooking.backend.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "routes")
@Data
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_city")
    private String fromCity;

    @Column(name = "to_city")
    private String toCity;

    @Column(name = "price")
    private int price;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "boarding_points", columnDefinition = "TEXT")
    private List<String> boardingPoints = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "dropping_points", columnDefinition = "TEXT")
    private List<String> droppingPoints = new ArrayList<>();

    

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFromCity() { return fromCity; }
    public void setFromCity(String fromCity) { this.fromCity = fromCity; }

    public String getToCity() { return toCity; }
    public void setToCity(String toCity) { this.toCity = toCity; }

    public int getPrice() { return price; }
    public void setPrice(int price) { this.price = price; }

}
