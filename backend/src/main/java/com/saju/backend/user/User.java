package com.saju.backend.user;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A single account may be reached via one social login. Per the handoff §2
 * storage rule, personal identity lives only here — deleting this row (with
 * its cascaded Chart) is what "회원탈퇴" ultimately does downstream.
 */
@Entity
@Table(name = "app_user", uniqueConstraints = @UniqueConstraint(columnNames = { "provider", "providerId" }))
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String provider; // kakao | apple | email | guest

  @Column(nullable = false)
  private String providerId;

  private String nickname;
  private String email;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  protected User() {
  }

  public User(String provider, String providerId, String nickname, String email) {
    this.provider = provider;
    this.providerId = providerId;
    this.nickname = nickname;
    this.email = email;
  }

  public String getId() {
    return id;
  }

  public String getProvider() {
    return provider;
  }

  public String getProviderId() {
    return providerId;
  }

  public String getNickname() {
    return nickname;
  }

  public String getEmail() {
    return email;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
