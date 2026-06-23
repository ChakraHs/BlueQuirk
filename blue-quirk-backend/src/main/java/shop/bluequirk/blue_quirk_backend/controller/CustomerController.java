package shop.bluequirk.blue_quirk_backend.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import shop.bluequirk.blue_quirk_backend.dto.CustomerDetailResponse;
import shop.bluequirk.blue_quirk_backend.dto.CustomerResponse;
import shop.bluequirk.blue_quirk_backend.service.CustomerService;

/**
 * Admin customer directory. Customers are email-keyed and exist independently of
 * login accounts (guests included), so this is the authoritative people list for
 * the dashboard — not the Keycloak user directory.
 */
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public ResponseEntity<List<CustomerResponse>> getAll() {
        List<CustomerResponse> customers = customerService.getAllCustomers();
        int total = customers.size();
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range", "customers 0-" + Math.max(0, total - 1) + "/" + total);
        headers.add("Access-Control-Expose-Headers", "Content-Range");
        return ResponseEntity.ok().headers(headers).body(customers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDetailResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerDetail(id));
    }
}
