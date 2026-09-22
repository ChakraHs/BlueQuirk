package shop.bluequirk.blue_quirk_backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import shop.bluequirk.blue_quirk_backend.analytics.support.DateRange;
import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.OrderTimeseriesResponse;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository.OrderDateStatus;

/** Bucketing, per-status counts and — crucially — zero-fill for the dashboard chart. */
class OrderStatsServiceTest {

    private OrderRepository repository;
    private OrderStatsService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(OrderRepository.class);
        service = new OrderStatsService(repository);
    }

    private OrderDateStatus row(LocalDateTime when, OrderStatus status) {
        return new OrderDateStatus() {
            public LocalDateTime getOrderDate() { return when; }
            public OrderStatus getStatus() { return status; }
        };
    }

    @Test
    void daily_zeroFillsEmptyDays_andCountsPerStatus() {
        when(repository.findDateStatusBetween(any(), any())).thenReturn(List.of(
                row(LocalDateTime.of(2026, 9, 1, 10, 0), OrderStatus.DELIVERED),
                row(LocalDateTime.of(2026, 9, 1, 14, 0), OrderStatus.CANCELLED),
                row(LocalDateTime.of(2026, 9, 3, 9, 0), OrderStatus.CONFIRMED)));

        OrderTimeseriesResponse res = service.timeseries(
                DateRange.of("custom", "2026-09-01", "2026-09-07"),
                OrderStatsService.Granularity.DAY);

        // 7 days present even though only 2 had orders (zero-fill).
        assertThat(res.buckets()).hasSize(7);
        assertThat(res.granularity()).isEqualTo("day");

        OrderTimeseriesResponse.Bucket d1 = res.buckets().get(0);
        assertThat(d1.period()).isEqualTo("2026-09-01");
        assertThat(d1.all()).isEqualTo(2);
        assertThat(d1.delivered()).isEqualTo(1);
        assertThat(d1.cancelled()).isEqualTo(1);

        // Empty day still present with zeros.
        OrderTimeseriesResponse.Bucket d2 = res.buckets().get(1);
        assertThat(d2.period()).isEqualTo("2026-09-02");
        assertThat(d2.all()).isZero();

        OrderTimeseriesResponse.Bucket d3 = res.buckets().get(2);
        assertThat(d3.all()).isEqualTo(1);
        assertThat(d3.confirmed()).isEqualTo(1);
    }

    @Test
    void weekly_bucketsByMondayWeekStart() {
        when(repository.findDateStatusBetween(any(), any())).thenReturn(List.of(
                // 2026-09-01 is a Tuesday → week starts Mon 2026-08-31.
                row(LocalDateTime.of(2026, 9, 1, 10, 0), OrderStatus.DELIVERED),
                row(LocalDateTime.of(2026, 9, 2, 10, 0), OrderStatus.DELIVERED)));

        OrderTimeseriesResponse res = service.timeseries(
                DateRange.of("custom", "2026-09-01", "2026-09-07"),
                OrderStatsService.Granularity.WEEK);

        assertThat(res.granularity()).isEqualTo("week");
        assertThat(res.buckets().get(0).period()).isEqualTo("2026-08-31"); // Monday
        assertThat(res.buckets().get(0).all()).isEqualTo(2);
    }

    @Test
    void monthly_bucketsByYearMonth_andZeroFillsGapMonths() {
        when(repository.findDateStatusBetween(any(), any())).thenReturn(List.of(
                row(LocalDateTime.of(2026, 7, 15, 10, 0), OrderStatus.DELIVERED),
                row(LocalDateTime.of(2026, 9, 20, 10, 0), OrderStatus.PENDING)));

        OrderTimeseriesResponse res = service.timeseries(
                DateRange.of("custom", "2026-07-01", "2026-09-30"),
                OrderStatsService.Granularity.MONTH);

        // July, August (empty), September all present.
        assertThat(res.buckets()).extracting(OrderTimeseriesResponse.Bucket::period)
                .containsExactly("2026-07", "2026-08", "2026-09");
        assertThat(res.buckets().get(0).delivered()).isEqualTo(1);
        assertThat(res.buckets().get(1).all()).isZero(); // August zero-filled
        assertThat(res.buckets().get(2).pending()).isEqualTo(1);
    }
}
