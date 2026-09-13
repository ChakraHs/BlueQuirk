package shop.bluequirk.blue_quirk_backend.finance.dto;

import java.time.LocalDate;

/**
 * Admin create/update payload for an expense. {@code expenseDate} defaults to today
 * when null. On update, null fields are left unchanged.
 */
public record ExpenseRequest(
        Double amount,
        String category,
        String note,
        LocalDate expenseDate
) {}
