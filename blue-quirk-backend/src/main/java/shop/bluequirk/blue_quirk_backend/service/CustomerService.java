package shop.bluequirk.blue_quirk_backend.service;

import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import shop.bluequirk.blue_quirk_backend.domain.OrderStatus;
import shop.bluequirk.blue_quirk_backend.dto.CustomerDetailResponse;
import shop.bluequirk.blue_quirk_backend.dto.CustomerResponse;
import shop.bluequirk.blue_quirk_backend.dto.OrderResponse;
import shop.bluequirk.blue_quirk_backend.entity.Customer;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.repository.CustomerRepository;
import shop.bluequirk.blue_quirk_backend.repository.OrderRepository;

/**
 * Owns the Customer record — the email-keyed identity that all orders link to,
 * independent of whether the person ever creates a login. Also builds the
 * admin-facing aggregates (orders count, total spent, first/last order).
 */
@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    public CustomerService(CustomerRepository customerRepository, OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Reuses the customer with this email or creates a new one. Always refreshes
     * the latest contact/shipping details, and links the login account when the
     * checkout was authenticated (a previously-guest customer gets adopted).
     */
    @Transactional
    public Customer findOrCreateByEmail(String email, String firstName, String lastName,
                                        String phone, String address, String city,
                                        String postalCode, User userAccount) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        String normalized = email.trim();

        Customer customer = customerRepository.findByEmailIgnoreCase(normalized)
                .orElseGet(Customer::new);
        if (customer.getId() == null) {
            customer.setEmail(normalized);
        }

        if (notBlank(firstName)) customer.setFirstName(firstName.trim());
        if (notBlank(lastName)) customer.setLastName(lastName.trim());
        if (notBlank(phone)) customer.setPhone(phone.trim());
        if (notBlank(address)) customer.setAddress(address.trim());
        if (notBlank(city)) customer.setCity(city.trim());
        if (notBlank(postalCode)) customer.setPostalCode(postalCode.trim());
        // Adopt the login account if we have one and none was linked before.
        if (userAccount != null && customer.getUserAccount() == null) {
            customer.setUserAccount(userAccount);
        }

        return customerRepository.save(customer);
    }

    /** Looks up an existing customer by email (no creation). */
    @Transactional(readOnly = true)
    public java.util.Optional<Customer> findByEmail(String email) {
        if (email == null || email.isBlank()) return java.util.Optional.empty();
        return customerRepository.findByEmailIgnoreCase(email.trim());
    }

    /**
     * Whether an order for this email would be the customer's first: true when no
     * customer exists yet, or an existing customer has no orders. Drives the
     * FIRST_ORDER_ONLY coupon rule.
     */
    @Transactional(readOnly = true)
    public boolean isFirstOrderForEmail(String email) {
        return findByEmail(email)
                .map(c -> orderRepository.countByCustomerId(c.getId()) == 0)
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::toSummary)
                .sorted(Comparator.comparing(
                        CustomerResponse::lastOrderDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerDetailResponse getCustomerDetail(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        List<Order> orders = orderRepository.findByCustomerIdOrderByOrderDateDesc(id);
        List<OrderResponse> orderDtos = orders.stream().map(OrderResponse::from).toList();
        return new CustomerDetailResponse(
                toSummary(customer, orders),
                customer.getAddress(),
                customer.getPostalCode(),
                orderDtos);
    }

    private CustomerResponse toSummary(Customer c) {
        return toSummary(c, orderRepository.findByCustomerIdOrderByOrderDateDesc(c.getId()));
    }

    private CustomerResponse toSummary(Customer c, List<Order> orders) {
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        double spent = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .mapToDouble(Order::getTotal)
                .sum();
        var dates = orders.stream()
                .map(Order::getOrderDate)
                .filter(d -> d != null)
                .toList();
        String first = dates.stream().min(Comparator.naturalOrder()).map(d -> d.format(fmt)).orElse(null);
        String last = dates.stream().max(Comparator.naturalOrder()).map(d -> d.format(fmt)).orElse(null);

        return new CustomerResponse(
                c.getId(),
                c.getEmail(),
                c.getFirstName(),
                c.getLastName(),
                c.getPhone(),
                c.getCity(),
                c.isGuest(),
                orders.size(),
                spent,
                first,
                last,
                c.getCreatedAt() != null ? c.getCreatedAt().format(fmt) : null);
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
