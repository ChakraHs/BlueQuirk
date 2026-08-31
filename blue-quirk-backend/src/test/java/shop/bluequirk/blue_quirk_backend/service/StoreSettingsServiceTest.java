package shop.bluequirk.blue_quirk_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.dto.StoreSettingsRequest;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.repository.StoreSettingsRepository;

/**
 * Unit tests for the Meta Ads (Facebook Pixel) admin settings: enable/disable,
 * saving + updating a valid Pixel ID, clearing it, and rejecting invalid ids.
 */
class StoreSettingsServiceTest {

    @Mock StoreSettingsRepository repository;

    private StoreSettingsService service;
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        // Seed defaults mirror the @Value bindings; only the singleton row matters here.
        service = new StoreSettingsService(repository, 0, 0, 0, "DH", "RedQuirk", "fr");

        // getOrCreate() finds the existing singleton row, and save() echoes its arg.
        StoreSettings existing = new StoreSettings();
        existing.setId(StoreSettings.SINGLETON_ID);
        existing.setStoreName("RedQuirk");
        existing.setCurrency("DH");
        existing.setDefaultLang("fr");
        when(repository.findById(StoreSettings.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(StoreSettings.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    /** Only the fields under test are set; everything else is left unchanged (null). */
    private StoreSettingsRequest metaRequest(Boolean enabled, String pixelId) {
        return new StoreSettingsRequest(
                null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null,
                enabled, pixelId);
    }

    @Test
    void savesAValidPixelIdAndEnablesTracking() {
        StoreSettings saved = service.update(metaRequest(true, "123456789012345"));

        assertThat(saved.isMetaTrackingEnabled()).isTrue();
        assertThat(saved.getMetaPixelId()).isEqualTo("123456789012345");
    }

    @Test
    void updatesAnExistingPixelId() {
        service.update(metaRequest(true, "123456789012345"));
        StoreSettings saved = service.update(metaRequest(null, "987654321098765"));

        // enabled left unchanged (null), pixel id replaced.
        assertThat(saved.isMetaTrackingEnabled()).isTrue();
        assertThat(saved.getMetaPixelId()).isEqualTo("987654321098765");
    }

    @Test
    void togglesTrackingWithoutTouchingThePixelId() {
        service.update(metaRequest(true, "123456789012345"));
        StoreSettings saved = service.update(metaRequest(false, null));

        assertThat(saved.isMetaTrackingEnabled()).isFalse();
        assertThat(saved.getMetaPixelId()).isEqualTo("123456789012345");
    }

    @Test
    void blankPixelIdClearsIt() {
        service.update(metaRequest(true, "123456789012345"));
        StoreSettings saved = service.update(metaRequest(null, "   "));

        assertThat(saved.getMetaPixelId()).isNull();
    }

    @Test
    void rejectsANonNumericPixelId() {
        assertThatThrownBy(() -> service.update(metaRequest(true, "not-a-number")))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsAPixelIdOfTheWrongLength() {
        assertThatThrownBy(() -> service.update(metaRequest(true, "123")))
                .isInstanceOf(ResponseStatusException.class);
    }
}
