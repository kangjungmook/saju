package com.saju.backend.family.dto;

import java.time.Instant;

public record InviteResponse(String code, Instant expiresAt) {
}
