package shop.bluequirk.blue_quirk_backend.finance.dto;

import java.time.LocalDate;

import shop.bluequirk.blue_quirk_backend.finance.entity.Expense;

public record ExpenseResponse(
        Long id,
        double amount,
        String category,
        String note,
        LocalDate expenseDate,
        String createdByEmail
) {
    public static ExpenseResponse from(Expense e) {
        return new ExpenseResponse(
                e.getId(), e.getAmount(), e.getCategory(), e.getNote(),
                e.getExpenseDate(), e.getCreatedByEmail());
    }
}
