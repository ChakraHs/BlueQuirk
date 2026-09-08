package shop.bluequirk.blue_quirk_backend.bundle.service;

import java.util.HashSet;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleRequest;
import shop.bluequirk.blue_quirk_backend.bundle.dto.BundleResponse;
import shop.bluequirk.blue_quirk_backend.bundle.entity.BundleOffer;
import shop.bluequirk.blue_quirk_backend.bundle.mapper.BundleMapper;
import shop.bluequirk.blue_quirk_backend.bundle.repository.BundleOfferRepository;
import shop.bluequirk.blue_quirk_backend.bundle.validator.BundleRequestValidator;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * Admin management of bundle offers (CRUD + enable/disable). Mirrors the promotion
 * module's service style. All writes flow through the {@link BundleRequestValidator}
 * so an incoherent offer can never be persisted.
 */
@Service
public class BundleOfferService {

    private final BundleOfferRepository repository;
    private final BundleRequestValidator validator;
    private final BundleMapper mapper;
    private final StoreSettingsService storeSettingsService;

    public BundleOfferService(BundleOfferRepository repository,
                              BundleRequestValidator validator,
                              BundleMapper mapper,
                              StoreSettingsService storeSettingsService) {
        this.repository = repository;
        this.validator = validator;
        this.mapper = mapper;
        this.storeSettingsService = storeSettingsService;
    }

    @Transactional(readOnly = true)
    public List<BundleResponse> list() {
        String currency = currency();
        return repository.findAll().stream()
                .map(o -> mapper.toResponse(o, currency))
                .toList();
    }

    @Transactional(readOnly = true)
    public BundleResponse getById(Long id) {
        return mapper.toResponse(find(id), currency());
    }

    @Transactional
    public BundleResponse create(BundleRequest req, User actor) {
        validator.validate(req);
        BundleOffer offer = new BundleOffer();
        apply(offer, req);
        offer.setCreatedByEmail(actor != null ? actor.getEmail() : null);
        offer.setUpdatedByEmail(actor != null ? actor.getEmail() : null);
        return mapper.toResponse(repository.save(offer), currency());
    }

    @Transactional
    public BundleResponse update(Long id, BundleRequest req, User actor) {
        validator.validate(req);
        BundleOffer offer = find(id);
        apply(offer, req);
        offer.setUpdatedByEmail(actor != null ? actor.getEmail() : null);
        return mapper.toResponse(repository.save(offer), currency());
    }

    @Transactional
    public BundleResponse setActive(Long id, boolean active, User actor) {
        BundleOffer offer = find(id);
        offer.setActive(active);
        offer.setUpdatedByEmail(actor != null ? actor.getEmail() : null);
        return mapper.toResponse(repository.save(offer), currency());
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bundle offer not found");
        }
        repository.deleteById(id);
    }

    /** Copies a validated request onto the entity, applying entity defaults for omitted flags. */
    private void apply(BundleOffer o, BundleRequest req) {
        o.setName(req.name().trim());
        o.setDescription(req.description() != null ? req.description().trim() : null);
        if (req.active() != null) o.setActive(req.active());
        o.setMinQuantity(req.minQuantity());
        o.setPricingMethod(req.pricingMethod());
        o.setBundleValue(req.bundleValue());
        o.setEligibility(req.eligibility());
        o.setEligibleCategoryIds(req.eligibleCategoryIds() != null
                ? new HashSet<>(req.eligibleCategoryIds()) : new HashSet<>());
        o.setEligibleProductIds(req.eligibleProductIds() != null
                ? new HashSet<>(req.eligibleProductIds()) : new HashSet<>());
        if (req.allowMixing() != null) o.setAllowMixing(req.allowMixing());
        if (req.allowSameProduct() != null) o.setAllowSameProduct(req.allowSameProduct());
        if (req.displayOnProduct() != null) o.setDisplayOnProduct(req.displayOnProduct());
        if (req.displayInCart() != null) o.setDisplayInCart(req.displayInCart());
        if (req.priority() != null) o.setPriority(req.priority());
    }

    private BundleOffer find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bundle offer not found"));
    }

    private String currency() {
        try {
            return storeSettingsService.getOrCreate().getCurrency();
        } catch (Exception e) {
            return "DH";
        }
    }
}
