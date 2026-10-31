package io.github.yumjiin.sqld.question;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * 서버가 처음 뜰 때 DB가 비어 있으면 resources/data/questions.json의 문제를 넣어 줍니다.
 * (이미 데이터가 있으면 아무것도 하지 않음)
 */
@Component
public class QuestionSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(QuestionSeeder.class);

    private final QuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    public QuestionSeeder(QuestionRepository questionRepository, ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws IOException {
        if (questionRepository.count() > 0) {
            return;
        }
        try (InputStream in = new ClassPathResource("data/questions.json").getInputStream()) {
            List<SeedQuestion> seeds = objectMapper.readValue(in, new TypeReference<List<SeedQuestion>>() {});
            List<Question> questions = seeds.stream()
                    .map(s -> new Question(s.id(), s.subject(), s.chapter(), s.question(), s.code(),
                            s.choices(), s.answer(), s.explanation(), Visibility.PUBLIC, "직접 작성"))
                    .toList();
            questionRepository.saveAll(questions);
            log.info("기본 문제 {}개를 DB에 넣었습니다.", questions.size());
        }
    }

    /** questions.json 한 항목의 모양 */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SeedQuestion(String id, int subject, String chapter, String question, String code,
                        List<String> choices, int answer, String explanation) {
    }
}
