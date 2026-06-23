package shop.bluequirk.blue_quirk_backend.dto;

/**
 * Admin-facing view of a customer with purchase aggregates. {@code guest} is
 * true when no login account is linked. Dates are ISO strings (nullable when the
 * customer has no orders yet).
 */
public record CustomerResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String city,
        boolean guest,
        int totalOrders,
        double totalSpent,
        String firstOrderDate,
        String lastOrderDate,
        String createdAt
) {}
