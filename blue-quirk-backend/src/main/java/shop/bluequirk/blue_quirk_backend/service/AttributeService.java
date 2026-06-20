package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.stereotype.Service;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;
import shop.bluequirk.blue_quirk_backend.repository.AttributeRepository;

import java.util.List;
import java.util.Optional;

@Service
public class AttributeService {

    private final AttributeRepository attributeRepository;

    public AttributeService(AttributeRepository attributeRepository) {
        this.attributeRepository = attributeRepository;
    }

    public List<Attribute> getAll() {
        return attributeRepository.findAllWithValues();
    }

    public Optional<Attribute> getById(Long id) {
        return attributeRepository.findById(id);
    }

    public Attribute create(Attribute attribute) {
        return attributeRepository.save(attribute);
    }
    
    public Attribute updateAttribute(Long id, Attribute updated) {
        return attributeRepository.findById(id).map(attr -> {
            attr.setName(updated.getName());
            attr.setType(updated.getType());
            attr.setValues(updated.getValues()); // replaces old values
            return attributeRepository.save(attr);
        }).orElseThrow(() -> new RuntimeException("Attribute not found"));
    }

    public void delete(Long id) {
        attributeRepository.deleteById(id);
    }
}
