package shop.bluequirk.blue_quirk_backend.analytics.service;

import java.time.Instant;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import shop.bluequirk.blue_quirk_backend.analytics.domain.EventType;
import shop.bluequirk.blue_quirk_backend.analytics.domain.PageType;
import shop.bluequirk.blue_quirk_backend.analytics.dto.EventBatchRequest;
import shop.bluequirk.blue_quirk_backend.analytics.dto.EventBatchRequest.IncomingEvent;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsEvent;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsPageView;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsSession;
import shop.bluequirk.blue_quirk_backend.analytics.entity.AnalyticsVisitor;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsEventRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsPageViewRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsSessionRepository;
import shop.bluequirk.blue_quirk_backend.analytics.repository.AnalyticsVisitorRepository;
import shop.bluequirk.blue_quirk_backend.analytics.support.ClientInfo;
import shop.bluequirk.blue_quirk_backend.analytics.support.PageClassifier;
import shop.bluequirk.blue_quirk_backend.analytics.support.ReferrerClassifier;
import shop.bluequirk.blue_quirk_backend.analytics.support.UserAgentParser;

/**
 * Persists a batch of tracker events off the request thread ({@code @Async}) so
 * the HTTP call returns immediately (the controller responds 204 without waiting
 * on the DB). One batch = one transaction. Session lifecycle is owned here (the
 * server is authoritative): device/referrer/geo are resolved once per session,
 * page views drive bounce/exit, and new-vs-returning is decided by whether the
 * visitor row already existed.
 */
@Service
public class AnalyticsIngestService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsIngestService.class);

    private final AnalyticsVisitorRepository visitorRepo;
    private final AnalyticsSessionRepository sessionRepo;
    private final AnalyticsPageViewRepository pageViewRepo;
    private final AnalyticsEventRepository eventRepo;
    private final UserAgentParser uaParser;
    private final ReferrerClassifier referrerClassifier;
    private final PageClassifier pageClassifier;
    private final GeoLocationService geoService;
    private final ObjectMapper objectMapper;

    public AnalyticsIngestService(AnalyticsVisitorRepository visitorRepo,
                                  AnalyticsSessionRepository sessionRepo,
                                  AnalyticsPageViewRepository pageViewRepo,
                                  AnalyticsEventRepository eventRepo,
                                  UserAgentParser uaParser,
                                  ReferrerClassifier referrerClassifier,
                                  PageClassifier pageClassifier,
                                  GeoLocationService geoService,
                                  ObjectMapper objectMapper) {
        this.visitorRepo = visitorRepo;
        this.sessionRepo = sessionRepo;
        this.pageViewRepo = pageViewRepo;
        this.eventRepo = eventRepo;
        this.uaParser = uaParser;
        this.referrerClassifier = referrerClassifier;
        this.pageClassifier = pageClassifier;
        this.geoService = geoService;
        this.objectMapper = objectMapper;
    }

    /** Request-scoped facts the async worker needs (the HTTP thread is gone by then). */
    public record IngestContext(String ip, String ipHash, String userAgent) {}

    @Async
    @Transactional
    public void ingest(EventBatchRequest batch, IngestContext ctx) {
        try {
            doIngest(batch, ctx);
        } catch (Exception e) {
            // Analytics must never surface errors to callers; log and move on.
            log.warn("Analytics ingest failed: {}", e.getMessage());
        }
    }

    private void doIngest(EventBatchRequest batch, IngestContext ctx) {
        ClientInfo client = uaParser.parse(ctx.userAgent());
        if (client.bot()) {
            return; // silently drop bot traffic
        }
        String visitorId = safe(batch.visitorId());
        String sessionId = safe(batch.sessionId());
        if (visitorId == null || sessionId == null) {
            return; // unattributable
        }

        Instant now = Instant.now();

        // --- visitor (new vs returning) ---
        AnalyticsVisitor visitor = visitorRepo.findByVisitorId(visitorId).orElse(null);
        boolean isNewVisitor = visitor == null;
        if (visitor == null) {
            visitor = new AnalyticsVisitor();
            visitor.setVisitorId(visitorId);
            visitor.setFirstSeen(now);
        }
        visitor.setLastSeen(now);

        // --- session (30-min inactivity handled server-side) ---
        String firstReferrer = batch.events().isEmpty() ? null : batch.events().get(0).referrer();
        String firstPath = firstEventPath(batch);
        AnalyticsSession session = sessionRepo.findBySessionId(sessionId).orElse(null);
        if (session == null) {
            session = newSession(sessionId, visitorId, isNewVisitor, firstReferrer, firstPath,
                    client, batch, ctx, now);
            visitor.setSessionCount(visitor.getSessionCount() + 1);
        } else {
            session.setLastActivityAt(now);
            session.setEndedAt(null); // reopen if the reaper had closed it
        }
        visitorRepo.save(visitor);
        session = sessionRepo.save(session);

        // --- events ---
        for (IncomingEvent ev : batch.events()) {
            if (isIgnoredPath(ev.path())) {
                continue; // never record admin/health traffic
            }
            EventType type = parseType(ev.type());
            if (type == null) {
                continue; // unknown/extensible type not yet mapped — skip safely
            }
            if (type == EventType.PAGE_VIEW) {
                recordPageView(ev, session, visitorId, now);
            } else {
                recordEvent(type, ev, sessionId, visitorId, now);
            }
        }
        sessionRepo.save(session);
    }

    private AnalyticsSession newSession(String sessionId, String visitorId, boolean isNewVisitor,
                                        String referrer, String firstPath, ClientInfo client,
                                        EventBatchRequest batch, IngestContext ctx, Instant now) {
        AnalyticsSession s = new AnalyticsSession();
        s.setSessionId(sessionId);
        s.setVisitorId(visitorId);
        s.setStartedAt(now);
        s.setLastActivityAt(now);
        s.setNewVisitor(isNewVisitor);
        s.setEntryPath(firstPath);
        s.setExitPath(firstPath);
        s.setReferrer(referrer);
        s.setReferrerSource(referrerClassifier.classify(referrer));
        s.setDeviceType(client.deviceType());
        s.setBrowser(client.browser());
        s.setOs(client.os());
        s.setIpHash(ctx.ipHash());
        if (batch.client() != null) {
            s.setScreen(batch.client().screen());
        }
        GeoLocationService.GeoResult geo = geoService.resolve(ctx.ip(), ctx.ipHash());
        s.setCountry(geo.country());
        s.setCity(geo.city());
        return s;
    }

    private void recordPageView(IncomingEvent ev, AnalyticsSession session, String visitorId, Instant now) {
        String normalized = pageClassifier.normalize(ev.path());
        PageType pageType = pageClassifier.classify(normalized);
        Long productId = ev.productId() != null ? ev.productId() : pageClassifier.productId(normalized);

        AnalyticsPageView pv = new AnalyticsPageView();
        pv.setSessionId(session.getSessionId());
        pv.setVisitorId(visitorId);
        pv.setPath(normalized);
        pv.setPageType(pageType);
        pv.setProductId(productId);
        pv.setCreatedAt(now);
        pv.setEntry(session.getPageViewCount() == 0);
        pageViewRepo.save(pv);

        session.setPageViewCount(session.getPageViewCount() + 1);
        if (session.getPageViewCount() > 1) {
            session.setBounce(false);
        }
        session.setExitPath(normalized);
        session.setLastActivityAt(now);
    }

    private void recordEvent(EventType type, IncomingEvent ev, String sessionId, String visitorId, Instant now) {
        AnalyticsEvent e = new AnalyticsEvent();
        e.setType(type);
        e.setSessionId(sessionId);
        e.setVisitorId(visitorId);
        e.setPath(ev.path() != null ? pageClassifier.normalize(ev.path()) : null);
        e.setProductId(ev.productId());
        e.setValue(ev.value());
        e.setMetadata(toJson(ev.meta()));
        e.setCreatedAt(now);
        eventRepo.save(e);
    }

    private String firstEventPath(EventBatchRequest batch) {
        for (IncomingEvent ev : batch.events()) {
            if (ev.path() != null) {
                return pageClassifier.normalize(ev.path());
            }
        }
        return null;
    }

    private boolean isIgnoredPath(String path) {
        if (path == null) return false;
        String p = pageClassifier.normalize(path);
        return p.startsWith("/admin") || p.startsWith("/actuator") || p.equals("/api/hello");
    }

    private EventType parseType(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String norm = raw.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        try {
            return EventType.valueOf(norm);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String toJson(Object meta) {
        if (meta == null) return null;
        try {
            String json = objectMapper.writeValueAsString(meta);
            return json.length() > 4000 ? json.substring(0, 4000) : json;
        } catch (Exception e) {
            return null;
        }
    }

    private String safe(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
