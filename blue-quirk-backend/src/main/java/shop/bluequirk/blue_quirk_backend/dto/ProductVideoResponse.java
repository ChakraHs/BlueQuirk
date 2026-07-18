package shop.bluequirk.blue_quirk_backend.dto;

import shop.bluequirk.blue_quirk_backend.entity.ProductVideo;

/**
 * The product's featured video as returned by the public/product API. Emitted
 * only when a real video exists (see {@link #from}); products without a video
 * return {@code null} for the whole object so the storefront behaves exactly as
 * before.
 */
public record ProductVideoResponse(
        String videoUrl,
        String posterImageUrl,
        Double duration,
        Long fileSize
) {
    /** Maps the embedded value to a response, or {@code null} when there is no video. */
    public static ProductVideoResponse from(ProductVideo video) {
        if (video == null || !video.hasVideo()) {
            return null;
        }
        return new ProductVideoResponse(
                video.getVideoUrl(),
                video.getPosterImageUrl(),
                video.getDuration(),
                video.getFileSize()
        );
    }
}
