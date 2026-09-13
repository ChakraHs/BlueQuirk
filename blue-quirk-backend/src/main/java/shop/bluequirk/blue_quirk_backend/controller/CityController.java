package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.dto.CityRequest;
import shop.bluequirk.blue_quirk_backend.dto.CityResponse;
import shop.bluequirk.blue_quirk_backend.service.CityService;

/**
 * Admin management of deliverable cities and their per-city shipping economics.
 * Admin-only (falls under {@code anyRequest().hasAuthority("admin")} in
 * SecurityConfig). The storefront reads the public, customer-safe list from
 * {@code GET /api/shop/cities} instead.
 */
@RestController
@RequestMapping("/api/cities")
public class CityController {

    private final CityService service;

    public CityController(CityService service) {
        this.service = service;
    }

    @GetMapping
    public List<CityResponse> list() {
        return service.listAll();
    }

    @PostMapping
    public CityResponse create(@RequestBody CityRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public CityResponse update(@PathVariable Long id, @RequestBody CityRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    /** Bulk add/update from a pasted list; upserts by name. Returns how many rows changed. */
    @PostMapping("/bulk")
    public BulkResult bulk(@RequestBody List<CityRequest> entries) {
        return new BulkResult(service.bulkImport(entries));
    }

    public record BulkResult(int imported) {}
}
