package shop.bluequirk.blue_quirk_backend.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.dto.AttributeDto;
import shop.bluequirk.blue_quirk_backend.dto.AttributeValueDto;
import shop.bluequirk.blue_quirk_backend.dto.ProductDTO;
import shop.bluequirk.blue_quirk_backend.dto.ProductResponse;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;
import shop.bluequirk.blue_quirk_backend.entity.AttributeValue;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;
import shop.bluequirk.blue_quirk_backend.repository.AttributeRepository;
import shop.bluequirk.blue_quirk_backend.repository.ImageRepository;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

@Service
public class ProductService {

	private final ProductRepository productRepository;
    private final ImageRepository imageRepository;
    private final AttributeRepository attributeRepository;

    public ProductService(ProductRepository productRepository, ImageRepository imageRepository, AttributeRepository attributeRepository) {
        this.productRepository = productRepository;
        this.imageRepository = imageRepository;
        this.attributeRepository = attributeRepository;
        
    }
    
    
    @Transactional
    public Product createProduct(ProductDTO dto) {
        Product product = fromDTO(dto);
        return productRepository.save(product);
    }



    
    
    public Product updateProduct(Long productId, ProductDTO dto) {
    	Product existing = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

    	
    	existing.setName(dto.getName());
        existing.setPrice(dto.getPrice());
    	existing.setDescription(dto.getDescription());
        existing.setStatus(dto.getStatus());
        existing.setImages(dto.getImages());
        if (dto.getTranslations() != null) {
            applyTranslations(existing, dto.getTranslations());
        }

        existing.setSelectedValues(extractSelectedValues(dto));

        return productRepository.save(existing);
    	
    }
    
    
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    public Page<ProductResponse> getAllProducts(int page, int size, String lang) {
    	Page<Product> products = productRepository.findAllWithRelations(
    			PageRequest.of(page, size));
    	
    	List<Attribute> attributes = attributeRepository.findAllWithValues();

    	return products.map(p -> toProductResponse(p, attributes, lang));
    }

    
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
            product.getPrice(),
            resolveDescription(product, lang),
            product.getStatus(),
            product.getImages(),
            attributes
        );
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
    
    
    
    
    
    
    
    
    public List<ProductResponse> getProductsByCategory(Long categoryId, String lang) {
        List<Product> products = productRepository.findByCategoryIdWithRelations(categoryId);

        List<Attribute> attributes = attributeRepository.findAllWithValues();

        return products.stream()
                .map(p -> toProductResponse(p, attributes, lang))
                .collect(Collectors.toList());
    }
    
    
    
    public Product fromDTO(ProductDTO dto) {
        Product product = new Product();
        product.setId(dto.getId());
        product.setName(dto.getName());
        product.setPrice(dto.getPrice());
        product.setDescription(dto.getDescription());
        product.setStatus(dto.getStatus());
        product.setImages(dto.getImages());
        applyTranslations(product, dto.getTranslations());

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
                product.getPrice(),
                resolveDescription(product, lang),
                product.getStatus(),
                product.getImages(),
                attributes
        );
    }

    private void applyTranslations(Product product, Set<ProductTranslation> translations) {
        product.getTranslations().clear();

        if (translations == null) {
            return;
        }

        translations.forEach(translation -> {
            translation.setProduct(product);
            product.getTranslations().add(translation);
        });
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
