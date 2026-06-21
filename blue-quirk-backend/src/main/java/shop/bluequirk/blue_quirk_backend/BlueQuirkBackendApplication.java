package shop.bluequirk.blue_quirk_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BlueQuirkBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BlueQuirkBackendApplication.class, args);
	}

}
