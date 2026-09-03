package com.saju.backend.family;

import jakarta.persistence.*;
import java.time.Instant;

/** A flat group — every member sees every other member's chart, per the handoff §4 note for 06·07. */
@Entity
@Table(name = "family_group")
public class FamilyGroup {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String createdByUserId;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  protected FamilyGroup() {
  }

  public FamilyGroup(String createdByUserId) {
    this.createdByUserId = createdByUserId;
  }

  public String getId() {
    return id;
  }

  public String getCreatedByUserId() {
    return createdByUserId;
  }
}
