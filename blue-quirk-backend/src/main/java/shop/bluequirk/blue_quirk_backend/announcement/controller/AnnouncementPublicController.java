package shop.bluequirk.blue_quirk_backend.announcement.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.announcement.dto.AnnouncementBarResponse;
import shop.bluequirk.blue_quirk_backend.announcement.service.AnnouncementService;

/**
 * Public announcement-bar feed for the storefront. Returns the global on/off switch
 * plus the eligible, priority-ordered announcements resolved to the requested
 * language. Read-only and non-secret; the backend has already applied the schedule
 * and active filters so the client renders exactly what it receives (spec §10/§25).
 */
@RestController
@RequestMapping("/api/shop/announcements")
public class AnnouncementPublicController {

    private final AnnouncementService service;

    public AnnouncementPublicController(AnnouncementService service) {
        this.service = service;
    }

    @GetMapping
    public AnnouncementBarResponse bar(@RequestParam(name = "lang", required = false) String lang) {
        return service.bar(lang);
    }
}
