package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.service.AttributeService;

import java.util.List;

@RestController
@RequestMapping("/api/attributes")
public class AttributeController {

    private final AttributeService attributeService;

    public AttributeController(AttributeService attributeService) {
        this.attributeService = attributeService;
    }
    
    
    @GetMapping
    public ResponseEntity<List<Attribute>> getAllAttributes() {
        List<Attribute> attributes = attributeService.getAll();
        int total = attributes.size();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range", "attributes 0-" + (total - 1) + "/" + total);
        headers.add("Access-Control-Expose-Headers", "Content-Range");

        return ResponseEntity.ok().headers(headers).body(attributes);
    }
    

    @GetMapping("/{id}")
    public ResponseEntity<Attribute> getById(@PathVariable Long id) {
        return attributeService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Attribute create(@RequestBody Attribute attribute) {
        return attributeService.create(attribute);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Attribute> update(@PathVariable Long id, @RequestBody Attribute attribute) {
        try {
            return ResponseEntity.ok(attributeService.updateAttribute(id, attribute));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        attributeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
