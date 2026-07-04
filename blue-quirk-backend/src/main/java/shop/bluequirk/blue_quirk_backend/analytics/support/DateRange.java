package shop.bluequirk.blue_quirk_backend.analytics.support;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * Resolves a dashboard filter (today / yesterday / 7d / 30d / 90d / year / custom)
 * into a concrete half-open window {@code [from, to)} plus the immediately
 * preceding window of equal length (for growth %). Day boundaries use the server's
 * local zone so "today" matches the operator's clock; the same window is exposed
 * both as {@link Instant} (for the analytics tables) and {@link LocalDateTime}
 * (for the orders table).
 */
public final class DateRange {

    private static final ZoneId ZONE = ZoneId.systemDefault();

    private final Instant from;
    private final Instant to;
    private final Instant prevFrom;
    private final Instant prevTo;

    private DateRange(Instant from, Instant to) {
        this.from = from;
        this.to = to;
        long len = to.toEpochMilli() - from.toEpochMilli();
        this.prevTo = from;
        this.prevFrom = from.minusMillis(len);
    }

    public static DateRange of(String range, String fromStr, String toStr) {
        LocalDate today = LocalDate.now(ZONE);
        String r = range == null ? "30d" : range.toLowerCase();

        return switch (r) {
            case "today" -> ofDays(today, today.plusDays(1));
            case "yesterday" -> ofDays(today.minusDays(1), today);
            case "7d", "last7", "week" -> ofDays(today.minusDays(6), today.plusDays(1));
            case "30d", "last30", "month" -> ofDays(today.minusDays(29), today.plusDays(1));
            case "90d", "last90" -> ofDays(today.minusDays(89), today.plusDays(1));
            case "year", "thisyear" -> ofDays(today.withDayOfYear(1), today.plusDays(1));
            case "custom" -> ofDays(
                    parseOr(fromStr, today.minusDays(29)),
                    parseOr(toStr, today).plusDays(1));
            default -> ofDays(today.minusDays(29), today.plusDays(1));
        };
    }

    private static DateRange ofDays(LocalDate fromDay, LocalDate toDayExclusive) {
        return new DateRange(
                fromDay.atStartOfDay(ZONE).toInstant(),
                toDayExclusive.atStartOfDay(ZONE).toInstant());
    }

    private static LocalDate parseOr(String s, LocalDate fallback) {
        if (s == null || s.isBlank()) return fallback;
        try {
            return LocalDate.parse(s.trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    public Instant from() { return from; }
    public Instant to() { return to; }
    public Instant prevFrom() { return prevFrom; }
    public Instant prevTo() { return prevTo; }

    public LocalDateTime fromLocal() { return LocalDateTime.ofInstant(from, ZONE); }
    public LocalDateTime toLocal() { return LocalDateTime.ofInstant(to, ZONE); }
    public LocalDateTime prevFromLocal() { return LocalDateTime.ofInstant(prevFrom, ZONE); }
    public LocalDateTime prevToLocal() { return LocalDateTime.ofInstant(prevTo, ZONE); }

    public long days() {
        return Math.max(1, ChronoUnit.DAYS.between(from.atZone(ZONE).toLocalDate(),
                to.atZone(ZONE).toLocalDate()));
    }

    // Fixed-window helpers for the "traffic overview" cards (independent of filter).
    public static Instant startOfToday() { return LocalDate.now(ZONE).atStartOfDay(ZONE).toInstant(); }
    public static Instant startOfYesterday() { return LocalDate.now(ZONE).minusDays(1).atStartOfDay(ZONE).toInstant(); }
    public static Instant startOfWeek() { return LocalDate.now(ZONE).minusDays(6).atStartOfDay(ZONE).toInstant(); }
    public static Instant startOfMonth() { return LocalDate.now(ZONE).withDayOfMonth(1).atStartOfDay(ZONE).toInstant(); }
    public static Instant startOfLastMonth() { return LocalDate.now(ZONE).withDayOfMonth(1).minusMonths(1).atStartOfDay(ZONE).toInstant(); }
    public static Instant now() { return Instant.now(); }
}
