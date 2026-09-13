package shop.bluequirk.blue_quirk_backend.finance.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import shop.bluequirk.blue_quirk_backend.finance.entity.Expense;

/**
 * Expenses store + aggregation for the finance reports. Windows are half-open on
 * the date [{@code from}, {@code to}) to match the order-based finance windows.
 */
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findAllByOrderByExpenseDateDescIdDesc();

    List<Expense> findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
            LocalDate from, LocalDate to);

    /** Total expenses in the half-open date window [from, to). */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e "
            + "WHERE e.expenseDate >= :from AND e.expenseDate < :to")
    double sumBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Per-day expense totals. Row = [day 'YYYY-MM-DD', sum]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(expense_date, '%Y-%m-%d') AS period, COALESCE(SUM(amount), 0) AS total "
            + "FROM expenses WHERE expense_date >= :from AND expense_date < :to "
            + "GROUP BY period ORDER BY period")
    List<Object[]> dailyExpenses(@Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Per-month expense totals. Row = [month 'YYYY-MM', sum]. */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(expense_date, '%Y-%m') AS period, COALESCE(SUM(amount), 0) AS total "
            + "FROM expenses WHERE expense_date >= :from AND expense_date < :to "
            + "GROUP BY period ORDER BY period")
    List<Object[]> monthlyExpenses(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
