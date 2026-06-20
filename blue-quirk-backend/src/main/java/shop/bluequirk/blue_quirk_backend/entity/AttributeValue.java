package shop.bluequirk.blue_quirk_backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;

@Entity
@Table(name = "attribute_values")
public class AttributeValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String value;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attribute_id")
    @JsonBackReference
    private Attribute attribute;


    // Constructors
    public AttributeValue() {}

    public AttributeValue(String value, Attribute attribute) {
        this.value = value;
        this.attribute = attribute;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public Attribute getAttribute() { return attribute; }
    public void setAttribute(Attribute attribute) { this.attribute = attribute; }
}
