package shop.bluequirk.blue_quirk_backend.promotion.service;

import java.security.SecureRandom;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.promotion.domain.CustomerEligibility;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.domain.PromotionScope;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionRequest;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionResponse;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionStatsResponse;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionSummary;
import shop.bluequirk.blue_quirk_backend.promotion.entity.Promotion;
import shop.bluequirk.blue_quirk_backend.promotion.mapper.PromotionMapper;
import shop.bluequirk.blue_quirk_backend.promotion.repository.PromotionRepository;
import shop.bluequirk.blue_quirk_backend.promotion.validator.PromotionRequestValidator;

/**
 * Admin-facing promotion management: CRUD, enable/disable, duplicate, filtered
 * listing and aggregate statistics. All business logic lives here — controllers
 * stay thin and never compute discounts or touch the engine directly for admin
 * operations.
 */
@Service
public class PromotionService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
    private static final int CODE_LENGTH = 8;

    private final PromotionRepository promotionRepository;
    private final PromotionRequestValidator validator;

    public PromotionService(PromotionRepository promotionRepository,
                            PromotionRequestValidator validator) {
        this.promotionRepository = promotionRepository;
        this.validator = validator;
    }

    // --- Reads ---

    @Transactional(readOnly = true)
    public PromotionResponse getById(Long id) {
        return PromotionMapper.toResponse(load(id));
    }

    /**
     * Filtered, sorted, paginated list for the admin table. The lifecycle status
     * is derived (not a column), so status/search filtering runs in memory over
     * the (admin-scale) promotion set; that keeps it a single query.
     */
    @Transactional(readOnly = true)
    public Page<PromotionSummary> list(int page, int size, String search, String status,
                                       DiscountType type, String sortBy, String sortDir) {
        List<Promotion> all = promotionRepository.findAll();

        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String statusFilter = (status == null || status.isBlank()) ? null : status.trim().toUpperCase(Locale.ROOT);

        List<Promotion> filtered = all.stream()
                .filter(p -> q.isEmpty()
                        || (p.getName() != null && p.getName().toLowerCase(Locale.ROOT).contains(q))
                        || (p.getCode() != null && p.getCode().toLowerCase(Locale.ROOT).contains(q)))
                .filter(p -> statusFilter == null || p.getLifecycleStatus().name().equals(statusFilter))
                .filter(p -> type == null || p.getDiscountType() == type)
                .sorted(comparator(sortBy, sortDir))
                .toList();

        int total = filtered.size();
        int safeSize = Math.max(1, size);
        int from = Math.min(page * safeSize, total);
        int to = Math.min(from + safeSize, total);
        List<PromotionSummary> pageContent = filtered.subList(from, to).stream()
                .map(PromotionMapper::toSummary)
                .toList();

        Pageable pageable = PageRequest.of(Math.max(0, page), safeSize);
        return new PageImpl<>(pageContent, pageable, total);
    }

    @Transactional(readOnly = true)
    public PromotionStatsResponse stats() {
        List<Promotion> all = promotionRepository.findAll();

        long totalRedemptions = all.stream().mapToLong(Promotion::getUsageCount).sum();
        double totalDiscount = all.stream().mapToDouble(Promotion::getTotalDiscountGiven).sum();
        double totalRevenue = all.stream().mapToDouble(Promotion::getTotalRevenueGenerated).sum();
        long active = all.stream()
                .filter(p -> p.getLifecycleStatus().name().equals("ACTIVE"))
                .count();
        double avgDiscount = totalRedemptions == 0 ? 0 : round(totalDiscount / totalRedemptions);

        List<PromotionStatsResponse.TopPromotion> top = all.stream()
                .filter(p -> p.getUsageCount() > 0)
                .sorted(Comparator.comparingInt(Promotion::getUsageCount).reversed())
                .limit(5)
                .map(p -> new PromotionStatsResponse.TopPromotion(
                        p.getId(), p.getCode(), p.getName(), p.getUsageCount(),
                        p.getTotalDiscountGiven(), p.getTotalRevenueGenerated()))
                .toList();

        return new PromotionStatsResponse(all.size(), active, totalRedemptions,
                round(totalDiscount), round(totalRevenue), avgDiscount, top);
    }

    // --- Writes ---

    @Transactional
    public PromotionResponse create(PromotionRequest req, User actor) {
        validator.validateForCreate(req);

        Promotion promotion = new Promotion();
        applyRequest(promotion, req, true);
        stampCreated(promotion, actor);
        stampUpdated(promotion, actor);
        return PromotionMapper.toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse update(Long id, PromotionRequest req, User actor) {
        validator.validateForUpdate(req);
        Promotion promotion = load(id);
        applyRequest(promotion, req, false);
        stampUpdated(promotion, actor);
        return PromotionMapper.toResponse(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse setActive(Long id, boolean active, User actor) {
        Promotion promotion = load(id);
        promotion.setActive(active);
        stampUpdated(promotion, actor);
        return PromotionMapper.toResponse(promotionRepository.save(promotion));
    }

    /** Clones a promotion as a disabled draft with a fresh unique code. */
    @Transactional
    public PromotionResponse duplicate(Long id, User actor) {
        Promotion src = load(id);
        Promotion copy = new Promotion();
        copy.setName(src.getName() + " (copy)");
        copy.setDescription(src.getDescription());
        copy.setCode(generateUniqueCode());
        copy.setActive(false); // copies start disabled so they can't accidentally go live
        copy.setDiscountType(src.getDiscountType());
        copy.setDiscountValue(src.getDiscountValue());
        copy.setStartDate(src.getStartDate());
        copy.setEndDate(src.getEndDate());
        copy.setMaxGlobalUsage(src.getMaxGlobalUsage());
        copy.setMaxUsagePerCustomer(src.getMaxUsagePerCustomer());
        copy.setMinOrderAmount(src.getMinOrderAmount());
        copy.setMaxDiscountAmount(src.getMaxDiscountAmount());
        copy.setCustomerEligibility(src.getCustomerEligibility());
        copy.setEligibleCustomerIds(new java.util.HashSet<>(src.getEligibleCustomerIds()));
        copy.setScope(src.getScope());
        copy.setRestrictedCategoryIds(new java.util.HashSet<>(src.getRestrictedCategoryIds()));
        copy.setRestrictedProductIds(new java.util.HashSet<>(src.getRestrictedProductIds()));
        copy.setRestrictedBrandIds(new java.util.HashSet<>(src.getRestrictedBrandIds()));
        copy.setFreeShipping(src.isFreeShipping());
        copy.setBuyXQuantity(src.getBuyXQuantity());
        copy.setGetYQuantity(src.getGetYQuantity());
        stampCreated(copy, actor);
        stampUpdated(copy, actor);
        return PromotionMapper.toResponse(promotionRepository.save(copy));
    }

    @Transactional
    public void delete(Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found");
        }
        promotionRepository.deleteById(id);
    }

    // --- Bulk actions ---

    @Transactional
    public void bulkSetActive(List<Long> ids, boolean active, User actor) {
        if (ids == null) return;
        for (Long id : ids) {
            promotionRepository.findById(id).ifPresent(p -> {
                p.setActive(active);
                stampUpdated(p, actor);
                promotionRepository.save(p);
            });
        }
    }

    @Transactional
    public void bulkDelete(List<Long> ids) {
        if (ids == null) return;
        promotionRepository.deleteAllById(ids);
    }

    // --- Helpers ---

    private void applyRequest(Promotion p, PromotionRequest req, boolean creating) {
        p.setName(req.name().trim());
        p.setDescription(trimToNull(req.description()));

        // Code: explicit (validated unique) or auto-generated on create.
        String requestedCode = trimToNull(req.code());
        if (requestedCode != null) {
            String normalized = requestedCode.toUpperCase(Locale.ROOT);
            boolean codeChanged = p.getCode() == null || !p.getCode().equalsIgnoreCase(normalized);
            if (codeChanged && promotionRepository.existsByCodeIgnoreCase(normalized)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Coupon code '" + normalized + "' is already in use");
            }
            p.setCode(normalized);
        } else if (creating) {
            p.setCode(generateUniqueCode());
        }

        p.setActive(req.active() == null ? (creating || p.isActive()) : req.active());

        p.setDiscountType(req.discountType());
        p.setDiscountValue(req.discountValue());

        p.setStartDate(req.startDate());
        p.setEndDate(req.endDate());

        boolean unlimited = Boolean.TRUE.equals(req.unlimitedUsage());
        p.setMaxGlobalUsage(unlimited ? null : req.maxGlobalUsage());
        p.setMaxUsagePerCustomer(req.maxUsagePerCustomer());

        p.setMinOrderAmount(req.minOrderAmount());
        p.setMaxDiscountAmount(req.maxDiscountAmount());

        p.setCustomerEligibility(req.customerEligibility() == null
                ? CustomerEligibility.ALL_CUSTOMERS : req.customerEligibility());
        p.setEligibleCustomerIds(req.eligibleCustomerIds() == null
                ? new java.util.HashSet<>() : new java.util.HashSet<>(req.eligibleCustomerIds()));

        // Future-ready fields.
        p.setFreeShipping(Boolean.TRUE.equals(req.freeShipping()));
        p.setScope(req.scope() == null ? PromotionScope.ENTIRE_ORDER : req.scope());
        if (req.restrictedCategoryIds() != null) p.setRestrictedCategoryIds(new java.util.HashSet<>(req.restrictedCategoryIds()));
        if (req.restrictedProductIds() != null) p.setRestrictedProductIds(new java.util.HashSet<>(req.restrictedProductIds()));
        if (req.restrictedBrandIds() != null) p.setRestrictedBrandIds(new java.util.HashSet<>(req.restrictedBrandIds()));
    }

    private Promotion load(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found"));
    }

    private void stampCreated(Promotion p, User actor) {
        if (actor != null) {
            p.setCreatedBy(actor.getId());
            p.setCreatedByEmail(actor.getEmail());
        }
    }

    private void stampUpdated(Promotion p, User actor) {
        if (actor != null) {
            p.setUpdatedBy(actor.getId());
            p.setUpdatedByEmail(actor.getEmail());
        }
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            String code = sb.toString();
            if (!promotionRepository.existsByCodeIgnoreCase(code)) {
                return code;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Could not generate a unique coupon code, please try again");
    }

    private Comparator<Promotion> comparator(String sortBy, String sortDir) {
        Comparator<Promotion> cmp = switch (sortBy == null ? "createdAt" : sortBy) {
            case "name" -> Comparator.comparing(p -> safe(p.getName()));
            case "code" -> Comparator.comparing(p -> safe(p.getCode()));
            case "usageCount" -> Comparator.comparingInt(Promotion::getUsageCount);
            case "discountValue" -> Comparator.comparingDouble(Promotion::getDiscountValue);
            case "startDate" -> Comparator.comparing(Promotion::getStartDate,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "endDate" -> Comparator.comparing(Promotion::getEndDate,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            default -> Comparator.comparing(Promotion::getCreatedAt,
                    Comparator.nullsLast(Comparator.naturalOrder()));
        };
        return "asc".equalsIgnoreCase(sortDir) ? cmp : cmp.reversed();
    }

    private String safe(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
