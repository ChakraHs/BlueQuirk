package shop.bluequirk.blue_quirk_backend.finance.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.finance.dto.ExpenseRequest;
import shop.bluequirk.blue_quirk_backend.finance.dto.ExpenseResponse;
import shop.bluequirk.blue_quirk_backend.finance.entity.Expense;
import shop.bluequirk.blue_quirk_backend.finance.repository.ExpenseRepository;

/** CRUD for admin-recorded business expenses (costs). */
@Service
public class ExpenseService {

    private static final int MAX_NOTE = 500;
    private static final int MAX_CATEGORY = 60;

    private final ExpenseRepository repository;

    public ExpenseService(ExpenseRepository repository) {
        this.repository = repository;
    }

    /** All expenses (newest first), optionally within an inclusive date range. */
    @Transactional(readOnly = true)
    public List<ExpenseResponse> list(LocalDate from, LocalDate to) {
        List<Expense> rows = (from != null && to != null)
                ? repository.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
                        from, to.plusDays(1))
                : repository.findAllByOrderByExpenseDateDescIdDesc();
        return rows.stream().map(ExpenseResponse::from).toList();
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest req, String actorEmail) {
        Expense e = new Expense();
        e.setAmount(requireAmount(req.amount()));
        e.setCategory(requireCategory(req.category()));
        e.setNote(clip(trimToNull(req.note()), MAX_NOTE));
        e.setExpenseDate(req.expenseDate() != null ? req.expenseDate() : LocalDate.now());
        e.setCreatedByEmail(actorEmail);
        return ExpenseResponse.from(repository.save(e));
    }

    @Transactional
    public ExpenseResponse update(Long id, ExpenseRequest req) {
        Expense e = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (req.amount() != null) e.setAmount(requireAmount(req.amount()));
        if (req.category() != null && !req.category().isBlank()) e.setCategory(clip(req.category().trim(), MAX_CATEGORY));
        if (req.note() != null) e.setNote(clip(trimToNull(req.note()), MAX_NOTE));
        if (req.expenseDate() != null) e.setExpenseDate(req.expenseDate());
        return ExpenseResponse.from(repository.save(e));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        repository.deleteById(id);
    }

    private double requireAmount(Double v) {
        if (v == null || v <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A positive amount is required.");
        }
        return Math.round(v * 100.0) / 100.0;
    }

    private String requireCategory(String v) {
        String t = trimToNull(v);
        if (t == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A category is required.");
        return clip(t, MAX_CATEGORY);
    }

    private String clip(String v, int max) {
        if (v == null) return null;
        return v.length() > max ? v.substring(0, max) : v;
    }

    private String trimToNull(String s) {
        return (s != null && !s.isBlank()) ? s.trim() : null;
    }
}
