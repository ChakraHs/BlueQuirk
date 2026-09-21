package shop.bluequirk.blue_quirk_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.CategoryResponse;
import shop.bluequirk.blue_quirk_backend.entity.Category;
import shop.bluequirk.blue_quirk_backend.repository.CategoryRepository;

/**
 * Locks the category visibility contract: the storefront ({@code activeOnly=true})
 * sees only active roots and active children and 404s an inactive category by id,
 * while Admin ({@code activeOnly=false}) keeps seeing every category and its status.
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService service;

    private static Category cat(long id, String name, boolean active, Category parent) {
        Category c = new Category();
        c.setId(id);
        c.setName(name);
        c.setActive(active);
        c.setParent(parent);
        return c;
    }

    /** root1 (active) → [child1a active, child1b hidden]; root2 (hidden) → [child2a active]. */
    private void stubTree() {
        Category root1 = cat(1, "Active root", true, null);
        Category child1a = cat(11, "Active child", true, root1);
        Category child1b = cat(12, "Hidden child", false, root1);
        root1.setChildren(new LinkedHashSet<>(List.of(child1a, child1b)));

        Category root2 = cat(2, "Hidden root", false, null);
        Category child2a = cat(21, "Child of hidden", true, root2);
        root2.setChildren(new LinkedHashSet<>(List.of(child2a)));

        when(categoryRepository.findAllWithChildren())
                .thenReturn(List.of(root1, child1a, child1b, root2, child2a));
    }

    @Test
    void storefront_hidesInactiveRootsAndChildren() {
        stubTree();

        List<CategoryResponse> active = service.getAllCategoriesByLanguage(null, true);

        // The hidden root is gone; the active root keeps only its active child.
        assertThat(active).extracting(CategoryResponse::id).containsExactly(1L);
        assertThat(active.get(0).children()).extracting(CategoryResponse::id).containsExactly(11L);
    }

    @Test
    void admin_seesEveryCategoryWithStatus() {
        stubTree();

        List<CategoryResponse> all = service.getAllCategoriesByLanguage(null, false);

        assertThat(all).extracting(CategoryResponse::id).containsExactlyInAnyOrder(1L, 2L);
        CategoryResponse root1 = all.stream().filter(c -> c.id() == 1L).findFirst().orElseThrow();
        assertThat(root1.active()).isTrue();
        assertThat(root1.children()).extracting(CategoryResponse::id).containsExactlyInAnyOrder(11L, 12L);
        CategoryResponse hiddenRoot = all.stream().filter(c -> c.id() == 2L).findFirst().orElseThrow();
        assertThat(hiddenRoot.active()).isFalse();
    }

    @Test
    void storefront_getById_404sInactiveCategory() {
        Category hidden = cat(5, "Hidden", false, null);
        hidden.setChildren(new LinkedHashSet<>());
        when(categoryRepository.findByIdWithChildren(5L)).thenReturn(Optional.of(hidden));

        assertThatThrownBy(() -> service.getCategoryById(5L, null, true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    void admin_getById_returnsInactiveCategory() {
        Category hidden = cat(5, "Hidden", false, null);
        hidden.setChildren(new LinkedHashSet<>());
        when(categoryRepository.findByIdWithChildren(5L)).thenReturn(Optional.of(hidden));

        CategoryResponse dto = service.getCategoryById(5L, null, false);

        assertThat(dto.id()).isEqualTo(5L);
        assertThat(dto.active()).isFalse();
    }
}
