package io.github.yumjiin.sqld.question;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 서버를 실제로 띄우지 않고 API를 호출해 보는 테스트.
 * 실행: ./mvnw test
 */
@SpringBootTest
@AutoConfigureMockMvc
class QuestionControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void 공개_문제_전체를_조회한다() throws Exception {
        mockMvc.perform(get("/api/questions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(71)))
                .andExpect(jsonPath("$[0].id", is("Q001")))
                .andExpect(jsonPath("$[0].choices", hasSize(4)));
    }

    @Test
    void 과목으로_걸러서_조회한다() throws Exception {
        mockMvc.perform(get("/api/questions").param("subject", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(15)))
                .andExpect(jsonPath("$[*].subject", everyItem(is(1))));
    }

    @Test
    void 문제_하나를_조회한다() throws Exception {
        mockMvc.perform(get("/api/questions/Q020"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer", is(1)))
                .andExpect(jsonPath("$.code", is("SELECT SUBSTR('SQL Developer', 5, 3) FROM DUAL;")));
    }

    @Test
    void 없는_문제는_404를_돌려준다() throws Exception {
        mockMvc.perform(get("/api/questions/NOPE"))
                .andExpect(status().isNotFound());
    }
}
