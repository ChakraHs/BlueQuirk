package shop.bluequirk.blue_quirk_backend.promotion.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import shop.bluequirk.blue_quirk_backend.dto.response.PageResponse;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.promotion.domain.DiscountType;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionRequest;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionResponse;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionStatsResponse;
import shop.bluequirk.blue_quirk_backend.promotion.dto.PromotionSummary;
import shop.bluequirk.blue_quirk_backend.promotion.service.PromotionService;

/**
 * Admin promotion management API. Admin-only both via the fail-closed
 * SecurityConfig default and an explicit {@code @PreAuthorize}. Thin by design —
 * all logic lives in {@link PromotionService}.
 */
@RestController
@RequestMapping("/api/promotions")
@PreAuthorize("hasAuthority('admin')")
public class PromotionAdminController {

    private final PromotionService promotionService;
    private final CurrentUserService currentUserService;

    public PromotionAdminController(PromotionService promotionService,
                                    CurrentUserService currentUserService) {
        this.promotionService = promotionService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<PromotionSummary>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) DiscountType type,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Page<PromotionSummary> result =
                promotionService.list(page, size, search, status, type, sortBy, sortDir);

        PageResponse<PromotionSummary> body = new PageResponse<>(
                result.getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());

        // Expose a Content-Range header too, mirroring the orders list, so simple
        // REST data providers can read the total.
        HttpHeaders headers = new HttpHeaders();
        long total = result.getTotalElements();
        headers.add("Content-Range", "promotions 0-" + Math.max(0, total - 1) + "/" + total);
        headers.add("Access-Control-Expose-Headers", "Content-Range");
        return ResponseEntity.ok().headers(headers).body(body);
    }

    @GetMapping("/stats")
    public ResponseEntity<PromotionStatsResponse> stats() {
        return ResponseEntity.ok(promotionService.stats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PromotionResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<PromotionResponse> create(@RequestBody PromotionRequest request) {
        User actor = currentUserService.require();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(promotionService.create(request, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PromotionResponse> update(@PathVariable Long id,
                                                    @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(promotionService.update(id, request, currentUserService.require()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PromotionResponse> setStatus(@PathVariable Long id,
                                                       @RequestBody StatusRequest request) {
        return ResponseEntity.ok(
                promotionService.setActive(id, request.active(), currentUserService.require()));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<PromotionResponse> duplicate(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(promotionService.duplicate(id, currentUserService.require()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        promotionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk/status")
    public ResponseEntity<Void> bulkStatus(@RequestBody BulkStatusRequest request) {
        promotionService.bulkSetActive(request.ids(), request.active(), currentUserService.require());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk/delete")
    public ResponseEntity<Void> bulkDelete(@RequestBody BulkIdsRequest request) {
        promotionService.bulkDelete(request.ids());
        return ResponseEntity.noContent().build();
    }

    public record StatusRequest(boolean active) {}
    public record BulkStatusRequest(List<Long> ids, boolean active) {}
    public record BulkIdsRequest(List<Long> ids) {}
}
