package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.identity.user.CurrentUserService;
import shop.bluequirk.blue_quirk_backend.service.IntegrationConfigService;
import shop.bluequirk.blue_quirk_backend.service.IntegrationConfigService.IntegrationSettingsView;
import shop.bluequirk.blue_quirk_backend.service.IntegrationConfigService.UpdateIntegrationSettingsRequest;

/**
 * Admin-facing endpoints for third-party service credentials (Cloudflare R2 image
 * storage, Resend email). DB-backed with env fallback, editable from the
 * dashboard without a redeploy. Admin-only via the fail-closed SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/integrations")
public class IntegrationAdminController {

    private final IntegrationConfigService configService;
    private final CurrentUserService currentUserService;

    public IntegrationAdminController(IntegrationConfigService configService,
                                      CurrentUserService currentUserService) {
        this.configService = configService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/settings")
    public IntegrationSettingsView getSettings() {
        return configService.view();
    }

    @PutMapping("/settings")
    public IntegrationSettingsView updateSettings(@RequestBody UpdateIntegrationSettingsRequest req) {
        String actor = null;
        try { actor = currentUserService.require().getEmail(); } catch (Exception ignored) { /* best-effort audit */ }
        return configService.update(req, actor);
    }
}
