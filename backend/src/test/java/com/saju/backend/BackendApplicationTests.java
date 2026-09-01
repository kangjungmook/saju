package com.saju.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Smoke test: the full Spring context (security chain, JPA metamodel, auth services) wires up cleanly. */
@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

  @Test
  void contextLoads() {
  }
}
