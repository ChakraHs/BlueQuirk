package shop.bluequirk.blue_quirk_backend.analytics.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * Cache of geo lookups keyed by the salted IP hash, so a given visitor's country
 * is resolved from the local MaxMind database at most once. Storing the hash
 * (never the raw IP) keeps the cache privacy-preserving.
 */
@Entity
@Table(name = "analytics_geo_cache", indexes = {
        @Index(name = "idx_agc_ip_hash", columnList = "ipHash", unique = true)
})
public class AnalyticsGeoCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64, unique = true)
    private String ipHash;

    @Column(length = 80)
    private String country;

    @Column(length = 120)
    private String city;

    @Column(nullable = false)
    private Instant resolvedAt;

    public Long getId() { return id; }

    public String getIpHash() { return ipHash; }
    public void setIpHash(String ipHash) { this.ipHash = ipHash; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}
