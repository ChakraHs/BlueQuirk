package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsDailyStats;

public interface AnalyticsDailyStatsRepository extends JpaRepository<AnalyticsDailyStats, Long> {
    Optional<AnalyticsDailyStats> findByDay(LocalDate day);
    List<AnalyticsDailyStats> findByDayBetweenOrderByDayAsc(LocalDate from, LocalDate to);
}
