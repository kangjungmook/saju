package com.saju.backend.family;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FamilyInviteRepository extends JpaRepository<FamilyInvite, String> {
  Optional<FamilyInvite> findByCode(String code);
}
