package shop.bluequirk.blue_quirk_backend.analytics.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

/**
 * A pre-aggregated daily summary. Written once per day by the aggregation job and
 * kept <b>forever</b> (raw events are pruned after 90 days). Long date ranges in
 * the dashboard read these rows instead of scanning raw tables. The {@code *Json}
 * columns hold small ranked breakdowns (top pages/products, referrers, devices,
 * countries) so a single row can back most charts for a historical day.
 */
@Entity
@Table(name = "analytics_daily_stats", indexes = {
        @Index(name = "idx_ads_day", columnList = "day", unique = true)
})
public class AnalyticsDailyStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate day;

    @Column(nullable = false)
    private long totalVisits = 0;

    @Column(nullable = false)
    private long uniqueVisitors = 0;

    @Column(nullable = false)
    private long newVisitors = 0;

    @Column(nullable = false)
    private long returningVisitors = 0;

    @Column(nullable = false)
    private long pageViews = 0;

    @Column(nullable = false)
    private long sessions = 0;

    @Column(nullable = false)
    private long bounces = 0;

    @Column(nullable = false)
    private long avgSessionSeconds = 0;

    @Column(nullable = false)
    private long orders = 0;

    @Column(nullable = false)
    private double revenue = 0;

    @Lob
    private String topPagesJson;

    @Lob
    private String topProductsJson;

    @Lob
    private String referrersJson;

    @Lob
    private String devicesJson;

    @Lob
    private String countriesJson;

    public Long getId() { return id; }

    public LocalDate getDay() { return day; }
    public void setDay(LocalDate day) { this.day = day; }

    public long getTotalVisits() { return totalVisits; }
    public void setTotalVisits(long totalVisits) { this.totalVisits = totalVisits; }

    public long getUniqueVisitors() { return uniqueVisitors; }
    public void setUniqueVisitors(long uniqueVisitors) { this.uniqueVisitors = uniqueVisitors; }

    public long getNewVisitors() { return newVisitors; }
    public void setNewVisitors(long newVisitors) { this.newVisitors = newVisitors; }

    public long getReturningVisitors() { return returningVisitors; }
    public void setReturningVisitors(long returningVisitors) { this.returningVisitors = returningVisitors; }

    public long getPageViews() { return pageViews; }
    public void setPageViews(long pageViews) { this.pageViews = pageViews; }

    public long getSessions() { return sessions; }
    public void setSessions(long sessions) { this.sessions = sessions; }

    public long getBounces() { return bounces; }
    public void setBounces(long bounces) { this.bounces = bounces; }

    public long getAvgSessionSeconds() { return avgSessionSeconds; }
    public void setAvgSessionSeconds(long avgSessionSeconds) { this.avgSessionSeconds = avgSessionSeconds; }

    public long getOrders() { return orders; }
    public void setOrders(long orders) { this.orders = orders; }

    public double getRevenue() { return revenue; }
    public void setRevenue(double revenue) { this.revenue = revenue; }

    public String getTopPagesJson() { return topPagesJson; }
    public void setTopPagesJson(String topPagesJson) { this.topPagesJson = topPagesJson; }

    public String getTopProductsJson() { return topProductsJson; }
    public void setTopProductsJson(String topProductsJson) { this.topProductsJson = topProductsJson; }

    public String getReferrersJson() { return referrersJson; }
    public void setReferrersJson(String referrersJson) { this.referrersJson = referrersJson; }

    public String getDevicesJson() { return devicesJson; }
    public void setDevicesJson(String devicesJson) { this.devicesJson = devicesJson; }

    public String getCountriesJson() { return countriesJson; }
    public void setCountriesJson(String countriesJson) { this.countriesJson = countriesJson; }
}
