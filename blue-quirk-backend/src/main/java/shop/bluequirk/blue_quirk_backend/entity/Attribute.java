package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.*;
import shop.bluequirk.blue_quirk_backend.domain.AttributeType;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "attributes")
public class Attribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Example types: COLOR, RANGE, TEXT
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AttributeType type;

    // One attribute can have many values
    @OneToMany(mappedBy = "attribute", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<AttributeValue> values = new ArrayList<>();

    // Constructors
    public Attribute() {}

    public Attribute(String name, AttributeType type) {
        this.name = name;
        this.type = type;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AttributeType getType() { return type; }
    public void setType(AttributeType type) { this.type = type; }

    public List<AttributeValue> getValues() { return values; }
    public void setValues(List<AttributeValue> values) {
        this.values.clear();
        if (values != null) {
            values.forEach(v -> v.setAttribute(this));
            this.values.addAll(values);
        }
    }
}
