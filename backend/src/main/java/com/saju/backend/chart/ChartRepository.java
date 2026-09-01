package com.saju.backend.chart;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChartRepository extends JpaRepository<ChartRecord, String> {
  /** One active chart per user for now — family/multi-profile charts are a later scope. */
  Optional<ChartRecord> findFirstByUserIdOrderByUpdatedAtDesc(String userId);
}
