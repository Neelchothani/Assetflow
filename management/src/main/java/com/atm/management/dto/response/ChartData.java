package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChartData {
    private String name;
    private Object value;
    private String color;
    private String label;

    public ChartData(String name, Object value) {
        this.name = name;
        this.value = value;
    }
}
