package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shop.bluequirk.blue_quirk_backend.entity.Order;
import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    public Order createOrder(@RequestBody Order order) {
        return orderService.saveOrder(order);
    }
    
    @GetMapping
    public ResponseEntity<List<Order>> getAllUsers() {
        List<Order> orders = orderService.getAllOrders();
        int total = orders.size();

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range", "products 0-" + (total - 1) + "/" + total);
        headers.add("Access-Control-Expose-Headers", "Content-Range");

        return ResponseEntity.ok().headers(headers).body(orders);
    }
    

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public List<Order> getOrdersByUser(@PathVariable Long userId) {
        return orderService.getOrdersByUserId(userId);
    }

    @DeleteMapping("/{id}")
    public void deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
    }
}
