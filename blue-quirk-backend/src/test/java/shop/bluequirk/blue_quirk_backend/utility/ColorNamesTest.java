package shop.bluequirk.blue_quirk_backend.utility;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ColorNamesTest {

    @Test
    void mapsHexToFrenchName() {
        assertThat(ColorNames.toName("#000000", "fr")).isEqualTo("Noir");
        assertThat(ColorNames.toName("#f7f7f7", "fr")).isEqualTo("Blanc");
        assertThat(ColorNames.toName("#ef4444", "fr")).isEqualTo("Rouge");
    }

    @Test
    void localizesToRequestedLanguage() {
        assertThat(ColorNames.toName("#000000", "en")).isEqualTo("Black");
        assertThat(ColorNames.toName("#000000", "ar")).isEqualTo("أسود");
    }

    @Test
    void passesThroughNonHexValues() {
        assertThat(ColorNames.toName("M", "fr")).isEqualTo("M");          // a size
        assertThat(ColorNames.toName("Rouge", "fr")).isEqualTo("Rouge");  // already a name
        assertThat(ColorNames.toName(null, "fr")).isNull();
    }

    @Test
    void matchesNearestNamedColourForOffPaletteHex() {
        assertThat(ColorNames.toName("#010101", "fr")).isEqualTo("Noir");
    }
}
