package shop.bluequirk.blue_quirk_backend.identity.user;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin user directory (replaces the Keycloak-backed Identity Service user CRUD).
 * Admin-only both by the SecurityConfig default rule and an explicit @PreAuthorize.
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasAuthority('admin')")
public class AdminUserController {

    private final UserAdminService userAdminService;

    public AdminUserController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    public ResponseEntity<List<AdminUserView>> list() {
        return ResponseEntity.ok(userAdminService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserView> get(@PathVariable Long id) {
        return ResponseEntity.ok(userAdminService.getById(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<AdminUserView> update(@PathVariable Long id, @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(userAdminService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userAdminService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
