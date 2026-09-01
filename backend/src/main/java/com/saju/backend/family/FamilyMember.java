package com.saju.backend.family;

import jakarta.persistence.*;
import java.time.Instant;

/** One user's membership in one group. A user belongs to at most one group at a time. */
@Entity
@Table(name = "family_member", uniqueConstraints = @UniqueConstraint(columnNames = "userId"))
public class FamilyMember {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(nullable = false)
  private String groupId;

  @Column(nullable = false)
  private String userId;

  @Column(nullable = false)
  private Instant joinedAt = Instant.now();

  protected FamilyMember() {
  }

  public FamilyMember(String groupId, String userId) {
    this.groupId = groupId;
    this.userId = userId;
  }

  public String getGroupId() {
    return groupId;
  }

  public String getUserId() {
    return userId;
  }
}
