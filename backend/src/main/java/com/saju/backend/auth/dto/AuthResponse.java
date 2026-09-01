package com.saju.backend.auth.dto;

public record AuthResponse(String token, String userId, boolean isNewUser) {
}
