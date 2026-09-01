package com.saju.backend.auth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTClaimsVerifier;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Set;

/**
 * Verifies an Apple `identityToken` against Apple's published JWK set
 * (RemoteJWKSet caches keys and handles rotation), then checks issuer,
 * audience, and expiry — the standard "Sign in with Apple" server flow.
 */
@Service
public class AppleAuthService {

  public record AppleIdentity(String sub, String email) {
  }

  private final ConfigurableJWTProcessor<SecurityContext> processor;

  public AppleAuthService(
      @Value("${app.apple.keys-url}") String keysUrl,
      @Value("${app.apple.issuer}") String issuer,
      @Value("${app.apple.audience}") String audience) throws Exception {
    JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(URI.create(keysUrl).toURL());
    JWSKeySelector<SecurityContext> keySelector = new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);

    DefaultJWTProcessor<SecurityContext> p = new DefaultJWTProcessor<>();
    p.setJWSKeySelector(keySelector);
    p.setJWTClaimsSetVerifier(new DefaultJWTClaimsVerifier<>(
        new JWTClaimsSet.Builder().issuer(issuer).audience(audience).build(),
        Set.of("sub", "exp", "iat")));
    this.processor = p;
  }

  public AppleIdentity verify(String identityToken) {
    try {
      JWTClaimsSet claims = processor.process(identityToken, null);
      return new AppleIdentity(claims.getSubject(), claims.getStringClaim("email"));
    } catch (Exception e) {
      throw new BadCredentialsException("Apple 로그인 토큰을 확인할 수 없어요.", e);
    }
  }
}
