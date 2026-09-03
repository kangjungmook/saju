package com.saju.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Native iOS/Android requests aren't subject to CORS — this only matters for the
 * Expo web preview (`expo start --web`) and any future web build. Defaults to
 * localhost so local dev works out of the box; override app.cors.allowed-origins
 * with the real web origin(s) once one is deployed.
 */
@Configuration
public class CorsConfig {

  @Value("${app.cors.allowed-origins:http://localhost:*,http://127.0.0.1:*}")
  private List<String> allowedOriginPatterns;

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOriginPatterns(allowedOriginPatterns);
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
