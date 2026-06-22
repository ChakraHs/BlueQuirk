package shop.bluequirk.blue_quirk_backend.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.CategoryRequest;
import shop.bluequirk.blue_quirk_backend.dto.CategoryResponse;
import shop.bluequirk.blue_quirk_backend.dto.CategoryTranslationDto;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.entity.translation.CategoryTranslation;
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

    /**
     * Creates a category from an admin request. Resolves the optional parent,
     * auto-generates a slug from the name when none is supplied, and returns the
     * locale-neutral DTO.
     */
    @Transactional
    public CategoryResponse createCategory(CategoryRequest req) {
        if (req == null || req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom de la catégorie est requis");
        }

        Category category = new Category();
        category.setName(req.name().trim());
        category.setSlug(slugify(req.slug() != null && !req.slug().isBlank() ? req.slug() : req.name()));
        category.setDescription(req.description() != null ? req.description().trim() : null);
        category.setImageUrl(req.imageUrl() != null && !req.imageUrl().isBlank() ? req.imageUrl().trim() : null);

        if (req.parentId() != null) {
            Category parent = categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Catégorie parente introuvable"));
            category.setParent(parent);
        }

        applyTranslations(category, req.translations());

        try {
            Category saved = categoryRepository.saveAndFlush(category);
            return toDto(saved, null);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une catégorie portant ce nom existe déjà");
        }
    }

    /**
     * Updates a category from an admin request: base fields, optional parent
     * (rejecting self/descendant cycles), and the fr/ar translations.
     */
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest req) {
        if (req == null || req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom de la catégorie est requis");
        }

        Category existing = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Catégorie introuvable"));

        existing.setName(req.name().trim());
        existing.setSlug(slugify(req.slug() != null && !req.slug().isBlank() ? req.slug() : req.name()));
        existing.setDescription(req.description() != null ? req.description().trim() : null);
        existing.setImageUrl(req.imageUrl() != null && !req.imageUrl().isBlank() ? req.imageUrl().trim() : null);

        if (req.parentId() == null) {
            existing.setParent(null);
        } else if (req.parentId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une catégorie ne peut pas être sa propre parente");
        } else {
            Category parent = categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Catégorie parente introuvable"));
            existing.setParent(parent);
        }

        applyTranslations(existing, req.translations());

        try {
            Category saved = categoryRepository.saveAndFlush(existing);
            return toDto(saved, null);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une catégorie portant ce nom existe déjà");
        }
    }

    /**
     * Merges the supplied fr/ar entries into a category's translations in place.
     * We update existing rows per-lang (rather than clear + recreate) so we never
     * insert a new (category_id, lang) before deleting the old one — which would
     * violate the unique constraint mid-flush. Blank entries remove that lang.
     */
    private void applyTranslations(Category category, List<CategoryTranslationDto> translations) {
        Set<CategoryTranslation> existing = category.getTranslations();
        Set<String> keepLangs = new HashSet<>();

        if (translations != null) {
            for (CategoryTranslationDto dto : translations) {
                if (dto == null || dto.lang() == null || dto.lang().isBlank()) {
                    continue;
                }
                String lang = dto.lang().trim();
                boolean hasContent = (dto.name() != null && !dto.name().isBlank())
                        || (dto.description() != null && !dto.description().isBlank());
                if (!hasContent) {
                    continue; // dropped below since not in keepLangs
                }

                CategoryTranslation t = existing.stream()
                        .filter(x -> lang.equals(x.getLang()))
                        .findFirst()
                        .orElse(null);
                if (t == null) {
                    t = new CategoryTranslation();
                    t.setLang(lang);
                    t.setCategory(category);
                    existing.add(t);
                }
                t.setName(dto.name());
                t.setDescription(dto.description());
                keepLangs.add(lang);
            }
        }

        // Drop any translation whose lang was not supplied (or was blanked out).
        existing.removeIf(t -> !keepLangs.contains(t.getLang()));
    }

    private String slugify(String input) {
        return input.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
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
                            toTranslationDtos(child),
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
                toTranslationDtos(c),
                children
        );
    }

    /** Raw fr/ar translations for the admin editor (empty list when none). */
    private List<CategoryTranslationDto> toTranslationDtos(Category c) {
        Set<CategoryTranslation> translations = c.getTranslations();
        if (translations == null || translations.isEmpty()) {
            return List.of();
        }
        return translations.stream()
                .map(t -> new CategoryTranslationDto(t.getLang(), t.getName(), t.getDescription()))
                .collect(Collectors.toList());
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