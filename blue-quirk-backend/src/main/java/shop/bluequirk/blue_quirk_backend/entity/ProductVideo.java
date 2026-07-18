package shop.bluequirk.blue_quirk_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * One optional featured product video, stored inline on {@link Product} as an
 * embeddable value (columns {@code video_url}, {@code video_poster_url},
 * {@code video_duration}, {@code video_file_size}). Every field is nullable, so
 * pre-existing products migrate cleanly and stay video-less: a product simply
 * has no video until {@link #videoUrl} is set.
 *
 * <p>The asset itself (an MP4 / H.264 clip) and its poster live in Cloudflare R2
 * exactly like product images; only the resolved public URLs are stored here.
 */
@Embeddable
public class ProductVideo {

    // Public R2 URL of the MP4 (H.264). Null/blank = the product has no video.
    @Column(name = "video_url")
    private String videoUrl;

    // Public URL of the poster/thumbnail shown before playback (loaded first so
    // the heavy MP4 is only requested when the slide becomes active). Usually a
    // frame captured from the clip, or an admin-picked product image.
    @Column(name = "video_poster_url")
    private String posterImageUrl;

    // Clip length in seconds (read from the video metadata by the admin UI).
    @Column(name = "video_duration")
    private Double duration;

    // Original file size in bytes (optional; informational only).
    @Column(name = "video_file_size")
    private Long fileSize;

    public ProductVideo() {}

    /** True only when a real video URL is present. */
    public boolean hasVideo() {
        return videoUrl != null && !videoUrl.isBlank();
    }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getPosterImageUrl() { return posterImageUrl; }
    public void setPosterImageUrl(String posterImageUrl) { this.posterImageUrl = posterImageUrl; }

    public Double getDuration() { return duration; }
    public void setDuration(Double duration) { this.duration = duration; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
}
