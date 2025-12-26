package bg.baraba.scanner.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig {
    // Spring Boot auto-configures the async executor from application.yml
    // spring.task.execution.pool.* properties
}
