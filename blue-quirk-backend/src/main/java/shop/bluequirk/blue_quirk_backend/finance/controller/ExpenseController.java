package shop.bluequirk.blue_quirk_backend.finance.controller;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.finance.dto.ExpenseRequest;
import shop.bluequirk.blue_quirk_backend.finance.dto.ExpenseResponse;
import shop.bluequirk.blue_quirk_backend.finance.service.ExpenseService;

/**
 * Admin expenses ledger. Under {@code /api/admin/**} → admin-only (SecurityConfig
 * fail-closed). Feeds the "real profit after expenses" figures in the finance
 * reports.
 */
@RestController
@RequestMapping("/api/admin/expenses")
public class ExpenseController {

    private final ExpenseService service;

    public ExpenseController(ExpenseService service) {
        this.service = service;
    }

    @GetMapping
    public List<ExpenseResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.list(from, to);
    }

    @PostMapping
    public ExpenseResponse create(@RequestBody ExpenseRequest req, Principal principal) {
        return service.create(req, principal != null ? principal.getName() : null);
    }

    @PutMapping("/{id}")
    public ExpenseResponse update(@PathVariable Long id, @RequestBody ExpenseRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
