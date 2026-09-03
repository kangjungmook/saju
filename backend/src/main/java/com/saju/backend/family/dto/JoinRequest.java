package com.saju.backend.family.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record JoinRequest(@NotBlank @Pattern(regexp = "\\d{6}") String code) {
}
