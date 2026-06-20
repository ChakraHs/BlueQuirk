package shop.bluequirk.blue_quirk_backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "Hello, authenticated user!";
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('default-roles-blue-quirk-realm')")
    public String adminHello() {
        return "Hello, Admin!";
    }
}
