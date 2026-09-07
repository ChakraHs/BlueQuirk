package shop.bluequirk.blue_quirk_backend.announcement.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.announcement.domain.AnnouncementType;
import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementBarResponse;
import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementPublic;
import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementRequest;
import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementResponse;
import shop.bluequirk.blue_quirk_backend.announcement.dto.BarSettings;
import shop.bluequirk.blue_quirk_backend.announcement.entity.Announcement;
import shop.bluequirk.blue_quirk_backend.announcement.repository.AnnouncementRepository;
import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;
import shop.bluequirk.blue_quirk_backend.service.StoreSettingsService;

/**
 * CRUD, ordering, scheduling and public resolution for storefront announcements.
 * The public {@link #bar(String)} method is the single source the storefront reads:
 * it returns the global toggle plus the already-eligible, priority-ordered,
 * language-resolved announcements — so scheduling/visibility is authoritative on the
 * server (spec §10/§25), never decided by the client.
 */
@Service
public class AnnouncementService {

    private static final int MAX_MESSAGE = 300;
    private static final int MAX_LINK_TEXT = 80;

    private final AnnouncementRepository repository;
    private final StoreSettingsService storeSettingsService;

    public AnnouncementService(AnnouncementRepository repository,
                               StoreSettingsService storeSettingsService) {
        this.repository = repository;
        this.storeSettingsService = storeSettingsService;
    }

    // --- Admin CRUD ---

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> list() {
        return repository.findAllByOrderByPriorityAscIdAsc().stream()
                .map(AnnouncementResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AnnouncementResponse get(Long id) {
        return AnnouncementResponse.from(find(id));
    }

    @Transactional
    public AnnouncementResponse create(AnnouncementRequest req, String actorEmail) {
        Announcement a = new Announcement();
        apply(a, req);
        a.setCreatedByEmail(actorEmail);
        a.setUpdatedByEmail(actorEmail);
        return AnnouncementResponse.from(repository.save(a));
    }

    @Transactional
    public AnnouncementResponse update(Long id, AnnouncementRequest req, String actorEmail) {
        Announcement a = find(id);
        apply(a, req);
        a.setUpdatedByEmail(actorEmail);
        return AnnouncementResponse.from(repository.save(a));
    }

    @Transactional
    public AnnouncementResponse setActive(Long id, boolean active, String actorEmail) {
        Announcement a = find(id);
        a.setActive(active);
        a.setUpdatedByEmail(actorEmail);
        return AnnouncementResponse.from(repository.save(a));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found");
        }
        repository.deleteById(id);
    }

    /**
     * Reorders announcements: assigns priority by the position of each id in the
     * given list (index 0 → priority 0). Ids not present are left untouched.
     */
    @Transactional
    public List<AnnouncementResponse> reorder(List<Long> orderedIds, String actorEmail) {
        if (orderedIds == null) return list();
        int priority = 0;
        for (Long id : orderedIds) {
            Announcement a = repository.findById(id).orElse(null);
            if (a == null) continue;
            a.setPriority(priority++);
            a.setUpdatedByEmail(actorEmail);
            repository.save(a);
        }
        return list();
    }

    // --- Global bar settings (stored on StoreSettings) ---

    @Transactional(readOnly = true)
    public BarSettings barSettings() {
        StoreSettings s = storeSettingsService.getOrCreate();
        return new BarSettings(
                s.isAnnouncementBarEnabled(),
                trimToNull(s.getAnnouncementBarBgColor()),
                trimToNull(s.getAnnouncementBarTextColor()),
                normalizeAnimation(s.getAnnouncementBarAnimation()),
                clampRotation(s.getAnnouncementBarRotationSeconds()));
    }

    @Transactional
    public BarSettings updateBarSettings(BarSettings req) {
        StoreSettings s = storeSettingsService.getOrCreate();
        s.setAnnouncementBarEnabled(req.enabled());
        s.setAnnouncementBarBgColor(trimToNull(req.bgColor()));
        s.setAnnouncementBarTextColor(trimToNull(req.textColor()));
        s.setAnnouncementBarAnimation(normalizeAnimation(req.animation()));
        s.setAnnouncementBarRotationSeconds(clampRotation(req.rotationSeconds()));
        storeSettingsService.save(s);
        return barSettings();
    }

    // --- Public (storefront) ---

    @Transactional(readOnly = true)
    public AnnouncementBarResponse bar(String lang) {
        StoreSettings s = storeSettingsService.getOrCreate();
        String animation = normalizeAnimation(s.getAnnouncementBarAnimation());
        int rotation = clampRotation(s.getAnnouncementBarRotationSeconds());
        // Skip the eligibility query entirely when the bar is globally off.
        if (!s.isAnnouncementBarEnabled()) {
            return new AnnouncementBarResponse(false, null, null, animation, rotation, List.of());
        }
        String normalized = normalizeLang(lang);
        List<AnnouncementPublic> items = repository.findEligible(LocalDateTime.now()).stream()
                .map(a -> AnnouncementPublic.from(a, normalized))
                .toList();
        return new AnnouncementBarResponse(true,
                trimToNull(s.getAnnouncementBarBgColor()),
                trimToNull(s.getAnnouncementBarTextColor()),
                animation, rotation, items);
    }

    /** Normalizes the transition style to a known value (default FADE). */
    private String normalizeAnimation(String raw) {
        String v = raw == null ? "" : raw.trim().toUpperCase();
        return switch (v) {
            case "SLIDE", "CAROUSEL", "FADE" -> v;
            default -> "FADE";
        };
    }

    /** Keeps the rotation speed in a sane range (2–30s), defaulting to 5. */
    private int clampRotation(int seconds) {
        if (seconds < 2) return 5;
        return Math.min(seconds, 30);
    }

    // --- Helpers ---

    private Announcement find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));
    }

    /** Validates + copies a request onto an entity (create/update share this). */
    private void apply(Announcement a, AnnouncementRequest req) {
        String fr = trimToNull(req.messageFr());
        require(fr != null, "The French message is required.");
        requireLen(fr, MAX_MESSAGE, "message");
        a.setMessageFr(fr);

        String en = trimToNull(req.messageEn());
        String ar = trimToNull(req.messageAr());
        requireLen(en, MAX_MESSAGE, "English message");
        requireLen(ar, MAX_MESSAGE, "Arabic message");
        a.setMessageEn(en);
        a.setMessageAr(ar);

        a.setType(parseType(req.type()));
        a.setPriority(req.priority() != null ? req.priority() : 0);
        a.setActive(req.active() == null || req.active());
        a.setDismissible(req.dismissible() == null || req.dismissible());
        a.setOpenInNewTab(Boolean.TRUE.equals(req.openInNewTab()));

        LocalDateTime start = parseDateTime(req.startAt());
        LocalDateTime end = parseDateTime(req.endAt());
        if (start != null && end != null && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The end date must be on or after the start date.");
        }
        a.setStartAt(start);
        a.setEndAt(end);

        a.setLink(validateLink(trimToNull(req.link())));
        String ltFr = trimToNull(req.linkTextFr());
        String ltEn = trimToNull(req.linkTextEn());
        String ltAr = trimToNull(req.linkTextAr());
        requireLen(ltFr, MAX_LINK_TEXT, "link text");
        requireLen(ltEn, MAX_LINK_TEXT, "link text");
        requireLen(ltAr, MAX_LINK_TEXT, "link text");
        a.setLinkTextFr(ltFr);
        a.setLinkTextEn(ltEn);
        a.setLinkTextAr(ltAr);

        a.setIcon(trimToNull(req.icon()));
        a.setBgColor(trimToNull(req.bgColor()));
        a.setTextColor(trimToNull(req.textColor()));
        Integer duration = req.displayDuration();
        a.setDisplayDuration(duration != null && duration > 0 ? duration : null);
    }

    /**
     * Only relative paths or http(s) URLs are allowed — this blocks {@code javascript:}
     * and other unsafe schemes from ever reaching an anchor href (spec §25).
     */
    private String validateLink(String link) {
        if (link == null) return null;
        boolean ok = link.startsWith("/")
                || link.startsWith("http://")
                || link.startsWith("https://");
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Link must be a relative path (starting with /) or an http(s) URL.");
        }
        return link;
    }

    private AnnouncementType parseType(String raw) {
        try {
            return raw == null ? AnnouncementType.INFO : AnnouncementType.valueOf(raw.trim());
        } catch (IllegalArgumentException e) {
            return AnnouncementType.INFO;
        }
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            // Accept "2026-09-15T00:00" and "2026-09-15T00:00:00".
            return LocalDateTime.parse(raw.trim().length() == 16 ? raw.trim() + ":00" : raw.trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date/time: " + raw);
        }
    }

    private void requireLen(String v, int max, String field) {
        if (v != null && v.length() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The " + field + " is too long (max " + max + " characters).");
        }
    }

    private void require(boolean cond, String msg) {
        if (!cond) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }

    private String trimToNull(String s) {
        return (s != null && !s.isBlank()) ? s.trim() : null;
    }

    private String normalizeLang(String lang) {
        String l = lang == null ? "" : lang.trim().toLowerCase();
        return (l.equals("en") || l.equals("ar")) ? l : "fr";
    }
}
