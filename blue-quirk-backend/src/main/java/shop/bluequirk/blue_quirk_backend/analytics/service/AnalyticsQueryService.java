package shop.bluequirk.blue_quirk_backend.analytics.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.analytics.domain.EventType;
import shop.bluequirk.blue_quirk_backend.analytics.dto.CountriesResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.DevicesResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.LabelCount;
import shop.bluequirk.blue_quirk_backend.analytics.dto.OverviewResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.OverviewResponse.DayStat;
import shop.bluequirk.blue_quirk_backend.analytics.dto.OverviewResponse.TrafficOverview;
import shop.bluequirk.blue_quirk_backend.analytics.dto.PageStatResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.PageStatRow;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductEventRow;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductStatResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductViewRow;
import shop.bluequirk.blue_quirk_backend.analytics.dto.TrafficResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.TrafficResponse.JourneyPath;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsEventRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsOrderStatsRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsPageViewRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsSessionRepository;
import shop.bluequirk.blue_quirk_backend.analytics.support.DateRange;
import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.entity.Product;
import shop.bluequirk.blue_quirk_backend.repository.ProductRepository;

/**
 * Read side of the analytics module: turns the raw tables into the shapes the
 * dashboard consumes. Everything is computed with indexed aggregation queries
 * over the requested window; nothing scans full tables. Read-only transactions
 * so lazy product images can be resolved with {@code open-in-view=false}.
 */
@Service
public class AnalyticsQueryService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final int TOP_LIMIT = 20;

    private final AnalyticsSessionRepository sessionRepo;
    private final AnalyticsPageViewRepository pageViewRepo;
    private final AnalyticsEventRepository eventRepo;
    private final AnalyticsOrderStatsRepository orderStatsRepo;
    private final ProductRepository productRepo;

    public AnalyticsQueryService(AnalyticsSessionRepository sessionRepo,
                                 AnalyticsPageViewRepository pageViewRepo,
                                 AnalyticsEventRepository eventRepo,
                                 AnalyticsOrderStatsRepository orderStatsRepo,
                                 ProductRepository productRepo) {
        this.sessionRepo = sessionRepo;
        this.pageViewRepo = pageViewRepo;
        this.eventRepo = eventRepo;
        this.orderStatsRepo = orderStatsRepo;
        this.productRepo = productRepo;
    }

    // ---------------------------------------------------------------- overview

    @Transactional(readOnly = true)
    public OverviewResponse overview(DateRange range) {
        long visits = sessionRepo.countByStartedAtBetween(range.from(), range.to());
        long uniques = sessionRepo.countUniqueVisitors(range.from(), range.to());
        long newVisitors = sessionRepo.countNewVisitors(range.from(), range.to());
        long returning = Math.max(0, uniques - newVisitors);
        long pageViews = pageViewRepo.countByCreatedAtBetween(range.from(), range.to());
        long bounces = sessionRepo.countBounces(range.from(), range.to());
        double avgSession = sessionRepo.avgDurationSeconds(range.from(), range.to());
        long orders = orderStatsRepo.countOrders(range.fromLocal(), range.toLocal());

        double bounceRate = visits == 0 ? 0 : pct(bounces, visits);
        double conversion = visits == 0 ? 0 : pct(orders, visits);

        long prevVisits = sessionRepo.countByStartedAtBetween(range.prevFrom(), range.prevTo());
        double growth = growthPct(visits, prevVisits);

        long online = sessionRepo.countByLastActivityAtAfter(Instant.now().minus(Duration.ofMinutes(5)));

        return new OverviewResponse(
                visits, uniques, newVisitors, returning, pageViews,
                round(avgSession), round(bounceRate), round(conversion),
                round(growth), online,
                trafficOverview(),
                buildSeries(range));
    }

    private TrafficOverview trafficOverview() {
        Instant now = Instant.now();
        long today = sessionRepo.countByStartedAtBetween(DateRange.startOfToday(), now);
        long yesterday = sessionRepo.countByStartedAtBetween(DateRange.startOfYesterday(), DateRange.startOfToday());
        long week = sessionRepo.countByStartedAtBetween(DateRange.startOfWeek(), now);
        long month = sessionRepo.countByStartedAtBetween(DateRange.startOfMonth(), now);
        long lastMonth = sessionRepo.countByStartedAtBetween(DateRange.startOfLastMonth(), DateRange.startOfMonth());
        return new TrafficOverview(today, yesterday, week, month, lastMonth, round(growthPct(month, lastMonth)));
    }

    /** Dense daily series (zero-filled) merging visits, page views and sales. */
    private List<DayStat> buildSeries(DateRange range) {
        Map<String, long[]> visitByDay = new HashMap<>();   // [visits, uniques]
        for (Object[] r : sessionRepo.dailyVisits(range.from(), range.to())) {
            visitByDay.put((String) r[0], new long[] { asLong(r[1]), asLong(r[2]) });
        }
        Map<String, Long> pvByDay = new HashMap<>();
        for (Object[] r : pageViewRepo.dailyPageViews(range.from(), range.to())) {
            pvByDay.put((String) r[0], asLong(r[1]));
        }
        Map<String, double[]> salesByDay = new HashMap<>(); // [orders, revenue]
        for (Object[] r : orderStatsRepo.dailySales(range.fromLocal(), range.toLocal())) {
            salesByDay.put((String) r[0], new double[] { asLong(r[1]), asDouble(r[2]) });
        }

        List<DayStat> out = new ArrayList<>();
        LocalDate d = range.from().atZone(ZONE).toLocalDate();
        LocalDate end = range.to().atZone(ZONE).toLocalDate();
        while (d.isBefore(end)) {
            String key = d.format(DAY);
            long[] v = visitByDay.getOrDefault(key, new long[] { 0, 0 });
            double[] s = salesByDay.getOrDefault(key, new double[] { 0, 0 });
            out.add(new DayStat(key, v[0], v[1], pvByDay.getOrDefault(key, 0L),
                    (long) s[0], round(s[1])));
            d = d.plusDays(1);
        }
        return out;
    }

    // ------------------------------------------------------------------- pages

    @Transactional(readOnly = true)
    public List<PageStatResponse> pages(DateRange range) {
        Map<String, Long> landings = toMap(sessionRepo.landingsByPath(range.from(), range.to()));
        Map<String, Long> landingBounces = toMap(sessionRepo.landingBouncesByPath(range.from(), range.to()));
        Map<String, Long> exits = toMap(sessionRepo.exitsByPath(range.from(), range.to()));

        List<PageStatResponse> out = new ArrayList<>();
        for (PageStatRow row : pageViewRepo.pageStats(range.from(), range.to())) {
            long landing = landings.getOrDefault(row.path(), 0L);
            long lb = landingBounces.getOrDefault(row.path(), 0L);
            double bounce = landing == 0 ? 0 : pct(lb, landing);
            double exit = row.views() == 0 ? 0 : pct(exits.getOrDefault(row.path(), 0L), row.views());
            double avgSeconds = row.avgDurationMs() == null ? 0 : row.avgDurationMs() / 1000.0;
            out.add(new PageStatResponse(row.path(), row.pageType().name(), row.views(),
                    row.uniqueViews(), round(avgSeconds), round(bounce), round(exit)));
        }
        return out;
    }

    // ---------------------------------------------------------------- products

    @Transactional(readOnly = true)
    public List<ProductStatResponse> products(DateRange range) {
        Map<Long, long[]> agg = new LinkedHashMap<>(); // [views, uniqueViews, addToCart, buyNow, wishlist, purchases]

        for (ProductViewRow v : pageViewRepo.productViews(range.from(), range.to())) {
            row(agg, v.productId())[0] = v.views();
            row(agg, v.productId())[1] = v.uniqueViews();
        }
        for (ProductEventRow e : eventRepo.productEventCounts(range.from(), range.to())) {
            long[] a = row(agg, e.productId());
            if (e.type() == EventType.ADD_TO_CART) a[2] = e.count();
            else if (e.type() == EventType.BEGIN_CHECKOUT) a[3] = e.count();
            else if (e.type() == EventType.WISHLIST_ADD) a[4] = e.count();
        }
        for (Object[] r : orderStatsRepo.productPurchases(range.fromLocal(), range.toLocal())) {
            row(agg, asLong(r[0]))[5] = asLong(r[1]);
        }

        Map<Long, Product> products = loadProducts(agg.keySet());

        List<ProductStatResponse> out = new ArrayList<>();
        for (Map.Entry<Long, long[]> e : agg.entrySet()) {
            long[] a = e.getValue();
            Product p = products.get(e.getKey());
            double conv = a[1] == 0 ? 0 : pct(a[5], a[1]); // purchases / unique views
            out.add(new ProductStatResponse(
                    e.getKey(),
                    p != null ? p.getName() : ("#" + e.getKey()),
                    imageOf(p),
                    a[0], a[1], a[2], a[3], a[3], a[5], a[4], round(conv)));
        }
        out.sort((x, y) -> Long.compare(y.views(), x.views()));
        return out;
    }

    // ----------------------------------------------------------------- traffic

    @Transactional(readOnly = true)
    public TrafficResponse traffic(DateRange range) {
        return new TrafficResponse(
                LabelCount.fromEnumRows(sessionRepo.referrerBreakdown(range.from(), range.to())),
                topJourneys(range));
    }

    /** Reconstruct ordered page-type paths per session and rank the common ones. */
    private List<JourneyPath> topJourneys(DateRange range) {
        Map<String, List<String>> bySession = new LinkedHashMap<>();
        for (Object[] step : pageViewRepo.journeySteps(range.from(), range.to())) {
            String sid = String.valueOf(step[0]);
            String type = String.valueOf(step[1]);
            bySession.computeIfAbsent(sid, k -> new ArrayList<>()).add(type);
        }
        Map<String, Long> counts = new HashMap<>();
        for (List<String> steps : bySession.values()) {
            List<String> collapsed = new ArrayList<>();
            for (String s : steps) {
                if (collapsed.isEmpty() || !collapsed.get(collapsed.size() - 1).equals(s)) {
                    collapsed.add(s);
                }
                if (collapsed.size() >= 5) break; // cap path length
            }
            if (collapsed.isEmpty()) continue;
            String path = String.join(" → ", collapsed);
            counts.merge(path, 1L, Long::sum);
        }
        return counts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(12)
                .map(en -> new JourneyPath(en.getKey(), en.getValue()))
                .toList();
    }

    // --------------------------------------------------------------- countries

    @Transactional(readOnly = true)
    public CountriesResponse countries(DateRange range) {
        return new CountriesResponse(
                limit(sessionRepo.countryBreakdown(range.from(), range.to())),
                limit(sessionRepo.cityBreakdown(range.from(), range.to())));
    }

    // ----------------------------------------------------------------- devices

    @Transactional(readOnly = true)
    public DevicesResponse devices(DateRange range) {
        return new DevicesResponse(
                LabelCount.fromEnumRows(sessionRepo.deviceBreakdown(range.from(), range.to())),
                limit(sessionRepo.browserBreakdown(range.from(), range.to())),
                limit(sessionRepo.osBreakdown(range.from(), range.to())),
                limit(sessionRepo.screenBreakdown(range.from(), range.to())));
    }

    // ------------------------------------------------------------------ helpers

    private Map<Long, Product> loadProducts(Iterable<Long> ids) {
        Map<Long, Product> map = new HashMap<>();
        for (Product p : productRepo.findAllById(ids)) {
            map.put(p.getId(), p);
        }
        return map;
    }

    private String imageOf(Product p) {
        if (p == null || p.getImages() == null || p.getImages().isEmpty()) return null;
        Image chosen = p.getImages().stream().filter(Image::isPrimary).findFirst()
                .orElse(p.getImages().iterator().next());
        return chosen.getThumbnailUrl() != null ? chosen.getThumbnailUrl() : chosen.getUrl();
    }

    private long[] row(Map<Long, long[]> agg, Long id) {
        return agg.computeIfAbsent(id, k -> new long[6]);
    }

    private Map<String, Long> toMap(List<LabelCount> list) {
        Map<String, Long> m = new HashMap<>();
        for (LabelCount lc : list) {
            if (lc.label() != null) m.put(lc.label(), lc.count());
        }
        return m;
    }

    private List<LabelCount> limit(List<LabelCount> list) {
        return list.size() > TOP_LIMIT ? list.subList(0, TOP_LIMIT) : list;
    }

    private static long asLong(Object o) {
        return o instanceof Number n ? n.longValue() : 0L;
    }

    private static double asDouble(Object o) {
        return o instanceof Number n ? n.doubleValue() : 0.0;
    }

    private static double pct(long part, long whole) {
        return whole == 0 ? 0 : (part * 100.0) / whole;
    }

    private static double growthPct(long current, long previous) {
        if (previous == 0) return current == 0 ? 0 : 100.0;
        return ((current - previous) * 100.0) / previous;
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
