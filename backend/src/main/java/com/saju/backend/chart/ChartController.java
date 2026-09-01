package com.saju.backend.chart;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/charts")
public class ChartController {

  private final ChartRepository chartRepository;

  public ChartController(ChartRepository chartRepository) {
    this.chartRepository = chartRepository;
  }

  /** Upserts the client-computed Chart (see mobile src/lib/bazi) for the signed-in user. */
  @PostMapping
  public Map<String, Object> save(@RequestBody Map<String, Object> payload, Principal principal) {
    Object idObj = payload.get("id");
    if (!(idObj instanceof String id) || id.isBlank()) {
      throw new IllegalArgumentException("chart.id가 필요해요.");
    }
    String userId = principal.getName();
    ChartRecord record = chartRepository.findById(id).orElse(new ChartRecord(id, userId, payload));
    if (!record.getUserId().equals(userId)) {
      throw new IllegalArgumentException("본인 소유의 사주 정보만 저장할 수 있어요.");
    }
    record.setData(payload);
    chartRepository.save(record);
    return record.getData();
  }

  @GetMapping("/me")
  public ResponseEntity<Map<String, Object>> me(Principal principal) {
    return chartRepository.findFirstByUserIdOrderByUpdatedAtDesc(principal.getName())
        .map(r -> ResponseEntity.ok(r.getData()))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}
