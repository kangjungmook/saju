package com.saju.backend.family;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real invite -> join -> members flow against H2 (same JPA/Hibernate code
 * path as production, different DB vendor) — this is what actually verifies the family
 * group business logic, since this sandbox can't reach the real Supabase instance to test
 * against it directly (see README).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FamilyControllerTest {

  @Autowired
  private MockMvc mockMvc;
  @Autowired
  private ObjectMapper objectMapper;

  @Test
  @WithMockUser(username = "userA")
  void creatingAnInviteWithNoExistingGroupMakesOneAndReturnsAUsable6DigitCode() throws Exception {
    mockMvc.perform(post("/family/invites"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").isString())
        .andExpect(jsonPath("$.code", matchesPattern("\\d{6}")))
        .andExpect(jsonPath("$.expiresAt").exists());
  }

  @Test
  void joiningWithAValidCodePutsBothUsersInTheSameGroup() throws Exception {
    String code = createInviteAs("ownerA");

    joinAs("memberB", code)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(2)));

    mockMvc.perform(get("/family/members").with(user("ownerA")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[?(@.userId == 'ownerA')].isMe").value(hasItem(true)))
        .andExpect(jsonPath("$[?(@.userId == 'memberB')].isMe").value(hasItem(false)));
  }

  @Test
  void previewingAValidCodeShowsGroupInfoWithoutJoining() throws Exception {
    String code = createInviteAs("ownerF");

    mockMvc.perform(get("/family/invites/" + code).with(user("curiousG")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.memberCount").value(1));

    // previewing must not have joined curiousG
    mockMvc.perform(get("/family/members").with(user("curiousG")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void aUserAlreadyInAGroupCannotJoinAnother() throws Exception {
    String firstCode = createInviteAs("ownerC");
    joinAs("memberD", firstCode).andExpect(status().isOk());

    String secondCode = createInviteAs("ownerE");
    joinAs("memberD", secondCode)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error", containsString("이미")));
  }

  @Test
  @WithMockUser(username = "someone")
  void joiningWithAnUnknownCodeFails() throws Exception {
    mockMvc.perform(post("/family/join")
            .contentType("application/json")
            .content(objectMapper.writeValueAsString(new com.saju.backend.family.dto.JoinRequest("000000"))))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(username = "lonely")
  void aUserWithNoGroupSeesAnEmptyMemberList() throws Exception {
    mockMvc.perform(get("/family/members"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));
  }

  private String createInviteAs(String userId) throws Exception {
    String body = mockMvc.perform(post("/family/invites").with(user(userId)))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    return objectMapper.readTree(body).get("code").asText();
  }

  private org.springframework.test.web.servlet.ResultActions joinAs(String userId, String code) throws Exception {
    return mockMvc.perform(post("/family/join")
        .with(user(userId))
        .contentType("application/json")
        .content(objectMapper.writeValueAsString(new com.saju.backend.family.dto.JoinRequest(code))));
  }
}
