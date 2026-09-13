package shop.bluequirk.blue_quirk_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.CityRequest;
import shop.bluequirk.blue_quirk_backend.dto.CityResponse;
import shop.bluequirk.blue_quirk_backend.dto.PublicCityResponse;
import shop.bluequirk.blue_quirk_backend.entity.City;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.CityRepository;

/**
 * Manages the deliverable-cities list and resolves a checkout city to its shipping
 * economics. Per-city fees override the flat {@link StoreSettings} values; a city
 * that is missing (or inactive) falls back to the settings default, so behaviour is
 * unchanged until an admin populates the list.
 */
@Service
public class CityService {

    private final CityRepository repository;
    private final StoreSettingsService settingsService;

    public CityService(CityRepository repository, StoreSettingsService settingsService) {
        this.repository = repository;
        this.settingsService = settingsService;
    }

    // ------------------------------------------------------------------ reads

    /** All cities (with internal cost) for the admin table. */
    @Transactional(readOnly = true)
    public List<CityResponse> listAll() {
        return repository.findAllByOrderBySortOrderAscNameAsc().stream().map(CityResponse::from).toList();
    }

    /** Active cities (name + customer fee only) for the storefront selector. */
    @Transactional(readOnly = true)
    public List<PublicCityResponse> listActivePublic() {
        return repository.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(PublicCityResponse::from).toList();
    }

    // -------------------------------------------------------- fee resolution

    /**
     * Customer delivery price for a checkout city: the active city's own fee when it
     * is in the list, otherwise the flat settings fee. Never applies the free-shipping
     * threshold — that is layered on top by {@code PricingService}.
     */
    @Transactional(readOnly = true)
    public double customerShippingFee(String cityName) {
        return activeMatch(cityName)
                .map(City::getShippingFee)
                .orElseGet(() -> settingsService.getOrCreate().getShippingFee());
    }

    /**
     * Internal real logistics cost for a checkout city (profit only): the active
     * city's own cost when listed, otherwise the flat settings cost.
     */
    @Transactional(readOnly = true)
    public double realShippingCost(String cityName) {
        return activeMatch(cityName)
                .map(City::getRealShippingCost)
                .orElseGet(() -> settingsService.getOrCreate().getRealShippingCost());
    }

    private Optional<City> activeMatch(String cityName) {
        if (cityName == null || cityName.isBlank()) return Optional.empty();
        return repository.findFirstByNameIgnoreCase(cityName.trim()).filter(City::isActive);
    }

    // ----------------------------------------------------------------- admin

    @Transactional
    public CityResponse create(CityRequest req) {
        String name = requireName(req.name());
        if (repository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A city named \"" + name + "\" already exists.");
        }
        City c = new City();
        c.setName(name);
        c.setShippingFee(nonNegative(req.shippingFee()));
        c.setRealShippingCost(nonNegative(req.realShippingCost()));
        c.setActive(req.active() == null || req.active());
        c.setSortOrder(req.sortOrder() == null ? 0 : req.sortOrder());
        return CityResponse.from(repository.save(c));
    }

    @Transactional
    public CityResponse update(Long id, CityRequest req) {
        City c = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "City not found"));
        if (req.name() != null && !req.name().isBlank()) {
            String name = req.name().trim();
            repository.findFirstByNameIgnoreCase(name)
                    .filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "A city named \"" + name + "\" already exists.");
                    });
            c.setName(name);
        }
        if (req.shippingFee() != null) c.setShippingFee(nonNegative(req.shippingFee()));
        if (req.realShippingCost() != null) c.setRealShippingCost(nonNegative(req.realShippingCost()));
        if (req.active() != null) c.setActive(req.active());
        if (req.sortOrder() != null) c.setSortOrder(req.sortOrder());
        return CityResponse.from(repository.save(c));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "City not found");
        }
        repository.deleteById(id);
    }

    /**
     * Bulk add/update from a pasted list. Each entry is upserted by name
     * (case-insensitive): an existing city is updated, a new one is created. Blank
     * names are skipped. Returns the number of rows created or updated.
     */
    @Transactional
    public int bulkImport(List<CityRequest> entries) {
        if (entries == null || entries.isEmpty()) return 0;
        int count = 0;
        int nextOrder = repository.findAll().size();
        for (CityRequest req : entries) {
            if (req == null || req.name() == null || req.name().isBlank()) continue;
            String name = req.name().trim();
            City c = repository.findFirstByNameIgnoreCase(name).orElseGet(City::new);
            boolean isNew = c.getId() == null;
            c.setName(name);
            c.setShippingFee(nonNegative(req.shippingFee()));
            c.setRealShippingCost(nonNegative(req.realShippingCost()));
            c.setActive(req.active() == null || req.active());
            if (req.sortOrder() != null) {
                c.setSortOrder(req.sortOrder());
            } else if (isNew) {
                c.setSortOrder(nextOrder++);
            }
            repository.save(c);
            count++;
        }
        return count;
    }

    // --------------------------------------------------------------- helpers

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A city name is required.");
        }
        return name.trim();
    }

    private double nonNegative(Double v) {
        return v == null ? 0.0 : Math.max(0.0, v);
    }
}
