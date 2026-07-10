package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.dto.AdminProductResponse;
import shop.bluequirk.blue_quirk_backend.dto.response.PageResponse;
import shop.bluequirk.blue_quirk_backend.service.ProductService;

/**
 * Admin-only product reads that expose the confidential cost and derived
 * margins. Everything under {@code /api/admin/**} is locked to the {@code admin}
 * authority by SecurityConfig's fail-closed {@code anyRequest()} rule, so cost
 * can never leak to the storefront. Product create/update/delete stay on the
 * existing {@code /api/products} write endpoints (also admin-only).
 */
@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductService productService;

    public AdminProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<AdminProductResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) ProductStatus status) {
        Page<AdminProductResponse> result = productService.getAdminProducts(page, size, status);
        return ResponseEntity.ok(new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminProductResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getAdminProductById(id));
    }
}
