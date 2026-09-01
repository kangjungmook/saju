package com.saju.backend.family.dto;

import java.util.Map;

public record MemberResponse(String userId, String nickname, boolean isMe, Map<String, Object> chart) {
}
