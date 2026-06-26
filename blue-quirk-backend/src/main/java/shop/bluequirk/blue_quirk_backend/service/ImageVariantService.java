package shop.bluequirk.blue_quirk_backend.service;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.nio.JpegWriter;
import com.sksamuel.scrimage.webp.WebpWriter;

/**
 * Generates optimized, web-ready variants from an uploaded original image:
 *
 * <ul>
 *   <li><b>Thumbnail</b> (~400px wide) — cards, listings, search, wishlist, cart.</li>
 *   <li><b>Display</b> (~1200px wide) — product page, gallery and hover magnifier.</li>
 * </ul>
 *
 * <p>Output is WebP (markedly smaller than JPEG at equal quality). The WebP
 * encoder ships native binaries via {@code scrimage-webp}; if it cannot run on a
 * given host the service transparently falls back to progressive JPEG, so the
 * upload pipeline never fails because of image processing. Images smaller than a
 * target width are never upscaled.
 */
@Service
public class ImageVariantService {

    private static final Logger LOG = LoggerFactory.getLogger(ImageVariantService.class);

    // Target widths (px). Height scales to preserve aspect ratio.
    private static final int THUMBNAIL_WIDTH = 400;
    private static final int DISPLAY_WIDTH = 1200;

    // WebP quality (0-100).
    private static final int THUMBNAIL_WEBP_Q = 72;
    private static final int DISPLAY_WEBP_Q = 80;

    // JPEG fallback quality (0-100), used only when WebP is unavailable.
    private static final int THUMBNAIL_JPEG_Q = 78;
    private static final int DISPLAY_JPEG_Q = 82;

    // Soft byte budget for the thumbnail; if the first WebP pass overshoots we
    // re-encode once at lower quality to try to stay under it.
    private static final long THUMBNAIL_MAX_BYTES = 120 * 1024;

    /** A generated variant: the encoded bytes plus how to store and serve them. */
    public record Variant(byte[] bytes, String contentType, String extension) {}

    // Cached probe result: once WebP is found to be broken on this host we stop
    // retrying it and go straight to JPEG. null = not yet attempted.
    private volatile Boolean webpAvailable = null;

    /** Small card/list image. */
    public Variant thumbnail(byte[] original) throws IOException {
        ImmutableImage resized = downscaleToWidth(load(original), THUMBNAIL_WIDTH);
        return encode(resized, THUMBNAIL_WEBP_Q, THUMBNAIL_JPEG_Q, THUMBNAIL_MAX_BYTES);
    }

    /** Mid-size product-page image (also reused by the hover magnifier). */
    public Variant display(byte[] original) throws IOException {
        ImmutableImage resized = downscaleToWidth(load(original), DISPLAY_WIDTH);
        return encode(resized, DISPLAY_WEBP_Q, DISPLAY_JPEG_Q, 0);
    }

    private ImmutableImage load(byte[] bytes) throws IOException {
        return ImmutableImage.loader().fromBytes(bytes);
    }

    private ImmutableImage downscaleToWidth(ImmutableImage img, int maxWidth) {
        // Never upscale: only shrink images wider than the target.
        return img.width > maxWidth ? img.scaleToWidth(maxWidth) : img;
    }

    private Variant encode(ImmutableImage img, int webpQ, int jpegQ, long maxBytes) throws IOException {
        if (webpEnabled()) {
            try {
                byte[] bytes = img.bytes(WebpWriter.DEFAULT.withQ(webpQ));
                if (maxBytes > 0 && bytes.length > maxBytes) {
                    byte[] smaller = img.bytes(WebpWriter.DEFAULT.withQ(Math.max(40, webpQ - 20)));
                    if (smaller.length < bytes.length) {
                        bytes = smaller;
                    }
                }
                webpAvailable = Boolean.TRUE;
                return new Variant(bytes, "image/webp", "webp");
            } catch (Throwable t) {
                // Native encoder missing/failed — disable WebP for the rest of the run.
                webpAvailable = Boolean.FALSE;
                LOG.warn("WebP encoding unavailable ({}); falling back to JPEG for image variants.",
                        t.toString());
            }
        }
        byte[] jpeg = img.bytes(JpegWriter.Default.withCompression(jpegQ));
        return new Variant(jpeg, "image/jpeg", "jpg");
    }

    private boolean webpEnabled() {
        Boolean available = webpAvailable;
        return available == null || available;
    }
}
