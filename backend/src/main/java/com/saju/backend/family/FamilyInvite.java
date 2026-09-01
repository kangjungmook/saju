package com.saju.backend.family;

import jakarta.persistence.*;
import java.time.Instant;

/** 6-digit code, 24h expiry, single use — per the handoff §4 note for 06·07. */
@Entity
@Table(name = "family_invite", uniqueConstraints = @UniqueConstraint(columnNames = "code"))
public class FamilyInvite {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String groupId;

  @Column(nullable = false, length = 6)
  private String code;

  @Column(nullable = false)
  private Instant expiresAt;

  @Column(nullable = false)
  private boolean used = false;

  protected FamilyInvite() {
  }

  public FamilyInvite(String groupId, String code, Instant expiresAt) {
    this.groupId = groupId;
    this.code = code;
    this.expiresAt = expiresAt;
  }

  public String getId() {
    return id;
  }

  public String getGroupId() {
    return groupId;
  }

  public String getCode() {
    return code;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public boolean isUsed() {
    return used;
  }

  public void markUsed() {
    this.used = true;
  }

  public boolean isValid() {
    return !used && expiresAt.isAfter(Instant.now());
  }
}
