package io.github.yumjiin.sqld.question;

import java.util.List;

/**
 * API 응답 형식.
 * 프론트의 data/questions.json과 같은 모양이라, React에서 JSON 파일 대신 이 API를 그대로 쓸 수 있습니다.
 * 엔티티를 그대로 내보내지 않고 DTO로 바꾸는 이유: DB 구조가 바뀌어도 API 모양은 지킬 수 있고,
 * visibility 같은 내부 정보를 노출하지 않기 위해서입니다.
 */
public record QuestionResponse(
        String id,
        int subject,
        String chapter,
        String question,
        String code,
        List<String> choices,
        int answer,
        String explanation
) {
    public static QuestionResponse from(Question q) {
        return new QuestionResponse(
                q.getQuestionNo(),
                q.getSubject(),
                q.getChapter(),
                q.getContent(),
                q.getCodeSnippet(),
                List.copyOf(q.getChoices()),
                q.getAnswer(),
                q.getExplanation()
        );
    }
}
