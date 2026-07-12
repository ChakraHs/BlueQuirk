package shop.bluequirk.blue_quirk_backend.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Uploads product images to Cloudflare R2 via the Cloudflare REST API
 * (api.cloudflare.com) rather than the S3 endpoint. The S3 endpoint
 * (&lt;account&gt;.r2.cloudflarestorage.com) is blocked on some networks by SNI
 * filtering; the REST host is not, so this works in both dev and deployment.
 *
 * <p>The account/bucket/public-base come from {@code r2.*} properties; the API
 * token is resolved at call time from {@link IntegrationConfigService} (DB row
 * with env fallback), so it can be rotated from the admin dashboard without a
 * restart. When the token is absent the service reports itself unconfigured and
 * the caller fails loudly (503), so the app still runs without R2 credentials.
 */
@Service
public class R2StorageService {

    private static final Logger LOG = LoggerFactory.getLogger(R2StorageService.class);

    private final String accountId;
    private final String bucket;
    private final String publicBase;
    private final String keyPrefix;
    private final IntegrationConfigService configService;

    private final HttpClient http = HttpClient.newHttpClient();

    public R2StorageService(
            @Value("${r2.account-id:}") String accountId,
            @Value("${r2.bucket:}") String bucket,
            @Value("${r2.public-base:}") String publicBase,
            @Value("${r2.key-prefix:products}") String keyPrefix,
            IntegrationConfigService configService) {
        this.accountId = accountId.trim();
        this.bucket = bucket.trim();
        this.publicBase = publicBase.trim().replaceAll("/+$", "");
        this.keyPrefix = keyPrefix.trim().replaceAll("^/+|/+$", "");
        this.configService = configService;
    }

    /** The effective R2 API token (admin-editable DB value, else env default). */
    private String apiToken() {
        return configService.effectiveR2ApiToken();
    }

    public boolean isConfigured() {
        return !accountId.isBlank() && !bucket.isBlank() && !apiToken().isBlank() && !publicBase.isBlank();
    }

    /**
     * Uploads the bytes under a unique key and returns the public URL.
     *
     * @return the public r2.dev URL the frontend can render
     * @throws Exception if the upload fails (caller decides how to handle)
     */
    public String upload(byte[] content, String originalFilename, String contentType) throws Exception {
        String key = (keyPrefix.isBlank() ? "" : keyPrefix + "/")
                + UUID.randomUUID() + "-" + sanitize(originalFilename);
        return putObject(content, key, contentType);
    }

    /**
     * Builds an object key that groups all variants of one image under a shared
     * id, e.g. {@code products/<groupId>/display-shirt.webp}. Keeping the variants
     * together makes them easy to spot and purge as a unit.
     */
    public String variantKey(String groupId, String suffix, String baseName, String ext) {
        String safe = sanitize(baseName);
        return (keyPrefix.isBlank() ? "" : keyPrefix + "/")
                + groupId + "/" + suffix + "-" + safe + "." + ext;
    }

    /**
     * Low-level PUT of arbitrary bytes under an explicit key. Returns the public
     * URL. Shared by {@link #upload} and the variant pipeline.
     */
    public String putObject(byte[] content, String key, String contentType) throws Exception {
        URI uri = URI.create("https://api.cloudflare.com/client/v4/accounts/" + accountId
                + "/r2/buckets/" + bucket + "/objects/" + encodeKey(key));

        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Authorization", "Bearer " + apiToken())
                .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(content))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("R2 upload failed: HTTP " + response.statusCode() + " " + response.body());
        }

        String url = publicBase + "/" + key;
        LOG.info("Uploaded object to R2: {}", url);
        return url;
    }

    /**
     * Downloads the bytes at a public URL (e.g. an existing image's url) so the
     * backfill job can regenerate variants from already-stored originals. The
     * public r2.dev CDN is reachable where the S3 endpoint is not.
     */
    public byte[] fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
        HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Fetch failed: HTTP " + response.statusCode() + " for " + url);
        }
        return response.body();
    }

    private String sanitize(String filename) {
        String name = (filename == null || filename.isBlank()) ? "image" : filename;
        // keep the basename only, strip anything that isn't filename-safe
        name = name.replaceAll(".*[/\\\\]", "");
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        return name.isBlank() ? "image" : name;
    }

    private String encodeKey(String key) {
        // Preserve "/" path separators, encode each segment.
        return Arrays.stream(key.split("/"))
                .map(seg -> URLEncoder.encode(seg, StandardCharsets.UTF_8).replace("+", "%20"))
                .collect(Collectors.joining("/"));
    }
}
