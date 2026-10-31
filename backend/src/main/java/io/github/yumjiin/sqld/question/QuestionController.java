package io.github.yumjiin.sqld.question;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * HTTP 요청을 받는 계층. 요청 → Service 호출 → 결과를 JSON으로 응답.
 *
 * GET /api/questions 공개 문제 전체
 * GET /api/questions?subject=2 2과목만
 * GET /api/questions?subject=2&chapter=조인 2과목의 조인 단원만
 * GET /api/questions/Q001 문제 하나
 */
@Tag(name = "문제", description = "객관식 문제 조회")
@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @Operation(summary = "공개 문제 목록", description = "subject(1 또는 2), chapter(단원명)로 걸러서 조회")
    @GetMapping
    public List<QuestionResponse> list(@RequestParam(required = false) Integer subject,
            @RequestParam(required = false) String chapter) {
        return questionService.findPublic(subject, chapter);
    }

    @Operation(summary = "문제 하나 조회", description = "문제 번호(예: Q001)로 조회. 없거나 비공개면 404")
    @GetMapping("/{id}")
    public QuestionResponse get(@PathVariable String id) {
        return questionService.findPublicOne(id);
    }
}