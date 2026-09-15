package shop.bluequirk.blue_quirk_backend.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductViewRow;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsOrderStatsRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsPageViewRepository;

import shop.bluequirk.blue_quirk_backend.dto.AdminProductResponse;
import shop.bluequirk.blue_quirk_backend.dto.AttributeDto;
import shop.bluequirk.blue_quirk_backend.dto.AttributeValueDto;
import shop.bluequirk.blue_quirk_backend.dto.CategoryRef;
import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.dto.ProductDTO;
import shop.bluequirk.blue_quirk_backend.dto.ProductResponse;
import shop.bluequirk.blue_quirk_backend.dto.ProductTranslationDto;
import shop.bluequirk.blue_quirk_backend.dto.ProductVideoResponse;
import shop.bluequirk.blue_quirk_backend.finance.service.FinancialCalculationService;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;
import shop.bluequirk.blue_quirk_backend.entity.AttributeValue;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.ProductVideo;
import shop.bluequirk.blue_quirk_backend.entity.translation.CategoryTranslation;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;
import shop.bluequirk.blue_quirk_backend.repository.AttributeRepository;
import shop.bluequirk.blue_quirk_backend.repository.CategoryRepository;
import shop.bluequirk.blue_quirk_backend.repository.ImageRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

@Service
public class ProductService {

	private final ProductRepository productRepository;
    private final ImageRepository imageRepository;
    private final AttributeRepository attributeRepository;
    private final CategoryRepository categoryRepository;
    private final FinancialCalculationService finance;
    private final AnalyticsOrderStatsRepository orderStatsRepository;
    private final AnalyticsPageViewRepository pageViewRepository;
    private final CampaignPricing campaignPricing;

    // Trending defaults (overridable via application properties). The window is
    // the "recent period" over which sales/views are counted.
    @Value("${trending.window-days:30}")
    private int trendingWindowDays;
    @Value("${trending.limit:8}")
    private int trendingDefaultLimit;

    public ProductService(ProductRepository productRepository, ImageRepository imageRepository,
            AttributeRepository attributeRepository, CategoryRepository categoryRepository,
            FinancialCalculationService finance,
            AnalyticsOrderStatsRepository orderStatsRepository,
            AnalyticsPageViewRepository pageViewRepository,
            CampaignPricing campaignPricing) {
        this.productRepository = productRepository;
        this.imageRepository = imageRepository;
        this.attributeRepository = attributeRepository;
        this.categoryRepository = categoryRepository;
        this.finance = finance;
        this.orderStatsRepository = orderStatsRepository;
        this.pageViewRepository = pageViewRepository;
        this.campaignPricing = campaignPricing;
    }
    
    
    @Transactional
    public Product createProduct(ProductDTO dto) {
        Product product = fromDTO(dto);
        return productRepository.save(product);
    }



    
    
    @Transactional
    public Product updateProduct(Long productId, ProductDTO dto) {
    	Product existing = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

    	
    	existing.setName(dto.getName());
        existing.setPrice(dto.getPrice());
        // Compare-at price: null = leave unchanged; 0/≤0 = clear it; value = set it.
        if (dto.getCompareAtPrice() != null) {
            existing.setCompareAtPrice(sanitizeCompareAt(dto.getCompareAtPrice()));
        }
        // Cost is optional on update: only overwrite when the admin actually sent
        // a value, so a form that omits it never wipes the stored cost.
        if (dto.getCost() != null) {
            existing.setCost(validatedCost(dto.getCost()));
        }
        if (dto.getStockQuantity() != null) {
            existing.setStockQuantity(dto.getStockQuantity());
        }
    	existing.setDescription(dto.getDescription());
        // Only overwrite the material when the admin actually submitted one, so a
        // form that omits it never wipes the stored value.
        if (dto.getMaterial() != null && !dto.getMaterial().isBlank()) {
            existing.setMaterial(dto.getMaterial().trim());
        }
        existing.setStatus(dto.getStatus());
        applyImages(existing, dto.getImages());
        applyVideo(existing, dto.getVideo());
        if (dto.getTranslations() != null) {
            applyTranslations(existing, dto.getTranslations());
        }
        if (dto.getCategoryIds() != null) {
            applyCategories(existing, dto.getCategoryIds());
        }

        existing.setSelectedValues(extractSelectedValues(dto));

        return productRepository.save(existing);
    	
    }
    
    
    /**
     * Lightweight status-only update used by the admin catalog list to flip a
     * product between DRAFT / PUBLISHED / ARCHIVED inline. Unlike
     * {@link #updateProduct}, this touches nothing else — images, variants,
     * translations, video and cost are all left untouched.
     */
    public Product updateStatus(Long productId, ProductStatus status) {
        Product existing = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        existing.setStatus(status);
        return productRepository.save(existing);
    }

    /**
     * Bulk status flip for the admin catalog's multi-select actions. Applies the
     * same status to every listed product in one transaction. Like
     * {@link #updateStatus}, it only touches status — nothing else.
     */
    @Transactional
    public void updateStatuses(List<Long> ids, ProductStatus status) {
        for (Long id : ids) {
            Product existing = productRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Product not found: " + id));
            existing.setStatus(status);
            productRepository.save(existing);
        }
    }

    /** Bulk delete for the admin catalog's multi-select actions. */
    @Transactional
    public void deleteProducts(List<Long> ids) {
        productRepository.deleteAllById(ids);
    }

    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(int page, int size, String lang, ProductStatus status) {
    	Page<Product> products = productRepository.findAllWithRelations(
    			PageRequest.of(page, size), status);

    	List<Attribute> attributes = attributeRepository.findAllWithValues();

    	return products.map(p -> toProductResponse(p, attributes, lang));
    }

    /**
     * Ranks PUBLISHED products for the storefront "Trending" section. The ranking
     * priority is:
     * <ol>
     *   <li>most units sold within the recent window ({@code windowDays});</li>
     *   <li>then most product views within the same window;</li>
     *   <li>then the newest product (creation date, id as a deterministic
     *       tie-break).</li>
     * </ol>
     *
     * <p>Efficient and scalable: sales and views are computed with indexed
     * aggregation queries, so the candidate set is bounded by the products that
     * actually had recent activity — never a full-catalog scan. When recent
     * activity is thin, the list is back-filled with the newest published
     * products so the section is never sparse.
     *
     * @param limit      how many products to return (0 → configured default)
     * @param windowDays recent period in days to count sales/views (0 → default)
     */
    @Transactional(readOnly = true)
    public List<ProductResponse> getTrendingProducts(int limit, int windowDays, String lang) {
        int size = limit > 0 ? limit : trendingDefaultLimit;
        int days = windowDays > 0 ? windowDays : trendingWindowDays;

        LocalDateTime toLocal = LocalDateTime.now();
        LocalDateTime fromLocal = toLocal.minusDays(days);
        Instant toInstant = Instant.now();
        Instant fromInstant = toInstant.minus(Duration.ofDays(days));

        // Units sold per product (cancelled orders excluded) — row is [pid, orders, units].
        Map<Long, Long> salesByProduct = new HashMap<>();
        for (Object[] r : orderStatsRepository.productPurchases(fromLocal, toLocal)) {
            if (r[0] == null) continue;
            salesByProduct.put(((Number) r[0]).longValue(), ((Number) r[2]).longValue());
        }
        // Views per product from product page views.
        Map<Long, Long> viewsByProduct = new HashMap<>();
        for (ProductViewRow v : pageViewRepository.productViews(fromInstant, toInstant)) {
            if (v.productId() != null) viewsByProduct.put(v.productId(), v.views());
        }

        // Candidate set = products with recent sales or views (published only).
        Set<Long> candidateIds = new HashSet<>(salesByProduct.keySet());
        candidateIds.addAll(viewsByProduct.keySet());

        // Newest-first tie-break: newer createdAt wins; nulls (legacy rows) sort
        // last; higher id breaks exact ties.
        Comparator<Product> newestFirst = Comparator
                .comparing((Product p) -> p.getCreatedAt(),
                        Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(Product::getId)
                .reversed();

        List<Product> ranked = new ArrayList<>();
        if (!candidateIds.isEmpty()) {
            ranked = productRepository.findByIdInWithRelations(candidateIds, ProductStatus.PUBLISHED);
            ranked.sort(Comparator
                    .<Product>comparingLong(p -> salesByProduct.getOrDefault(p.getId(), 0L)).reversed()
                    .thenComparing(Comparator.<Product>comparingLong(
                            p -> viewsByProduct.getOrDefault(p.getId(), 0L)).reversed())
                    .thenComparing(newestFirst));
        }

        // Assemble exactly `size` products, de-duplicated, back-filling with the
        // newest published products when recent activity is insufficient.
        LinkedHashMap<Long, Product> selected = new LinkedHashMap<>();
        for (Product p : ranked) {
            if (selected.size() >= size) break;
            selected.put(p.getId(), p);
        }
        if (selected.size() < size) {
            Page<Product> newest = productRepository.findAllWithRelations(
                    PageRequest.of(0, size + selected.size()), ProductStatus.PUBLISHED);
            for (Product p : newest.getContent()) {
                if (selected.size() >= size) break;
                selected.putIfAbsent(p.getId(), p);
            }
        }

        List<Attribute> attributes = attributeRepository.findAllWithValues();
        return selected.values().stream()
                .map(p -> toProductResponse(p, attributes, lang))
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id, String lang) {
        Product product = productRepository.findByIdWithRelations(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));

//        Set<Long> selectedValueIds = product.getSelectedValues().stream()
//            .map(AttributeValue::getId)
//            .collect(Collectors.toSet());
//
//        List<AttributeDto> attributes = attributeRepository.findAll().stream()
//            .map(attr -> {
//                List<AttributeValueDto> values = attr.getValues().stream()
//                    .map(val -> new AttributeValueDto(
//                        val.getId(),
//                        val.getValue(),
//                        selectedValueIds.contains(val.getId())
//                    ))
//                    .collect(Collectors.toList());
//                return new AttributeDto(attr.getId(), attr.getName(), values);
//            })
//            // NOTE: Record accessor is values() and boolean accessor is selected()
//            .filter(attrDto -> attrDto.values().stream().anyMatch(AttributeValueDto::selected))
//            .collect(Collectors.toList());
        
        
        // Fetch all attributes with their values (e.g. Colors, Sizes)
        List<Attribute> allAttributes = attributeRepository.findAllWithValues();

        // Map selected values for quick lookup
        Set<Long> selectedValueIds = product.getSelectedValues()
            .stream()
            .map(AttributeValue::getId)
            .collect(Collectors.toSet());

        // Build grouped attributes
        List<AttributeDto> attributes = allAttributes.stream()
            .map(attr -> new AttributeDto(
                attr.getId(),
                attr.getName(),
                attr.getType() != null ? attr.getType().name() : null,
                attr.getValues().stream()
                    .map(val -> new AttributeValueDto(
                        val.getId(),
                        val.getValue(),
                        selectedValueIds.contains(val.getId()) // mark selected
                    ))
                    .collect(Collectors.toList())
            ))
            .collect(Collectors.toList());

        return new ProductResponse(
            product.getId(),
            resolveName(product, lang),
            campaignPricing.sellingPrice(product.getPrice()),
            displayCompareAt(product),
            product.getStockQuantity(),
            resolveDescription(product, lang),
            product.getMaterial(),
            product.getStatus(),
            sortedImages(product),
            ProductVideoResponse.from(product.getVideo()),
            attributes,
            toCategoryRefs(product, lang),
            toTranslationDtos(product),
            product.getTodifyTemplateId(),
            product.isSyncedFromTodify()
        );
    }



    /**
     * Admin-only paginated product list including the confidential cost and
     * derived margins. Served exclusively from {@code /api/admin/products}.
     */
    @Transactional(readOnly = true)
    public Page<AdminProductResponse> getAdminProducts(int page, int size, ProductStatus status) {
        return getAdminProducts(page, size, status, null, null, null, null);
    }

    /**
     * Server-paged admin catalog with optional name search, category filter and
     * column sort. Pages product ids at the DB level (no fetch joins), then loads
     * the page's relations in one query and maps in the page order — so it scales
     * to a large catalog instead of loading everything into memory.
     */
    @Transactional(readOnly = true)
    public Page<AdminProductResponse> getAdminProducts(int page, int size, ProductStatus status,
                                                       String search, Long categoryId,
                                                       String sortKey, String dir) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size),
                adminSort(sortKey, dir));
        String q = (search == null || search.isBlank()) ? null
                : "%" + search.trim().toLowerCase() + "%";
        Page<Product> pageProducts = productRepository.adminSearch(status, q, categoryId, pageable);

        List<Long> ids = pageProducts.getContent().stream().map(Product::getId).toList();
        if (ids.isEmpty()) {
            return new org.springframework.data.domain.PageImpl<>(
                    List.of(), pageable, pageProducts.getTotalElements());
        }
        // Load relations once, then restore the paged order (the IN query is unordered).
        java.util.Map<Long, Product> byId = productRepository
                .findAllByIdInWithImagesAndCategories(ids).stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));
        List<AdminProductResponse> content = ids.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .map(this::toAdminProductResponse)
                .toList();
        return new org.springframework.data.domain.PageImpl<>(
                content, pageable, pageProducts.getTotalElements());
    }

    /**
     * Whitelisted admin sort. Column-backed keys use a plain property Sort; the
     * derived margin keys use a safe, fixed SQL expression (never client input) via
     * {@code JpaSort.unsafe}. Unknown/blank → newest first (createdAt, id).
     */
    private org.springframework.data.domain.Sort adminSort(String key, String dir) {
        org.springframework.data.domain.Sort.Direction d =
                "asc".equalsIgnoreCase(dir) ? org.springframework.data.domain.Sort.Direction.ASC
                                            : org.springframework.data.domain.Sort.Direction.DESC;
        if (key == null || key.isBlank()) {
            return org.springframework.data.domain.Sort.by(
                    org.springframework.data.domain.Sort.Order.desc("createdAt"),
                    org.springframework.data.domain.Sort.Order.desc("id"));
        }
        return switch (key) {
            case "name" -> org.springframework.data.domain.Sort.by(d, "name");
            case "price" -> org.springframework.data.domain.Sort.by(d, "price");
            case "cost" -> org.springframework.data.domain.Sort.by(d, "cost");
            case "stock" -> org.springframework.data.domain.Sort.by(d, "stockQuantity");
            case "margin" -> org.springframework.data.jpa.domain.JpaSort.unsafe(d, "(price - cost)");
            case "marginPct" -> org.springframework.data.jpa.domain.JpaSort.unsafe(
                    d, "(case when price > 0 then (price - cost) / price else 0 end)");
            default -> org.springframework.data.domain.Sort.by(
                    org.springframework.data.domain.Sort.Order.desc("createdAt"),
                    org.springframework.data.domain.Sort.Order.desc("id"));
        };
    }

    /** Admin-only single product including cost + margins (for the edit form). */
    @Transactional(readOnly = true)
    public AdminProductResponse getAdminProductById(Long id) {
        Product product = productRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return toAdminProductResponse(product);
    }

    private AdminProductResponse toAdminProductResponse(Product product) {
        double price = product.getPrice();
        double cost = product.getCost();
        return new AdminProductResponse(
                product.getId(),
                product.getName(),
                price,
                cost,
                finance.grossMargin(price, cost),
                finance.grossMarginPercent(price, cost),
                product.getStockQuantity(),
                product.getStatus(),
                sortedImages(product),
                toCategoryRefs(product, null)
        );
    }

    /** Default materials value applied to products created without one. */
    private static final String DEFAULT_MATERIAL = "100% Cotton";

    /** Trims the submitted material, falling back to the default when blank. */
    private String normalizedMaterial(String material) {
        return (material == null || material.isBlank()) ? DEFAULT_MATERIAL : material.trim();
    }

    /** Rejects a negative cost (400); otherwise returns the value unchanged. */
    private double validatedCost(double cost) {
        if (cost < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product cost cannot be negative");
        }
        return cost;
    }

    /**
     * The compare-at / previous price for display, scaled by any active campaign
     * like the selling price (so a marketing surcharge moves both together and the
     * discount ratio stays correct), or null when no previous price is set. The
     * frontend still guards on {@code compareAt > price} before crossing it out, so
     * an accidental compare-at ≤ price simply never shows. Never a charged amount.
     */
    private Double displayCompareAt(Product product) {
        Double raw = product.getCompareAtPrice();
        return raw == null ? null : campaignPricing.sellingPrice(raw);
    }

    /** Normalizes a submitted compare-at price: null/≤0 clears it, else round to cents. */
    private static Double sanitizeCompareAt(Double v) {
        if (v == null || v <= 0) return null;
        return Math.round(v * 100.0) / 100.0;
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
    
    
    // Add images to a product
    public Product addImagesToProduct(Long productId, List<Long> imageIds) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Set<Image> imagesToAdd = (Set<Image>) imageRepository.findAllById(imageIds);
        if (product.getImages() != null) {
            product.getImages().addAll(imagesToAdd);
        } else {
            product.setImages(imagesToAdd);
        }

        return productRepository.save(product);
    }

    // Remove images from a product
    public Product removeImagesFromProduct(Long productId, List<Long> imageIds) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (product.getImages() != null) {
            product.getImages().removeIf(img -> imageIds.contains(img.getId()));
        }

        return productRepository.save(product);
    }
    
    
    
    
    
    
    
    
    @Transactional(readOnly = true)
    public List<ProductResponse> getProductsByCategory(Long categoryId, String lang, ProductStatus status) {
        List<Product> products = productRepository.findByCategoryIdWithRelations(categoryId, status);

        List<Attribute> attributes = attributeRepository.findAllWithValues();

        return products.stream()
                .map(p -> toProductResponse(p, attributes, lang))
                .collect(Collectors.toList());
    }

    // Wide window for category relevance / best-selling ranking: effectively
    // all-time, so a category's "best sellers" reflect its whole history rather
    // than a rolling few weeks (unlike the homepage "Trending" section, which is
    // deliberately recent).
    private static final int CATEGORY_RANK_WINDOW_DAYS = 3650;

    /**
     * Server-paged storefront category listing with a chosen ordering:
     * <ul>
     *   <li>{@code relevance} (default) — most units sold → most viewed → newest;</li>
     *   <li>{@code bestselling} — most units sold → newest;</li>
     *   <li>{@code newest} — most recently created.</li>
     * </ul>
     * "newest" pages ids straight at the DB level (cheap LIMIT/OFFSET). The ranked
     * sorts load the category's ids (newest-first) plus the sales/views maps once,
     * STABLE-sort in memory (so equal ranks keep newest-first), then load only the
     * requested page's relations — so a big category never loads everything at once.
     */
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsByCategoryPaged(Long categoryId, String lang,
                                                            ProductStatus status, int page, int size,
                                                            String sort) {
        int pageIdx = Math.max(0, page);
        int pageSize = Math.max(1, size);
        String key = sort == null ? "" : sort.trim().toLowerCase();

        if (key.equals("newest")) {
            Pageable pageable = PageRequest.of(pageIdx, pageSize,
                    org.springframework.data.domain.Sort.by(
                            org.springframework.data.domain.Sort.Order.desc("createdAt"),
                            org.springframework.data.domain.Sort.Order.desc("id")));
            Page<Product> idPage = productRepository.pageByCategory(categoryId, status, pageable);
            List<Long> ids = idPage.getContent().stream().map(Product::getId).toList();
            return mapIdsPage(ids, lang, pageable, idPage.getTotalElements());
        }

        // Ranked sorts (relevance / best-selling): category ids newest-first.
        List<Long> ids = new ArrayList<>(
                productRepository.findCategoryProductIdsRanked(categoryId, status));
        long total = ids.size();
        Pageable pageable = PageRequest.of(pageIdx, pageSize);
        if (ids.isEmpty()) {
            return new org.springframework.data.domain.PageImpl<>(List.of(), pageable, 0);
        }

        // Units sold per product (cancelled orders excluded) — [pid, orders, units].
        LocalDateTime toLocal = LocalDateTime.now();
        LocalDateTime fromLocal = toLocal.minusDays(CATEGORY_RANK_WINDOW_DAYS);
        Map<Long, Long> salesByProduct = new HashMap<>();
        for (Object[] r : orderStatsRepository.productPurchases(fromLocal, toLocal)) {
            if (r[0] == null) continue;
            salesByProduct.put(((Number) r[0]).longValue(), ((Number) r[2]).longValue());
        }

        if (key.equals("bestselling")) {
            // Most sold first; equal ranks keep the newest-first base order.
            ids.sort(Comparator.<Long>comparingLong(
                    id -> salesByProduct.getOrDefault(id, 0L)).reversed());
        } else {
            // Relevance (default): most sold → most viewed → newest.
            Instant toInstant = Instant.now();
            Instant fromInstant = toInstant.minus(Duration.ofDays(CATEGORY_RANK_WINDOW_DAYS));
            Map<Long, Long> viewsByProduct = new HashMap<>();
            for (ProductViewRow v : pageViewRepository.productViews(fromInstant, toInstant)) {
                if (v.productId() != null) viewsByProduct.put(v.productId(), v.views());
            }
            ids.sort(Comparator.<Long>comparingLong(
                            id -> salesByProduct.getOrDefault(id, 0L)).reversed()
                    .thenComparing(Comparator.<Long>comparingLong(
                            id -> viewsByProduct.getOrDefault(id, 0L)).reversed()));
        }

        int from = Math.min(pageIdx * pageSize, ids.size());
        int to = Math.min(from + pageSize, ids.size());
        List<Long> pageIds = ids.subList(from, to);
        return mapIdsPage(pageIds, lang, pageable, total);
    }

    /** Loads relations for a page of ids and maps them to responses in id order. */
    private Page<ProductResponse> mapIdsPage(List<Long> ids, String lang, Pageable pageable, long total) {
        if (ids.isEmpty()) {
            return new org.springframework.data.domain.PageImpl<>(List.of(), pageable, total);
        }
        List<Attribute> attributes = attributeRepository.findAllWithValues();
        Map<Long, Product> byId = productRepository.findAllByIdInWithRelations(ids).stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));
        List<ProductResponse> content = ids.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .map(p -> toProductResponse(p, attributes, lang))
                .toList();
        return new org.springframework.data.domain.PageImpl<>(content, pageable, total);
    }
    
    
    
    public Product fromDTO(ProductDTO dto) {
        Product product = new Product();
        product.setId(dto.getId());
        product.setName(dto.getName());
        product.setPrice(dto.getPrice());
        product.setCompareAtPrice(sanitizeCompareAt(dto.getCompareAtPrice()));
        product.setCost(dto.getCost() != null ? validatedCost(dto.getCost()) : 0);
        product.setStockQuantity(dto.getStockQuantity() != null ? dto.getStockQuantity() : 0);
        product.setDescription(dto.getDescription());
        product.setMaterial(normalizedMaterial(dto.getMaterial()));
        product.setStatus(dto.getStatus());
        applyImages(product, dto.getImages());
        applyVideo(product, dto.getVideo());
        applyTranslations(product, dto.getTranslations());
        if (dto.getCategoryIds() != null) {
            applyCategories(product, dto.getCategoryIds());
        }

        Set<AttributeValue> selectedValues = new HashSet<>();
        if (dto.getAttributes() != null) {
            for (AttributeDto attrDTO : dto.getAttributes()) {
                Attribute attr = attributeRepository.findById(attrDTO.id())
                        .orElseThrow(() -> new RuntimeException("Attribute not found"));

                for (AttributeValueDto valDTO : attrDTO.values()) {
                    if (valDTO.selected()) {
                        AttributeValue value = attr.getValues().stream()
                                .filter(v -> v.getId().equals(valDTO.id()))
                                .findFirst()
                                .orElseThrow(() -> new RuntimeException("Value not found"));
                        selectedValues.add(value);
                    }
                }
            }
        }
        product.setSelectedValues(selectedValues);

        return product;
    }

    
    
    
    private ProductResponse toProductResponse(Product product,List<Attribute> allAttributes, String lang) {

        Set<Long> selectedValueIds = product.getSelectedValues()
                .stream()
                .map(AttributeValue::getId)
                .collect(Collectors.toSet());

        List<AttributeDto> attributes = allAttributes.stream()
        	    .map(attr -> new AttributeDto(
        	        attr.getId(),
        	        attr.getName(),
        	        attr.getType() != null ? attr.getType().name() : null,
        	        attr.getValues().stream()
        	            .map(val -> new AttributeValueDto(
        	                val.getId(),
        	                val.getValue(),
        	                selectedValueIds.contains(val.getId())
        	            ))
        	            .collect(Collectors.toList())
        	    ))
        	    .collect(Collectors.toList());

        return new ProductResponse(
                product.getId(),
                resolveName(product, lang),
                campaignPricing.sellingPrice(product.getPrice()),
                displayCompareAt(product),
                product.getStockQuantity(),
                resolveDescription(product, lang),
                product.getMaterial(),
                product.getStatus(),
                sortedImages(product),
                ProductVideoResponse.from(product.getVideo()),
                attributes,
                toCategoryRefs(product, lang),
                toTranslationDtos(product),
                product.getTodifyTemplateId(),
                product.isSyncedFromTodify()
        );
    }

    /** Raw per-language translations (for the admin edit form), ordered by lang. */
    private List<ProductTranslationDto> toTranslationDtos(Product product) {
        if (product.getTranslations() == null) {
            return List.of();
        }
        return product.getTranslations().stream()
                .map(t -> new ProductTranslationDto(t.getLang(), t.getName(), t.getDescription()))
                .sorted(Comparator.comparing(ProductTranslationDto::lang,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .collect(Collectors.toList());
    }

    /** Locale-resolved category references for the storefront search facets. */
    private List<CategoryRef> toCategoryRefs(Product product, String lang) {
        if (product.getCategories() == null) {
            return List.of();
        }
        return product.getCategories().stream()
                .map(c -> new CategoryRef(c.getId(), resolveCategoryName(c, lang)))
                .sorted(Comparator.comparing(CategoryRef::name, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    private String resolveCategoryName(Category category, String lang) {
        if (lang == null || category.getTranslations() == null) {
            return category.getName();
        }
        return category.getTranslations().stream()
                .filter(t -> lang.equals(t.getLang()))
                .map(CategoryTranslation::getName)
                .findFirst()
                .orElse(category.getName());
    }

    /**
     * Reconciles the product's translations with the incoming set, keyed by
     * language, MUTATING the managed collection in place: existing languages are
     * UPDATED, languages no longer submitted are removed (orphan-deleted), and
     * only genuinely new languages are inserted.
     *
     * <p>We deliberately avoid the old clear()+re-add() approach: with
     * orphanRemoval, Hibernate flushed the INSERT of a replacement row before
     * DELETEing the old one, which violated the {@code (product_id, lang)} unique
     * constraint whenever a product that already had translations was edited.
     * Updating same-language rows in place issues a plain UPDATE, so there is no
     * transient duplicate.
     */
    private void applyTranslations(Product product, Set<ProductTranslation> incoming) {
        if (incoming == null) {
            return; // caller decides when translations should be left untouched
        }

        // Latest submitted value per non-blank language.
        Map<String, ProductTranslation> byLang = new HashMap<>();
        for (ProductTranslation t : incoming) {
            if (t == null || t.getLang() == null || t.getLang().isBlank()) {
                continue;
            }
            byLang.put(t.getLang().trim(), t);
        }

        Set<ProductTranslation> managed = product.getTranslations();

        // Update languages that already exist; drop those no longer submitted.
        managed.removeIf(existing -> {
            ProductTranslation update = byLang.remove(existing.getLang());
            if (update == null) {
                return true; // orphanRemoval deletes this row
            }
            existing.setName(update.getName());
            existing.setDescription(update.getDescription());
            return false;
        });

        // Anything left in byLang is a brand-new language → insert it.
        for (ProductTranslation added : byLang.values()) {
            added.setLang(added.getLang().trim());
            added.setProduct(product);
            managed.add(added);
        }
    }

    /**
     * Replaces the product's category links with exactly the given ids. The
     * many-to-many is owned on the Product side, so mutating the collection here
     * writes the join table on save. Unknown ids are ignored.
     */
    private void applyCategories(Product product, List<Long> categoryIds) {
        Set<Category> resolved = new HashSet<>(categoryRepository.findAllById(categoryIds));
        if (product.getCategories() == null) {
            product.setCategories(new HashSet<>());
        }
        product.getCategories().clear();
        product.getCategories().addAll(resolved);
    }

    private String resolveName(Product product, String lang) {
        if (lang == null) {
            return product.getName();
        }

        return product.getTranslations() == null ? product.getName()
                : product.getTranslations().stream()
                    .filter(t -> t.getLang().equals(lang))
                    .map(ProductTranslation::getName)
                    .findFirst()
                    .orElse(product.getName());
    }

    private String resolveDescription(Product product, String lang) {
        if (lang == null) {
            return product.getDescription();
        }

        return product.getTranslations() == null ? product.getDescription()
                : product.getTranslations().stream()
                    .filter(t -> t.getLang().equals(lang))
                    .map(ProductTranslation::getDescription)
                    .findFirst()
                    .orElse(product.getDescription());
    }
    
    
    /**
     * Persists the product's gallery from the DTO image set, reusing the existing
     * many-to-many relation. The Image rows already exist (uploaded via
     * {@code /api/images}), so we never re-upload — we just (re)link them and
     * write back their {@code primary}/{@code sortOrder} flags. The plain
     * many-to-many would only manage the join table, so the per-image flags must
     * be saved explicitly here. Exactly one image is normalized to primary.
     */
    private void applyImages(Product product, Set<Image> dtoImages) {
        // Initialize the managed collection once so we mutate in place (avoids
        // orphaning/breaking Hibernate's collection tracking on update).
        if (product.getImages() == null) {
            product.setImages(new LinkedHashSet<>());
        }
        Set<Image> managed = product.getImages();
        managed.clear();

        if (dtoImages == null || dtoImages.isEmpty()) {
            return;
        }

        // Order incoming images by the client-supplied sortOrder (nulls last).
        List<Image> incoming = new ArrayList<>(dtoImages);
        incoming.sort(Comparator.comparing(
                img -> img.getSortOrder() == null ? Integer.MAX_VALUE : img.getSortOrder()));

        boolean primaryAssigned = false;
        int order = 0;
        for (Image dtoImage : incoming) {
            // Reuse the already-stored Image row; fall back to the passed object
            // for the (unexpected) case of an image without an id.
            Image image = dtoImage.getId() != null
                    ? imageRepository.findById(dtoImage.getId()).orElse(dtoImage)
                    : dtoImage;

            // Keep url/fileName fresh, then write ordering + primary + color link.
            if (dtoImage.getUrl() != null) image.setUrl(dtoImage.getUrl());
            if (dtoImage.getFileName() != null) image.setFileName(dtoImage.getFileName());
            image.setColorValueId(dtoImage.getColorValueId()); // null = generic
            image.setSortOrder(order++);

            boolean wantsPrimary = dtoImage.isPrimary() && !primaryAssigned;
            image.setPrimary(wantsPrimary);
            if (wantsPrimary) primaryAssigned = true;

            managed.add(imageRepository.save(image));
        }

        // If the client marked none as primary, promote the first image.
        if (!primaryAssigned) {
            managed.stream().findFirst().ifPresent(img -> {
                img.setPrimary(true);
                imageRepository.save(img);
            });
        }
    }

    /**
     * Sets (or clears) the product's featured video from the DTO. A submitted
     * video with a non-blank {@code videoUrl} is stored; a null DTO video or one
     * with a blank url clears any existing video (delete/replace). Trimming keeps
     * the stored URLs clean.
     */
    private void applyVideo(Product product, ProductVideo dtoVideo) {
        if (dtoVideo == null || dtoVideo.getVideoUrl() == null || dtoVideo.getVideoUrl().isBlank()) {
            product.setVideo(null);
            return;
        }
        ProductVideo video = new ProductVideo();
        video.setVideoUrl(dtoVideo.getVideoUrl().trim());
        video.setPosterImageUrl(
                dtoVideo.getPosterImageUrl() != null && !dtoVideo.getPosterImageUrl().isBlank()
                        ? dtoVideo.getPosterImageUrl().trim() : null);
        video.setDuration(dtoVideo.getDuration());
        video.setFileSize(dtoVideo.getFileSize());
        product.setVideo(video);
    }

    /** Gallery ordered primary-first, then by sortOrder — for storefront/cards. */
    private List<Image> sortedImages(Product product) {
        if (product.getImages() == null) {
            return List.of();
        }
        return product.getImages().stream()
                .sorted(Comparator.comparing(Image::isPrimary, Comparator.reverseOrder())
                        .thenComparing(img -> img.getSortOrder() == null ? Integer.MAX_VALUE : img.getSortOrder()))
                .collect(Collectors.toList());
    }

    private Set<AttributeValue> extractSelectedValues(ProductDTO dto) {
    	Set<AttributeValue> selectedValues = new HashSet<>();

        if (dto.getAttributes() != null) {
            for (AttributeDto attrDTO : dto.getAttributes()) {
                Attribute attr = attributeRepository.findById(attrDTO.id())
                    .orElseThrow(() -> new RuntimeException("Attribute not found"));

                for (AttributeValueDto valDTO : attrDTO.values()) {
                    if (valDTO.selected()) {
                        AttributeValue value = attr.getValues().stream()
                            .filter(v -> v.getId().equals(valDTO.id()))
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException("Value not found"));

                        selectedValues.add(value);
                    }
                }
            }
        }

        return selectedValues;
    }
    
    
    
}
