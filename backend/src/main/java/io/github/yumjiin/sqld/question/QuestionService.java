package io.github.yumjiin.sqld.question;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 비즈니스 로직 계층. "누구에게 어떤 문제를 보여줄지" 같은 규칙은 여기에 둡니다.
 */
@Service
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionRepository questionRepository;

    // 생성자 주입: Spring이 QuestionRepository 구현체를 넣어 줍니다 (ASP.NET Core의 DI와 같은 개념)
    public QuestionService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    /** 지금은 로그인 기능이 없으므로 공개 문제만 돌려줍니다 */
    public List<QuestionResponse> findPublic(Integer subject, String chapter) {
        return questionRepository.search(Visibility.PUBLIC, subject, blankToNull(chapter)).stream()
                .map(QuestionResponse::from)   // 트랜잭션 안에서 보기 목록까지 읽어 DTO로 변환
                .toList();
    }

    public QuestionResponse findPublicOne(String questionNo) {
        Question q = questionRepository.findByQuestionNo(questionNo)
                .filter(found -> found.getVisibility() == Visibility.PUBLIC)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "문제를 찾을 수 없습니다: " + questionNo));
        return QuestionResponse.from(q);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
