# SQLD 실전 노트 · 백엔드

Spring Boot로 만든 문제 API 서버입니다. 지금은 **공개 문제 조회**까지 되어 있고, 이후 관리자 로그인·문제 등록 기능을 붙여 나갑니다.

| 항목 | 내용 |
|---|---|
| Java | 17 이상 |
| 프레임워크 | Spring Boot 3.5 (Web, Data JPA, Validation, DevTools) |
| DB | H2 (개발용, `backend/data/` 폴더에 파일로 저장) |
| 빌드 | Maven (Maven Wrapper 포함, Maven 따로 설치 불필요) |

## 실행

```bash
cd backend
java -version            # 17 이상인지 확인
./mvnw spring-boot:run   # 첫 실행은 라이브러리를 내려받느라 몇 분 걸려요
```

콘솔에 `Started SqldApplication`과 `기본 문제 71개를 DB에 넣었습니다.`가 보이면 성공입니다. 끄려면 `Ctrl + C`.

## 확인해 보기

| 주소 | 내용 |
|---|---|
| http://localhost:8080/api/questions | 공개 문제 전체 (JSON) |
| http://localhost:8080/api/questions?subject=1 | 1과목만 |
| http://localhost:8080/api/questions?subject=2&chapter=조인 | 2과목 조인 단원만 |
| http://localhost:8080/api/questions/Q001 | 문제 하나 |
| http://localhost:8080/api/questions/NOPE | 없는 문제 → 404 |
| http://localhost:8080/h2-console | DB를 직접 보는 화면 |

H2 콘솔 접속 정보: JDBC URL `jdbc:h2:file:./data/sqld`, User Name `sa`, Password 비움.
접속한 뒤 `SELECT * FROM QUESTION;`, `SELECT * FROM QUESTION_CHOICE;`를 실행해 보세요. 보기 4개가 별도 테이블에 순서와 함께 저장된 걸 볼 수 있어요.

## 테스트

```bash
./mvnw test
```

`src/test`의 테스트는 비어 있는 메모리 DB로 서버를 띄워 API 4개를 호출해 봅니다.

## 구조

```
src/main/java/io/github/yumjiin/sqld/
├─ SqldApplication.java          시작점
├─ config/WebConfig.java         CORS: React(5173), Live Server(5500), GitHub Pages에서 호출 허용
└─ question/
   ├─ Question.java              엔티티 = question 테이블
   ├─ Visibility.java            PUBLIC / PRIVATE (비공개 = 관리자 전용 문제)
   ├─ QuestionRepository.java    DB 조회 (Spring Data JPA)
   ├─ QuestionService.java       규칙: 누구에게 어떤 문제를 보여줄지
   ├─ QuestionController.java    HTTP 요청 → JSON 응답
   ├─ QuestionResponse.java      응답 형식 (프론트의 questions.json과 같은 모양)
   └─ QuestionSeeder.java        DB가 비어 있으면 resources/data/questions.json 넣기
```

요청 흐름: `브라우저 → Controller → Service → Repository → DB` 그리고 거꾸로 `엔티티 → DTO(QuestionResponse) → JSON`.

ASP.NET Core와 비교하면 Controller는 같고, Service + 생성자 주입은 DI와 같은 개념, JPA 엔티티·Repository는 Entity Framework의 DbSet과 비슷한 역할입니다.

## 개발 DB 초기화

`backend/data/` 폴더를 지우고 다시 실행하면 빈 DB에서 기본 문제 71개부터 다시 들어갑니다.
이 폴더는 `.gitignore`에 들어 있어서 커밋되지 않아요. 나중에 비공개 문제를 등록해도 저장소에 올라가지 않습니다.

## 다음 단계

1. ✅ 공개 문제 조회 API
2. React가 JSON 파일 대신 이 API에서 문제를 받아오기
3. 관리자 문제 등록·수정·삭제 API + 관리자 화면
4. Spring Security + JWT 로그인, 비공개 문제는 관리자에게만
5. 배포 (DB와 서버를 클라우드에, 비밀 값은 환경 변수로)
