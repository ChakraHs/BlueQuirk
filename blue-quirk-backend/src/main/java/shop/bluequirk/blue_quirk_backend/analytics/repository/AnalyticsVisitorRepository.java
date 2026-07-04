package shop.bluequirk.blue_quirk_backend.analytics.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsVisitor;

public interface AnalyticsVisitorRepository extends JpaRepository<AnalyticsVisitor, Long> {
    Optional<AnalyticsVisitor> findByVisitorId(String visitorId);
}
