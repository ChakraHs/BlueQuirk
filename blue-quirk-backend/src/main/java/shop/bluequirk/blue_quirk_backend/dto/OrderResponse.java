package shop.bluequirk.blue_quirk_backend.dto;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import shop.bluequirk.blue_quirk_backend.entity.Order;

/** What the API returns for an order (no JPA entities / lazy relations leak out). */
public record OrderResponse(
        Long id,
        String status,
        String paymentMethod,
        String customerName,
        String phone,
        String city,
        String address,
        String note,
        String email,
        double subtotal,
        double shippingFee,
        double total,
        String orderDate,
        List<Item> items
) {
    public record Item(
            Long productId,
            String name,
            String image,
            String variant,
            double unitPrice,
            int quantity,
            double lineTotal
    ) {}

    public static OrderResponse from(Order order) {
        List<Item> items = order.getItems().stream()
                .map(i -> new Item(
                        i.getProductId(), i.getName(), i.getImageUrl(), i.getVariant(),
                        i.getUnitPrice(), i.getQuantity(), i.getLineTotal()))
                .collect(Collectors.toList());

        return new OrderResponse(
                order.getId(),
                order.getStatus() != null ? order.getStatus().name() : null,
                order.getPaymentMethod(),
                order.getCustomerName(),
                order.getPhone(),
                order.getCity(),
                order.getAddress(),
                order.getNote(),
                order.getEmail(),
                order.getSubtotal(),
                order.getShippingFee(),
                order.getTotal(),
                order.getOrderDate() != null
                        ? order.getOrderDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null,
                items
        );
    }
}
