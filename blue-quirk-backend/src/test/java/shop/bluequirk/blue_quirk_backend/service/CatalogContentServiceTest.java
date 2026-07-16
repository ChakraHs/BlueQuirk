package shop.bluequirk.blue_quirk_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogBackfillResponse;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentItem;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentSeed;
import shop.bluequirk.blue_quirk_backend.dto.catalog.CatalogContentTranslation;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.entity.translation.ProductTranslation;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

/**
 * Locks down the catalog content backfill's core contract: it fills blank
 * fields, never overwrites existing content, and is idempotent (a second run
 * changes nothing).
 */
@ExtendWith(MockitoExtension.class)
class CatalogContentServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CatalogContentService service;

    private static Product product(long id, String name, String description) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setDescription(description);
        return p;
    }

    private static CatalogContentItem item(long id, String description, CatalogContentTranslation... trs) {
        return new CatalogContentItem(id, null, description, null, List.of(trs));
    }

    private static CatalogContentTranslation tr(String lang, String name, String desc) {
        return new CatalogContentTranslation(lang, name, desc);
    }

    @Test
    void fillsBlankDescriptionAndCreatesMissingTranslations() {
        Product p = product(24L, "Lose Love", "   "); // blank
        when(productRepository.findById(24L)).thenReturn(java.util.Optional.of(p));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        CatalogBackfillResponse res = service.backfill(List.of(
                item(24L, "<p>EN copy</p>",
                        tr("fr", "FR name", "<p>FR copy</p>"),
                        tr("ar", "AR name", "<p>AR copy</p>"))), false);

        assertThat(res.fieldsApplied()).isEqualTo(3);
        assertThat(res.results().get(0).applied())
                .containsExactlyInAnyOrder("description", "translation:fr", "translation:ar");
        assertThat(p.getDescription()).isEqualTo("<p>EN copy</p>");
        assertThat(p.getTranslations()).hasSize(2);
        verify(productRepository).save(p);
    }

    @Test
    void neverOverwritesExistingContentAndIsIdempotent() {
        Product p = product(7L, "Play Ground", "<p>Existing EN</p>");
        ProductTranslation frExisting = new ProductTranslation();
        frExisting.setLang("fr");
        frExisting.setName("Existing FR");
        frExisting.setDescription("<p>Existing FR copy</p>");
        frExisting.setProduct(p);
        p.getTranslations().add(frExisting);

        when(productRepository.findById(7L)).thenReturn(java.util.Optional.of(p));

        CatalogBackfillResponse res = service.backfill(List.of(
                item(7L, "<p>NEW EN should be ignored</p>",
                        tr("fr", "NEW FR ignored", "<p>NEW FR ignored</p>"))), false);

        assertThat(res.fieldsApplied()).isZero();
        assertThat(res.results().get(0).applied()).isEmpty();
        assertThat(res.results().get(0).skipped()).contains("description", "translation:fr");
        // Stored content untouched.
        assertThat(p.getDescription()).isEqualTo("<p>Existing EN</p>");
        assertThat(frExisting.getName()).isEqualTo("Existing FR");
        assertThat(frExisting.getDescription()).isEqualTo("<p>Existing FR copy</p>");
        // Nothing applied → no write.
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void fillsOnlyTheBlankTranslationField() {
        // A row exists for AR with a name but no description → fill description only.
        Product p = product(29L, "Thornbloom", "<p>Existing EN</p>");
        ProductTranslation arPartial = new ProductTranslation();
        arPartial.setLang("ar");
        arPartial.setName("اسم موجود");
        arPartial.setDescription("");
        arPartial.setProduct(p);
        p.getTranslations().add(arPartial);

        when(productRepository.findById(29L)).thenReturn(java.util.Optional.of(p));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        CatalogBackfillResponse res = service.backfill(List.of(
                item(29L, null, tr("ar", "اسم جديد يُتجاهل", "<p>وصف جديد</p>"))), false);

        assertThat(res.results().get(0).applied()).containsExactly("translation:ar.description");
        assertThat(arPartial.getName()).isEqualTo("اسم موجود");           // kept
        assertThat(arPartial.getDescription()).isEqualTo("<p>وصف جديد</p>"); // filled
    }

    @Test
    void dryRunReportsButDoesNotSave() {
        Product p = product(24L, "Lose Love", null);
        when(productRepository.findById(24L)).thenReturn(java.util.Optional.of(p));

        CatalogBackfillResponse res = service.backfill(List.of(
                item(24L, "<p>EN</p>")), true);

        assertThat(res.dryRun()).isTrue();
        assertThat(res.results().get(0).applied()).containsExactly("description");
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void flagsUnknownProductIds() {
        when(productRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        CatalogBackfillResponse res = service.backfill(List.of(item(999L, "<p>x</p>")), false);

        assertThat(res.results().get(0).notFound()).isTrue();
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void bundledSeedParsesAndTargetsSixProducts() {
        CatalogContentService real = new CatalogContentService(productRepository, new ObjectMapper());
        CatalogContentSeed seed = real.loadSeed();
        assertThat(seed.items()).hasSize(6);
        assertThat(seed.items()).allSatisfy(i -> {
            assertThat(i.productId()).isNotNull();
            assertThat(i.translations()).extracting(CatalogContentTranslation::lang)
                    .contains("fr", "ar");
        });
        // Product 29 keeps its existing English description (translations only).
        assertThat(seed.items()).filteredOn(i -> i.productId() == 29L)
                .allSatisfy(i -> assertThat(i.description()).isNull());
        verify(productRepository, never()).save(any(Product.class));
        verify(productRepository, never()).findById(anyLong());
    }
}
