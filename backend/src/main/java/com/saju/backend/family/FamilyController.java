package com.saju.backend.family;

import com.saju.backend.chart.ChartRepository;
import com.saju.backend.chart.ChartRecord;
import com.saju.backend.family.dto.InvitePreviewResponse;
import com.saju.backend.family.dto.InviteResponse;
import com.saju.backend.family.dto.JoinRequest;
import com.saju.backend.family.dto.MemberResponse;
import com.saju.backend.user.User;
import com.saju.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * A flat group: every member sees every other member's chart (hence day scores,
 * computed client-side same as anywhere else in the app) but not their logs or
 * QnA — per the handoff §4 note for 06·07. One membership per user; any member
 * can mint a new invite for the group they're in.
 */
@RestController
@RequestMapping("/family")
public class FamilyController {

  private static final Duration INVITE_TTL = Duration.ofHours(24);
  private final SecureRandom random = new SecureRandom();

  private final FamilyGroupRepository groupRepository;
  private final FamilyMemberRepository memberRepository;
  private final FamilyInviteRepository inviteRepository;
  private final UserRepository userRepository;
  private final ChartRepository chartRepository;

  public FamilyController(
      FamilyGroupRepository groupRepository,
      FamilyMemberRepository memberRepository,
      FamilyInviteRepository inviteRepository,
      UserRepository userRepository,
      ChartRepository chartRepository) {
    this.groupRepository = groupRepository;
    this.memberRepository = memberRepository;
    this.inviteRepository = inviteRepository;
    this.userRepository = userRepository;
    this.chartRepository = chartRepository;
  }

  @PostMapping("/invites")
  public InviteResponse createInvite(Principal principal) {
    String userId = principal.getName();
    String groupId = memberRepository.findByUserId(userId)
        .map(FamilyMember::getGroupId)
        .orElseGet(() -> {
          FamilyGroup group = groupRepository.save(new FamilyGroup(userId));
          memberRepository.save(new FamilyMember(group.getId(), userId));
          return group.getId();
        });

    String code = nextUnusedCode();
    Instant expiresAt = Instant.now().plus(INVITE_TTL);
    inviteRepository.save(new FamilyInvite(groupId, code, expiresAt));
    return new InviteResponse(code, expiresAt);
  }

  /** Lets 7-3 show whose group a code belongs to before the user commits to joining it. */
  @GetMapping("/invites/{code}")
  public InvitePreviewResponse previewInvite(@PathVariable String code) {
    FamilyInvite invite = inviteRepository.findByCode(code)
        .filter(FamilyInvite::isValid)
        .orElseThrow(() -> new IllegalArgumentException("코드가 유효하지 않거나 만료됐어요."));
    FamilyGroup group = groupRepository.findById(invite.getGroupId())
        .orElseThrow(() -> new IllegalStateException("그룹을 찾을 수 없어요."));
    String ownerName = userRepository.findById(group.getCreatedByUserId())
        .map(User::getNickname)
        .filter(n -> n != null && !n.isBlank())
        .orElse("가족");
    int memberCount = memberRepository.findByGroupId(group.getId()).size();
    return new InvitePreviewResponse(ownerName, memberCount);
  }

  @PostMapping("/join")
  public List<MemberResponse> join(@Valid @RequestBody JoinRequest req, Principal principal) {
    String userId = principal.getName();
    if (memberRepository.findByUserId(userId).isPresent()) {
      throw new IllegalArgumentException("이미 가족 그룹에 속해 있어요.");
    }
    FamilyInvite invite = inviteRepository.findByCode(req.code())
        .filter(FamilyInvite::isValid)
        .orElseThrow(() -> new IllegalArgumentException("코드가 유효하지 않거나 만료됐어요."));

    memberRepository.save(new FamilyMember(invite.getGroupId(), userId));
    invite.markUsed();
    inviteRepository.save(invite);
    return members(principal);
  }

  @GetMapping("/members")
  public List<MemberResponse> members(Principal principal) {
    String userId = principal.getName();
    FamilyMember me = memberRepository.findByUserId(userId).orElse(null);
    if (me == null) return List.of();

    return memberRepository.findByGroupId(me.getGroupId()).stream()
        .map(m -> {
          User user = userRepository.findById(m.getUserId()).orElse(null);
          Map<String, Object> chart = chartRepository.findFirstByUserIdOrderByUpdatedAtDesc(m.getUserId())
              .map(ChartRecord::getData)
              .orElse(null);
          String nickname = user != null && user.getNickname() != null ? user.getNickname() : "가족 구성원";
          return new MemberResponse(m.getUserId(), nickname, m.getUserId().equals(userId), chart);
        })
        .toList();
  }

  private String nextUnusedCode() {
    for (int attempt = 0; attempt < 10; attempt++) {
      String code = String.format("%06d", random.nextInt(1_000_000));
      if (inviteRepository.findByCode(code).isEmpty()) return code;
    }
    throw new IllegalStateException("초대 코드를 만들지 못했어요. 다시 시도해주세요.");
  }
}
