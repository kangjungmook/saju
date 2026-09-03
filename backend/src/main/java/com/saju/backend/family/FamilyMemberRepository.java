package com.saju.backend.family;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, String> {
  Optional<FamilyMember> findByUserId(String userId);
  List<FamilyMember> findByGroupId(String groupId);
}
