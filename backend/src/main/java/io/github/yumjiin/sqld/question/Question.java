package io.github.yumjiin.sqld.question;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 객관식 문제 한 개 = question 테이블의 한 행.
 * 보기 4개는 question_choice 테이블에 순서(choice_order)와 함께 따로 저장됩니다.
 */
@Entity
@Table(name = "question")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 화면에서 쓰는 문제 번호 (예: Q001). 프론트의 id와 같은 값 */
    @Column(name = "question_no", nullable = false, unique = true, length = 20)
    private String questionNo;

    /** 1 = 데이터 모델링의 이해, 2 = SQL 기본 및 활용 */
    @Column(nullable = false)
    private int subject;

    @Column(nullable = false, length = 50)
    private String chapter;

    /** 문제 본문 */
    @Column(nullable = false, length = 2000)
    private String content;

    /** 문제에 딸린 SQL이나 표 (없으면 null) */
    @Column(length = 4000)
    private String codeSnippet;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "question_choice", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "choice_order")
    @Column(name = "content", nullable = false, length = 1000)
    private List<String> choices = new ArrayList<>();

    /** 정답 보기 번호 (1~4) */
    @Column(nullable = false)
    private int answer;

    @Column(nullable = false, length = 4000)
    private String explanation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Visibility visibility = Visibility.PUBLIC;

    /** 출처 메모 (예: "직접 작성", "60회 복원") */
    @Column(length = 100)
    private String source;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /** JPA가 객체를 만들 때 쓰는 기본 생성자 (직접 호출하지 않음) */
    protected Question() {
    }

    public Question(String questionNo, int subject, String chapter, String content, String codeSnippet,
                    List<String> choices, int answer, String explanation, Visibility visibility, String source) {
        this.questionNo = questionNo;
        this.subject = subject;
        this.chapter = chapter;
        this.content = content;
        this.codeSnippet = codeSnippet;
        this.choices = new ArrayList<>(choices);
        this.answer = answer;
        this.explanation = explanation;
        this.visibility = visibility;
        this.source = source;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getQuestionNo() { return questionNo; }
    public int getSubject() { return subject; }
    public String getChapter() { return chapter; }
    public String getContent() { return content; }
    public String getCodeSnippet() { return codeSnippet; }
    public List<String> getChoices() { return choices; }
    public int getAnswer() { return answer; }
    public String getExplanation() { return explanation; }
    public Visibility getVisibility() { return visibility; }
    public String getSource() { return source; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
