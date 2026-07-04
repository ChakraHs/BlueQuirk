package shop.bluequirk.blue_quirk_backend.analytics.service;

import java.io.File;
import java.net.InetAddress;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.model.CityResponse;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsGeoCache;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsGeoCacheRepository;

/**
 * Resolves country/city from an IP using the local, self-hosted MaxMind GeoLite2
 * database — no external network calls, fully private. Results are cached in the
 * DB by IP hash so each IP is looked up at most once. If the .mmdb file is absent
 * the service degrades gracefully to "no geo" (country stays null); the rest of
 * analytics is unaffected.
 */
@Service
public class GeoLocationService {

    private static final Logger log = LoggerFactory.getLogger(GeoLocationService.class);

    private final AnalyticsGeoCacheRepository geoCacheRepository;
    private final String dbPath;
    private DatabaseReader reader; // null when the DB file is not present

    public GeoLocationService(AnalyticsGeoCacheRepository geoCacheRepository,
                              @Value("${analytics.geoip.db-path:geoip/GeoLite2-City.mmdb}") String dbPath) {
        this.geoCacheRepository = geoCacheRepository;
        this.dbPath = dbPath;
    }

    @PostConstruct
    void init() {
        File db = new File(dbPath);
        if (!db.exists()) {
            log.info("Analytics geo: no GeoLite2 DB at '{}', country/city disabled (graceful).", dbPath);
            return;
        }
        try {
            this.reader = new DatabaseReader.Builder(db).build();
            log.info("Analytics geo: loaded GeoLite2 DB from '{}'.", dbPath);
        } catch (Exception e) {
            log.warn("Analytics geo: failed to load GeoLite2 DB '{}': {}", dbPath, e.getMessage());
        }
    }

    @PreDestroy
    void close() {
        if (reader != null) {
            try { reader.close(); } catch (Exception ignored) { }
        }
    }

    public boolean isEnabled() {
        return reader != null;
    }

    /**
     * Country/city for the given IP, using (and populating) the per-IP-hash cache.
     * Returns an empty-valued result when geo is disabled or the lookup fails.
     */
    public GeoResult resolve(String ip, String ipHash) {
        Optional<AnalyticsGeoCache> cached = geoCacheRepository.findByIpHash(ipHash);
        if (cached.isPresent()) {
            return new GeoResult(cached.get().getCountry(), cached.get().getCity());
        }

        String country = null;
        String city = null;
        if (reader != null && ip != null && !ip.isBlank()) {
            try {
                CityResponse resp = reader.city(InetAddress.getByName(ip));
                country = resp.getCountry() != null ? resp.getCountry().getName() : null;
                city = resp.getCity() != null ? resp.getCity().getName() : null;
            } catch (Exception e) {
                // Private/loopback/unknown IPs land here — cache the miss to avoid retrying.
            }
        }

        // Race-safe upsert (ON DUPLICATE KEY): never throws on a same-IP collision,
        // so it can't roll back the surrounding ingest transaction.
        geoCacheRepository.upsertIgnore(ipHash, country, city);
        return new GeoResult(country, city);
    }

    public record GeoResult(String country, String city) {}
}
