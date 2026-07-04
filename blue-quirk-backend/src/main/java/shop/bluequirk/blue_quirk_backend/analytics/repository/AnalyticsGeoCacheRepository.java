package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsGeoCache;

public interface AnalyticsGeoCacheRepository extends JpaRepository<AnalyticsGeoCache, Long> {

    Optional<AnalyticsGeoCache> findByIpHash(String ipHash);

    /**
     * Race-safe cache write: concurrent sessions from the same IP (very common on
     * shared networks) would otherwise collide on the unique ip_hash. ON DUPLICATE
     * KEY makes the second write a harmless no-op instead of throwing and rolling
     * back the whole ingest transaction.
     */
    @Modifying
    @Query(nativeQuery = true, value =
            "INSERT INTO analytics_geo_cache (ip_hash, country, city, resolved_at) "
            + "VALUES (:ipHash, :country, :city, NOW()) "
            + "ON DUPLICATE KEY UPDATE ip_hash = ip_hash")
    void upsertIgnore(@Param("ipHash") String ipHash,
                      @Param("country") String country,
                      @Param("city") String city);
}
