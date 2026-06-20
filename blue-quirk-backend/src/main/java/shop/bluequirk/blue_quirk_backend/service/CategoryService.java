package shop.bluequirk.blue_quirk_backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.dto.CategoryResponse;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.repository.CategoryRepository;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long id, Category dto) {
        Category existing = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        existing.setName(dto.getName());
        existing.setSlug(dto.getSlug());
        existing.setDescription(dto.getDescription());
        existing.setParent(dto.getParent());

        return categoryRepository.save(existing);
    }

    // SAFE: no lazy loading issue
//    public List<CategoryResponse> getAllCategories() {
//        List<Category> categories = categoryRepository.findAllWithChildren();
//        return categories.stream()
//                .filter(c -> c.getParent() == null)
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }
    
    // SAFE: no lazy loading issue
    public List<CategoryResponse> getAllCategoriesByLanguage(String lang) {
        List<Category> categories = lang != null ? categoryRepository.findAllWithChildrenByLanguage(lang) : categoryRepository.findAllWithChildren();
        return categories.stream()
                .filter(c -> c.getParent() == null)
                .map(c -> toDto(c, lang))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id, String lang) {
    	Category category = categoryRepository.findByIdWithChildren(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        return toDto(category,lang);
    }

    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

//    public List<CategoryResponse> getRootCategories() {
//        return categoryRepository.findAll().stream()
//                .filter(c -> c.getParent() == null)
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }

//    public List<CategoryResponse> getChildren(Long parentId) {
//        return categoryRepository.findById(parentId)
//                .orElseThrow(() -> new RuntimeException("Category not found"))
//                .getChildren()
//                .stream()
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }

    // -------- MAPPER --------
    private CategoryResponse toDto(Category c, String lang) {

        String name;
        String description;

        if (lang == null) {
            name = c.getName();
            description = c.getDescription();
        } else {
            var translation = c.getTranslations()
                    .stream()
                    .filter(t -> t.getLang().equals(lang))
                    .findFirst()
                    .orElse(null);

            name = (translation != null) ? translation.getName() : c.getName();
            description = (translation != null) ? translation.getDescription() : c.getDescription();
        }

        List<CategoryResponse> children = c.getChildren() == null
                ? List.of()
                : c.getChildren().stream()
                    .map(child -> new CategoryResponse(
                            child.getId(),
                            resolveName(child, lang),
                            child.getSlug(),
                            resolveDescription(child, lang),
                            child.getParent() != null ? child.getParent().getId() : null,
                            child.getImageUrl(),
                            List.of() // STOP recursion
                    ))
                    .toList();

        return new CategoryResponse(
                c.getId(),
                name,
                c.getSlug(),
                description,
                c.getParent() != null ? c.getParent().getId() : null,
                c.getImageUrl(),
                children
        );
    }
    
    
    
    private String resolveName(Category c, String lang) {
        if (lang == null) {
            return c.getName();
        }

        return c.getTranslations() == null ? c.getName()
                : c.getTranslations().stream()
                    .filter(t -> t.getLang().equals(lang))
                    .map(t -> t.getName())
                    .findFirst()
                    .orElse(c.getName());
    }
    
    
    
    private String resolveDescription(Category c, String lang) {
        if (lang == null) {
            return c.getDescription();
        }

        return c.getTranslations() == null ? c.getDescription()
                : c.getTranslations().stream()
                    .filter(t -> t.getLang().equals(lang))
                    .map(t -> t.getDescription())
                    .findFirst()
                    .orElse(c.getDescription());
    }
    
    
    
}