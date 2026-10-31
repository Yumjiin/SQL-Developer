package io.github.yumjiin.sqld.question;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * DB 접근 계층. 인터페이스만 선언하면 Spring Data JPA가 구현체를 자동으로 만들어 줍니다.
 */
public interface QuestionRepository extends JpaRepository<Question, Long> {

    /** subject, chapter가 null이면 그 조건은 무시합니다 */
    @Query("""
            select q from Question q
            where q.visibility = :visibility
              and (:subject is null or q.subject = :subject)
              and (:chapter is null or q.chapter = :chapter)
            order by q.questionNo
            """)
    List<Question> search(@Param("visibility") Visibility visibility,
                          @Param("subject") Integer subject,
                          @Param("chapter") String chapter);

    Optional<Question> findByQuestionNo(String questionNo);
}
