package com.saju.backend.auth;

import com.saju.backend.auth.dto.AuthResponse;
import com.saju.backend.auth.dto.TokenRequest;
import com.saju.backend.security.JwtService;
import com.saju.backend.user.User;
import com.saju.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final KakaoAuthService kakaoAuthService;
  private final AppleAuthService appleAuthService;
  private final UserRepository userRepository;
  private final JwtService jwtService;

  public AuthController(
      KakaoAuthService kakaoAuthService,
      AppleAuthService appleAuthService,
      UserRepository userRepository,
      JwtService jwtService) {
    this.kakaoAuthService = kakaoAuthService;
    this.appleAuthService = appleAuthService;
    this.userRepository = userRepository;
    this.jwtService = jwtService;
  }

  @PostMapping("/kakao")
  public AuthResponse kakao(@Valid @RequestBody TokenRequest req) {
    var identity = kakaoAuthService.verify(req.token());
    return issueFor("kakao", identity.id(), identity.nickname(), identity.email());
  }

  @PostMapping("/apple")
  public AuthResponse apple(@Valid @RequestBody TokenRequest req) {
    var identity = appleAuthService.verify(req.token());
    return issueFor("apple", identity.sub(), null, identity.email());
  }

  /** "먼저 둘러보기" — an anonymous, device-local session; nothing survives a reinstall. */
  @PostMapping("/guest")
  public AuthResponse guest() {
    String deviceId = UUID.randomUUID().toString();
    return issueFor("guest", deviceId, null, null);
  }

  private AuthResponse issueFor(String provider, String providerId, String nickname, String email) {
    var existing = userRepository.findByProviderAndProviderId(provider, providerId);
    User user = existing.orElseGet(() -> userRepository.save(new User(provider, providerId, nickname, email)));
    String token = jwtService.issue(user.getId());
    return new AuthResponse(token, user.getId(), existing.isEmpty());
  }
}
