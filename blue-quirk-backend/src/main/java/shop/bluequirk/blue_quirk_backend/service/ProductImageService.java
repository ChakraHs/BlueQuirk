package shop.bluequirk.blue_quirk_backend.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.repository.ImageRepository;

/**
 * Orchestrates the product-image pipeline: stores the original upload and
 * automatically generates + stores optimized <b>thumbnail</b> and <b>display</b>
 * variants, returning a fully-populated {@link Image}. Shared by the admin upload
 * endpoint and the Todify template importer so every image entering the system —
 * now and in the future — gets variants without any extra admin action.
 *
 * <p>Storage (Cloudflare R2) and resizing/encoding (Scrimage) are kept in their
 * own single-responsibility services; this class only wires them together.
 */
@Service
public class ProductImageService {

    private static final Logger LOG = LoggerFactory.getLogger(ProductImageService.class);

    private final R2StorageService r2;
    private final ImageVariantService variants;
    private final ImageRepository imageRepository;

    public ProductImageService(R2StorageService r2, ImageVariantService variants,
                               ImageRepository imageRepository) {
        this.r2 = r2;
        this.variants = variants;
        this.imageRepository = imageRepository;
    }

    /**
     * Stores the original bytes, generates the display + thumbnail variants, and
     * returns a new (unsaved) {@link Image} carrying all three URLs. The legacy
     * {@code url} is pointed at the display variant so any code still reading
     * {@code url} renders the optimized image rather than the heavy original.
     *
     * <p>If variant generation/upload fails the original is reused for every
     * variant so the upload still succeeds (degraded but never broken).
     *
     * @throws Exception if even the original upload fails (caller decides handling)
     */
    public Image buildOptimizedImage(byte[] original, String filename, String contentType) throws Exception {
        String groupId = UUID.randomUUID().toString();
        String baseName = stripExtension(filename);
        String originalExt = extensionFor(filename, contentType);

        // 1) Store the untouched original (reserved for fullscreen/deep zoom).
        String originalUrl = r2.putObject(original,
                r2.variantKey(groupId, "original", baseName, originalExt), contentType);

        // 2) + 3) Generate and store the optimized variants.
        String displayUrl = originalUrl;
        String thumbnailUrl = originalUrl;
        try {
            ImageVariantService.Variant display = variants.display(original);
            displayUrl = r2.putObject(display.bytes(),
                    r2.variantKey(groupId, "display", baseName, display.extension()), display.contentType());

            ImageVariantService.Variant thumb = variants.thumbnail(original);
            thumbnailUrl = r2.putObject(thumb.bytes(),
                    r2.variantKey(groupId, "thumb", baseName, thumb.extension()), thumb.contentType());
        } catch (Exception e) {
            LOG.warn("Variant generation failed for '{}' — falling back to original for all variants: {}",
                    filename, e.getMessage());
        }

        // 4) + 5) Return the complete image object with every URL populated.
        Image image = new Image();
        image.setFileName(filename);
        image.setOriginalUrl(originalUrl);
        image.setDisplayUrl(displayUrl);
        image.setThumbnailUrl(thumbnailUrl);
        image.setUrl(displayUrl); // legacy default render = optimized display
        return image;
    }

    /**
     * Backfills variants for existing images that predate the pipeline (have a
     * {@code url} but no generated variants). Idempotent — already-processed rows
     * are skipped — and resilient: a failure on one image is logged and the rest
     * continue. Returns the number of images successfully upgraded.
     *
     * @param limit max images to process in this run (0 or negative = all)
     */
    public int backfillVariants(int limit) {
        int processed = 0;
        for (Image image : imageRepository.findAll()) {
            if (limit > 0 && processed >= limit) {
                break;
            }
            if (image.hasVariants() || image.getUrl() == null || image.getUrl().isBlank()) {
                continue; // already done, or nothing to derive from
            }
            try {
                // Capture the existing url up front: it is the original image, and
                // we overwrite `url` with the display variant below. (Reading it
                // back later would be wrong — the variant getters fall back to
                // `url`, which by then points at the display image.)
                String existingUrl = image.getUrl();
                byte[] original = r2.fetch(existingUrl);
                String groupId = UUID.randomUUID().toString();
                String baseName = stripExtension(image.getFileName() != null ? image.getFileName() : "image");

                ImageVariantService.Variant display = variants.display(original);
                String displayUrl = r2.putObject(display.bytes(),
                        r2.variantKey(groupId, "display", baseName, display.extension()), display.contentType());

                ImageVariantService.Variant thumb = variants.thumbnail(original);
                String thumbnailUrl = r2.putObject(thumb.bytes(),
                        r2.variantKey(groupId, "thumb", baseName, thumb.extension()), thumb.contentType());

                // Existing url is treated as the original; serve display by default.
                image.setOriginalUrl(existingUrl);
                image.setDisplayUrl(displayUrl);
                image.setThumbnailUrl(thumbnailUrl);
                image.setUrl(displayUrl);
                imageRepository.save(image);
                processed++;
            } catch (Exception e) {
                LOG.warn("Backfill failed for image id={} ({}): {}",
                        image.getId(), image.getUrl(), e.getMessage());
            }
        }
        LOG.info("Image variant backfill complete: {} image(s) upgraded.", processed);
        return processed;
    }

    private String stripExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return "image";
        }
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    private String extensionFor(String filename, String contentType) {
        if (filename != null) {
            int dot = filename.lastIndexOf('.');
            if (dot > 0 && dot < filename.length() - 1) {
                return filename.substring(dot + 1).toLowerCase();
            }
        }
        if (contentType != null && contentType.contains("/")) {
            String sub = contentType.substring(contentType.indexOf('/') + 1);
            if ("jpeg".equals(sub)) return "jpg";
            return sub;
        }
        return "bin";
    }
}
