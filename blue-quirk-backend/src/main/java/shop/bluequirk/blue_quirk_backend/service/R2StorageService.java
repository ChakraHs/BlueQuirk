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
 * <p>Configured via {@code r2.*} properties. When the API token is absent the
 * service reports itself unconfigured and the caller falls back to local disk,
 * so the app still runs without R2 credentials.
 */
@Service
public class R2StorageService {

    private static final Logger LOG = LoggerFactory.getLogger(R2StorageService.class);

    private final String accountId;
    private final String bucket;
    private final String apiToken;
    private final String publicBase;
    private final String keyPrefix;

    private final HttpClient http = HttpClient.newHttpClient();

    public R2StorageService(
            @Value("${r2.account-id:}") String accountId,
            @Value("${r2.bucket:}") String bucket,
            @Value("${r2.api-token:}") String apiToken,
            @Value("${r2.public-base:}") String publicBase,
            @Value("${r2.key-prefix:products}") String keyPrefix) {
        this.accountId = accountId.trim();
        this.bucket = bucket.trim();
        this.apiToken = apiToken.trim();
        this.publicBase = publicBase.trim().replaceAll("/+$", "");
        this.keyPrefix = keyPrefix.trim().replaceAll("^/+|/+$", "");
    }

    public boolean isConfigured() {
        return !accountId.isBlank() && !bucket.isBlank() && !apiToken.isBlank() && !publicBase.isBlank();
    }

    /**
     * Uploads the bytes under a unique key and returns the public URL.
     *
     * @return the public r2.dev URL the frontend can render
     * @throws Exception if the upload fails (caller decides how to handle)
     */
    public String upload(byte[] content, String originalFilename, String contentType) throws Exception {
        String safeName = sanitize(originalFilename);
        String key = (keyPrefix.isBlank() ? "" : keyPrefix + "/") + UUID.randomUUID() + "-" + safeName;

        URI uri = URI.create("https://api.cloudflare.com/client/v4/accounts/" + accountId
                + "/r2/buckets/" + bucket + "/objects/" + encodeKey(key));

        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Authorization", "Bearer " + apiToken)
                .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(content))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("R2 upload failed: HTTP " + response.statusCode() + " " + response.body());
        }

        String url = publicBase + "/" + key;
        LOG.info("Uploaded image to R2: {}", url);
        return url;
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
