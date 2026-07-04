package shop.bluequirk.blue_quirk_backend.analytics.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.analytics.dto.CountriesResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.DevicesResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.OverviewResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.PageStatResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.ProductStatResponse;
import shop.bluequirk.blue_quirk_backend.analytics.dto.TrafficResponse;
import shop.bluequirk.blue_quirk_backend.analytics.service.AnalyticsQueryService;
import shop.bluequirk.blue_quirk_backend.analytics.support.DateRange;

/**
 * Admin read API backing the analytics dashboard. Every endpoint accepts the same
 * filter params ({@code range} = today|yesterday|7d|30d|90d|year|custom, plus
 * {@code from}/{@code to} for custom) and returns pre-shaped DTOs — no raw
 * visitor ids or IP hashes are ever exposed.
 *
 * <p>NOTE: these follow the codebase's current open security posture
 * ({@code SecurityConfig} permits {@code /**}). When that is tightened, guard this
 * whole controller with {@code @PreAuthorize("hasRole('ADMIN')")}.
 */
@RestController
@RequestMapping("/api/admin/analytics")
public class AnalyticsAdminController {

    private final AnalyticsQueryService queryService;

    public AnalyticsAdminController(AnalyticsQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/overview")
    public OverviewResponse overview(@RequestParam(required = false) String range,
                                     @RequestParam(required = false) String from,
                                     @RequestParam(required = false) String to) {
        return queryService.overview(DateRange.of(range, from, to));
    }

    @GetMapping("/pages")
    public List<PageStatResponse> pages(@RequestParam(required = false) String range,
                                        @RequestParam(required = false) String from,
                                        @RequestParam(required = false) String to) {
        return queryService.pages(DateRange.of(range, from, to));
    }

    @GetMapping("/products")
    public List<ProductStatResponse> products(@RequestParam(required = false) String range,
                                              @RequestParam(required = false) String from,
                                              @RequestParam(required = false) String to) {
        return queryService.products(DateRange.of(range, from, to));
    }

    @GetMapping("/traffic")
    public TrafficResponse traffic(@RequestParam(required = false) String range,
                                   @RequestParam(required = false) String from,
                                   @RequestParam(required = false) String to) {
        return queryService.traffic(DateRange.of(range, from, to));
    }

    @GetMapping("/countries")
    public CountriesResponse countries(@RequestParam(required = false) String range,
                                       @RequestParam(required = false) String from,
                                       @RequestParam(required = false) String to) {
        return queryService.countries(DateRange.of(range, from, to));
    }

    @GetMapping("/devices")
    public DevicesResponse devices(@RequestParam(required = false) String range,
                                   @RequestParam(required = false) String from,
                                   @RequestParam(required = false) String to) {
        return queryService.devices(DateRange.of(range, from, to));
    }
}
