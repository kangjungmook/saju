package com.saju.backend.chart;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

/**
 * The engine (§3) runs on-device; this row is the sync target so a profile
 * follows the user across devices once they log in — the whole point being
 * asked when this backend was scoped. `data` holds the full client-computed
 * Chart payload (pillars, elements, tenGods, luckCycles, engineVersion) as
 * jsonb, keyed by the client-generated chart id so re-POSTing the same chart
 * upserts rather than duplicates.
 */
@Entity
@Table(name = "chart", indexes = @Index(name = "idx_chart_user", columnList = "userId"))
public class ChartRecord {

  @Id
  private String id;

  @Column(nullable = false)
  private String userId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> data;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  @Column(nullable = false)
  private Instant updatedAt = Instant.now();

  protected ChartRecord() {
  }

  public ChartRecord(String id, String userId, Map<String, Object> data) {
    this.id = id;
    this.userId = userId;
    this.data = data;
  }

  public String getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public Map<String, Object> getData() {
    return data;
  }

  public void setData(Map<String, Object> data) {
    this.data = data;
    this.updatedAt = Instant.now();
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
