package com.saju.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** Verifies a Kakao access token by asking Kakao who it belongs to — Kakao itself is the source of truth. */
@Service
public class KakaoAuthService {

  public record KakaoIdentity(String id, String nickname, String email) {
  }

  private final RestClient restClient = RestClient.create();
  private final String userInfoUrl;

  public KakaoAuthService(@Value("${app.kakao.user-info-url}") String userInfoUrl) {
    this.userInfoUrl = userInfoUrl;
  }

  @SuppressWarnings("unchecked")
  public KakaoIdentity verify(String accessToken) {
    Map<String, Object> body;
    try {
      body = restClient.get()
          .uri(userInfoUrl)
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
          .retrieve()
          .body(Map.class);
    } catch (Exception e) {
      throw new BadCredentialsException("카카오 토큰을 확인할 수 없어요.", e);
    }
    if (body == null || body.get("id") == null) {
      throw new BadCredentialsException("카카오 토큰을 확인할 수 없어요.");
    }
    String id = String.valueOf(body.get("id"));
    Map<String, Object> account = (Map<String, Object>) body.get("kakao_account");
    Map<String, Object> profile = account != null ? (Map<String, Object>) account.get("profile") : null;
    String nickname = profile != null ? (String) profile.get("nickname") : null;
    String email = account != null ? (String) account.get("email") : null;
    return new KakaoIdentity(id, nickname, email);
  }
}
