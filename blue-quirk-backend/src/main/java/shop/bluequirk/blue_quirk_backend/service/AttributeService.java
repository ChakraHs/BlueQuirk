package shop.bluequirk.blue_quirk_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        // Fetch values eagerly so the controller can serialize them with
        // open-in-view disabled.
        return attributeRepository.findByIdWithValues(id);
    }

    public Attribute create(Attribute attribute) {
        return attributeRepository.save(attribute);
    }

    // Transactional so the lazy `values` collection can be initialized and
    // replaced (orphan removal) within an active session — required with
    // open-in-view off.
    @Transactional
    public Attribute updateAttribute(Long id, Attribute updated) {
        return attributeRepository.findByIdWithValues(id).map(attr -> {
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
