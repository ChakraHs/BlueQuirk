package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.dto.ProductDTO;
import shop.bluequirk.blue_quirk_backend.dto.ProductResponse;
import shop.bluequirk.blue_quirk_backend.dto.response.PageResponse;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.service.ProductService;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

//    @PostMapping
//    public Product createProduct(@RequestBody Product product) {
//        return productService.saveProduct(product);
//    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@RequestBody ProductDTO dto) {
        Product saved = productService.createProduct(dto);
        // Return the fully-resolved DTO (built inside a transaction) rather than
        // the raw entity, whose lazy collections fail to serialize after the
        // session closes (open-in-view is off).
        return ResponseEntity.ok(productService.getProductById(saved.getId(), null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable Long id, @RequestBody ProductDTO dto) {
        productService.updateProduct(id, dto);
        return ResponseEntity.ok(productService.getProductById(id, null));
    }
    
    @GetMapping
    public ResponseEntity<PageResponse<ProductResponse>> getAllProducts(
    		@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String lang,
            // Optional status filter. The storefront passes status=PUBLISHED to
            // show only published products; the admin omits it to see all.
            @RequestParam(required = false) ProductStatus status) {
    	Page<ProductResponse> result = productService.getAllProducts(page, size, lang, status);

        PageResponse<ProductResponse> response = new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );

        return ResponseEntity.ok(response);
    }


    /**
     * Storefront "Trending" products, ranked by recent sales → recent views →
     * newest. Public (products are public reads). {@code days} is the recent
     * window; both it and {@code limit} fall back to configured defaults when 0.
     * Declared before {@code /{id}} so the literal path wins over the path var.
     */
    @GetMapping("/trending")
    public ResponseEntity<List<ProductResponse>> getTrendingProducts(
            @RequestParam(defaultValue = "0") int limit,
            @RequestParam(defaultValue = "0") int days,
            @RequestParam(required = false) String lang) {
        return ResponseEntity.ok(productService.getTrendingProducts(limit, days, lang));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(
            @PathVariable Long id,
            @RequestParam(required = false) String lang) {
        ProductResponse response = productService.getProductById(id, lang);
        return ResponseEntity.ok(response);
    }
    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
    }
    
    
    
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ProductResponse>> getByCategory(
            @PathVariable Long categoryId,
            @RequestParam(required = false) String lang,
            @RequestParam(required = false) ProductStatus status) {

        return ResponseEntity.ok(
                productService.getProductsByCategory(categoryId, lang, status)
        );
    }
    
    
    // Add images to a product
    @PostMapping("/{productId}/images")
    public ResponseEntity<Product> addImages(
            @PathVariable Long productId,
            @RequestBody List<Long> imageIds) {

        Product updatedProduct = productService.addImagesToProduct(productId, imageIds);
        return ResponseEntity.ok(updatedProduct);
    }

    // Remove images from a product
    @DeleteMapping("/{productId}/images")
    public ResponseEntity<Product> removeImages(
            @PathVariable Long productId,
            @RequestBody List<Long> imageIds) {

        Product updatedProduct = productService.removeImagesFromProduct(productId, imageIds);
        return ResponseEntity.ok(updatedProduct);
    }
}
