package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
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

import shop.bluequirk.blue_quirk_backend.dto.CategoryRequest;
import shop.bluequirk.blue_quirk_backend.dto.CategoryResponse;
import shop.bluequirk.blue_quirk_backend.service.CategoryService;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createCategory(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories(
            @RequestParam(required = false) String lang
    ) {
        return ResponseEntity.ok(
                categoryService.getAllCategoriesByLanguage(lang)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(
    			@PathVariable Long id , 
    			@RequestParam(required = false) String lang) {
        return ResponseEntity.ok(categoryService.getCategoryById(id, lang));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

//    @GetMapping("/{id}/children")
//    public ResponseEntity<List<CategoryResponse>> getChildren(@PathVariable Long id) {
//        return ResponseEntity.ok(categoryService.getChildren(id));
//    }

//    @GetMapping("/root")
//    public ResponseEntity<List<CategoryResponse>> getRootCategories() {
//        return ResponseEntity.ok(categoryService.getRootCategories());
//    }
}