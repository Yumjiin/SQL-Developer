# 시험 한눈에 보기

| 항목 | 내용 |
|---|---|
| 문항 | 객관식 50문항 (1과목 10문항, 2과목 40문항) |
| 시간 | 90분 |
| 배점 | 문항당 2점, 100점 만점 |
| 합격 | 총점 60점 이상 + 과목별 40% 이상 (1과목 4문항 이상, 2과목 16문항 이상) |

> 1과목은 10문항뿐이라 3~4개만 틀려도 과락선에 가깝습니다. 2과목만 믿지 말고 1과목 용어도 꼭 챙기세요.

이 사이트의 SQL 실습은 브라우저 안에서 동작하는 **SQLite** 엔진을 씁니다. 시험은 Oracle·SQL Server 기준이라 문법이 다른 부분은 각 장에서 따로 표시했어요.

# 1과목 · 데이터 모델링의 이해

## 데이터 모델의 이해

**데이터 모델링 3단계**

| 단계 | 특징 |
|---|---|
| 개념적 모델링 | 추상화 수준 가장 높음, 업무 중심, 전사적, 핵심 엔터티와 관계 도출 (ERD) |
| 논리적 모델링 | 키·속성·관계를 정확히 표현, 재사용성 높음, **정규화** 수행 |
| 물리적 모델링 | 실제 DBMS에 맞춘 테이블·인덱스·저장 구조, **성능·저장 공간** 고려 |

**데이터 모델링의 3요소**: 업무가 관여하는 어떤 것(Things), 그것의 성격(Attributes), 그것 간의 관계(Relationships)

**좋은 데이터 모델의 요소**: 완전성, 중복 배제, 업무 규칙, 데이터 재사용, 의사소통, 통합성

**ANSI-SPARC 3단계 스키마**

| 스키마 | 관점 |
|---|---|
| 외부 스키마 | 사용자·응용 프로그램 관점 (여러 개) |
| 개념 스키마 | 전체 DB 통합 관점 (하나) |
| 내부 스키마 | 물리적 저장 구조 관점 |

- **논리적 독립성**: 개념 스키마가 바뀌어도 외부 스키마에 영향 없음
- **물리적 독립성**: 내부 스키마가 바뀌어도 개념 스키마에 영향 없음

## 엔터티

업무에 필요하고 관리하고자 하는 정보의 집합. 인스턴스(행)들의 집합입니다.

**엔터티의 특징**
- 업무에 필요하고 관리해야 하는 정보
- 유일한 식별자로 식별 가능
- **인스턴스가 2개 이상**인 집합
- 업무 프로세스에서 이용되어야 함
- 반드시 **속성**을 가짐
- 다른 엔터티와 **최소 1개 이상의 관계**를 가짐 (코드성·통계성 엔터티는 예외 가능)

**엔터티 분류**

| 기준 | 분류 |
|---|---|
| 유무형 | 유형(사원, 물품) / 개념(조직, 보험상품) / 사건(주문, 청구) |
| 발생 시점 | 기본·키(사원, 부서) / 중심·메인(계약, 주문) / 행위(주문목록, 이력) |

**이름 규칙**: 현업 용어 사용, 약어 자제, **단수 명사**, 모든 엔터티에서 **유일한 이름**, 생성 의미대로 부여

## 속성

업무에서 필요로 하는, 더 이상 분리되지 않는 최소의 데이터 단위.

| 분류 기준 | 종류 |
|---|---|
| 특성 | 기본 속성(원래 업무 속성) / 설계 속성(코드, 일련번호처럼 설계 중 만든 것) / **파생 속성**(계산으로 얻는 값, 최소화) |
| 구성 방식 | PK 속성 / FK 속성 / 일반 속성 |
| 분해 여부 | 단일 속성 / 복합 속성(주소 = 시+구+동) / 다중값 속성(→ 별도 엔터티로) |

- **도메인**: 속성이 가질 수 있는 값의 범위 (타입, 크기, 제약)
- 엔터티 : 인스턴스 = 1 : N, 인스턴스 : 속성 = 1 : N, 속성 : 속성값 = 1 : 1

## 관계

**관계 표기 요소**: 관계명(Membership), 관계 차수(Cardinality: 1:1, 1:M, M:N), 관계 선택사양(Optionality: 필수/선택)

**식별 관계 vs 비식별 관계**

| 구분 | 식별 관계 | 비식별 관계 |
|---|---|---|
| 표기 | 실선 | 점선 |
| 부모 PK | 자식 **PK에 포함** | 자식의 **일반 속성(FK)** |
| 연결 강도 | 강함, 생명주기 같음 | 약함, 부모 없이 자식 생성 가능 |
| 단점 | PK 속성이 계속 늘어남 | 조인이 많아질 수 있음 |

관계를 정의할 때 체크: 두 엔터티 사이에 관심 있는 연관 규칙이 있는가, 정보의 조합이 발생하는가, 업무 기술서·장표에 관계 연결 규칙이 서술되어 있는가, 동사(Verb)가 있는가.

## 식별자

**주식별자의 특징**: **유일성**, **최소성**, **불변성**, **존재성**(NULL 불가)

| 분류 기준 | 종류 |
|---|---|
| 대표성 | 주식별자 / 보조식별자 |
| 생성 방식 | 내부식별자(스스로 생성) / 외부식별자(다른 엔터티에서 옴, FK) |
| 속성 수 | 단일식별자 / 복합식별자 |
| 대체 여부 | **본질식별자**(업무에 의해 만들어짐) / **인조식별자**(인위적으로 만든 일련번호 등) |

**인조식별자 주의점**: 중복 데이터 발생 가능성 증가(본질식별자에 UNIQUE 필요), 불필요한 인덱스 추가, 실제 조회는 본질식별자로 하는 경우가 많음.

## 정규화

이상 현상(삽입·수정·삭제 이상)을 없애기 위해 테이블을 분해하는 것.

| 정규형 | 제거 대상 |
|---|---|
| 1NF | 반복 그룹·다중값 → 모든 속성이 **원자값** |
| 2NF | **부분 함수 종속** (복합키 일부에만 종속) |
| 3NF | **이행적 함수 종속** (키가 아닌 속성끼리 종속) |
| BCNF | 결정자이면서 후보키가 아닌 것 |
| 4NF / 5NF | 다치 종속 / 조인 종속 |

> 정규화는 **입력·수정·삭제** 성능을 높이고 중복을 줄이지만, 조인이 늘어 **조회** 성능은 떨어질 수 있습니다.

## 반정규화

조회 성능을 위해 중복을 허용하거나 테이블을 합치는 것. **무결성이 깨질 위험**이 있습니다.

절차: 대상 조사(범위, 대량 처리, 통계성) → **다른 방법 먼저 검토**(뷰, 클러스터링, 인덱스, 파티셔닝, 응용 프로그램) → 반정규화 적용

| 유형 | 기법 |
|---|---|
| 테이블 | 테이블 병합, 분할(수평/수직), 통계·이력·부분 테이블 추가 |
| 컬럼 | 중복 컬럼, 파생 컬럼, 이력 컬럼, PK에 의한 컬럼 추가 |
| 관계 | 중복 관계 추가 |

## 트랜잭션과 Null

- 하나의 트랜잭션으로 함께 처리되어야 하는 엔터티 관계는 **필수(Mandatory)** 관계로 표현합니다.
- **NULL**은 0이나 공백이 아닌 '아직 정해지지 않은 값'.
  - NULL과 산술 연산 → NULL
  - NULL과 비교 연산 → UNKNOWN (그래서 `= NULL`은 항상 0건, `IS NULL`을 써야 함)
  - 집계 함수(SUM, AVG, COUNT(컬럼) 등)는 NULL을 **제외**하고 계산

# 2과목 · SQL 기본 및 활용

## SQL 분류와 SELECT 처리 순서

| 분류 | 명령어 |
|---|---|
| DML | SELECT, INSERT, UPDATE, DELETE, MERGE |
| DDL | CREATE, ALTER, DROP, RENAME, TRUNCATE |
| DCL | GRANT, REVOKE |
| TCL | COMMIT, ROLLBACK, SAVEPOINT |

**논리적 처리 순서**

```
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
```

- ORDER BY에서는 SELECT 별칭 사용 **가능**, WHERE에서는 **불가**
- ORDER BY에 컬럼 위치 번호(`ORDER BY 2`) 사용 가능

## 함수

**문자 함수**

| 함수 | 예 | 결과 |
|---|---|---|
| SUBSTR(s, 시작, 길이) | SUBSTR('SQL Developer', 5, 3) | 'Dev' |
| LENGTH | LENGTH('SQL') | 3 |
| LTRIM / RTRIM / TRIM | LTRIM('xxSQL', 'x') | 'SQL' |
| UPPER / LOWER | UPPER('sql') | 'SQL' |
| INSTR | INSTR('ABCB', 'B') | 2 |
| LPAD / RPAD | LPAD('7', 3, '0') | '007' |

**숫자 함수**: ROUND(반올림), TRUNC(버림), CEIL(크거나 같은 최소 정수), FLOOR(작거나 같은 최대 정수), MOD(나머지), ABS, SIGN

- `CEIL(-1.5) = -1`, `FLOOR(-1.5) = -2`
- `ROUND(123.456, -1) = 120` (음수 자리는 정수 부분)

**NULL 함수**

| 함수 | 동작 |
|---|---|
| NVL(a, b) | a가 NULL이면 b |
| NVL2(a, b, c) | a가 NULL이 **아니면** b, NULL이면 c |
| NULLIF(a, b) | a = b면 NULL, 아니면 a |
| COALESCE(a, b, ...) | 처음으로 NULL이 아닌 값 |
| ISNULL(a, b) | SQL Server의 NVL |

**조건 표현**: `CASE WHEN 조건 THEN 값 ... ELSE 값 END`, Oracle의 `DECODE(값, 비교1, 결과1, ..., 기본값)`

**날짜(Oracle)**: SYSDATE, 날짜 + 1 = 하루 뒤, + 1/24 = 한 시간 뒤. 날짜 − 날짜 = 일수.

> 실습 엔진(SQLite)에는 NVL, NVL2, DECODE, MOD, TRUNC, LPAD, RPAD, INITCAP을 Oracle처럼 동작하도록 추가해 두었습니다. 단, `'A' || NULL`은 Oracle과 달리 NULL이 됩니다.

## WHERE절

- **연산자 우선순위**: 괄호 → 비교 연산자 → NOT → AND → OR
- `BETWEEN a AND b` = `>= a AND <= b` (a에 작은 값)
- `LIKE`: `%` 0개 이상, `_` 정확히 한 글자
- `IN (10, NULL)`은 10만 찾음 / `NOT IN (10, NULL)`은 **항상 0건**
- NULL 비교는 `IS NULL`, `IS NOT NULL`

## GROUP BY · HAVING

- WHERE: 그룹 만들기 **전** 행 필터 (집계 함수 사용 불가)
- HAVING: 그룹 만든 **후** 그룹 필터
- GROUP BY를 쓰면 SELECT에는 GROUP BY 컬럼과 집계 함수만 가능
- `COUNT(*)`는 NULL 포함 전체 행, `COUNT(컬럼)`은 NULL 제외
- 대상 행이 없을 때: GROUP BY 없음 → 1행(COUNT 0, SUM NULL) / GROUP BY 있음 → 0행

## ORDER BY

- 기본은 ASC
- **Oracle**: NULL을 가장 큰 값으로 취급 → ASC에서 맨 뒤 (`NULLS FIRST`로 변경 가능)
- **SQL Server**: NULL을 가장 작은 값으로 취급 → ASC에서 맨 앞

## 조인

| 조인 | 설명 |
|---|---|
| INNER JOIN | 조건이 맞는 행만 |
| LEFT / RIGHT OUTER | 기준 테이블 행은 모두, 상대가 없으면 NULL |
| FULL OUTER | 양쪽 모두 (중복 없이) |
| CROSS JOIN | 카티션 곱 (M × N 건) |
| NATURAL JOIN | 같은 이름 컬럼 전부로 등가 조인, 조인 컬럼에 별칭 사용 불가 |
| USING | 지정한 같은 이름 컬럼으로 조인, 조인 컬럼에 별칭 사용 불가 |

- Oracle `A.ID = B.ID(+)` = `A LEFT OUTER JOIN B` → (+)는 **NULL이 채워질 쪽**에
- OUTER JOIN에서 안쪽 테이블 조건을 WHERE에 두면 사실상 INNER JOIN이 됨 → ON 절에
- **비등가 조인**: `ON E.SAL BETWEEN S.LOSAL AND S.HISAL`
- **셀프 조인**: 같은 테이블에 별칭 두 개 (`EMP E`, `EMP M`)

## 서브쿼리

| 위치 | 이름 |
|---|---|
| SELECT | 스칼라 서브쿼리 (한 행 한 컬럼) |
| FROM | 인라인 뷰 (ORDER BY 가능) |
| WHERE / HAVING | 중첩 서브쿼리 (ORDER BY 불가) |

- 단일 행 연산자(`=, <, >`)에 여러 행 반환 → 오류. 다중 행은 `IN, ANY, ALL, EXISTS`
- `> ALL` = 최댓값보다 큼, `> ANY` = 최솟값보다 큼
- **상관 서브쿼리**: 서브쿼리가 메인쿼리 컬럼을 참조, 메인 행마다 실행
- **뷰**: 데이터를 저장하지 않는 가상 테이블. 장점은 독립성·편리성·보안성

## 집합 연산자

| 연산자 | 중복 |
|---|---|
| UNION | 제거 |
| UNION ALL | 그대로 (정렬 없음, 가장 빠름) |
| INTERSECT | 제거, 교집합 |
| MINUS (Oracle) / EXCEPT (SQL Server) | 제거, 차집합 |

- 컬럼 수와 타입이 맞아야 함
- 결과 컬럼명은 **첫 번째** SELECT 기준
- ORDER BY는 **마지막에 한 번**

## 그룹 함수

| 함수 | 만드는 그룹 | 개수 |
|---|---|---|
| ROLLUP(A, B) | (A,B), (A), () | n + 1, **순서 중요** |
| CUBE(A, B) | (A,B), (A), (B), () | 2ⁿ |
| GROUPING SETS(A, B) | (A), (B) 개별 집계 | 지정한 만큼 |

- `GROUPING(컬럼)`: 소계·총계 행이면 1
- `ROLLUP(A, B)` = `GROUPING SETS((A,B), (A), ())`

> SQLite는 ROLLUP/CUBE/GROUPING SETS를 지원하지 않아 실습에서는 `UNION ALL`로 소계를 붙이는 방식으로 연습할 수 있어요.

## 윈도우 함수

```
함수() OVER (PARTITION BY 그룹 ORDER BY 정렬 [ROWS | RANGE BETWEEN ... AND ...])
```

| 분류 | 함수 |
|---|---|
| 순위 | RANK(1,2,2,4) / DENSE_RANK(1,2,2,3) / ROW_NUMBER(1,2,3,4) |
| 집계 | SUM, AVG, COUNT, MAX, MIN |
| 행 순서 | FIRST_VALUE, LAST_VALUE, LAG(이전 행), LEAD(다음 행) |
| 비율 | CUME_DIST, PERCENT_RANK, NTILE, RATIO_TO_REPORT |

- ORDER BY만 쓰고 프레임 생략 → `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (값이 같은 행은 같은 누적값)
- `ROWS`는 물리적인 행 기준, `RANGE`는 값 기준
- NTILE(4)을 10행에 적용 → 3, 3, 2, 2

## Top N 쿼리

- **Oracle ROWNUM**: ORDER BY보다 **먼저** 붙음 → 인라인 뷰에서 정렬 후 바깥에서 `ROWNUM <= N`
- `ROWNUM = 1`, `ROWNUM <= N`은 동작 / `ROWNUM = 2`, `ROWNUM > 1`은 0건
- **SQL Server**: `TOP(N)`, `TOP(N) WITH TIES` (동점 포함, ORDER BY 필수)
- **표준**: `OFFSET n ROWS FETCH NEXT n ROWS ONLY`
- 실습 엔진: `LIMIT N` 또는 `ROW_NUMBER()`

## 계층형 질의와 셀프 조인

```sql
SELECT LEVEL, ENAME
FROM EMP
START WITH MGR IS NULL          -- 루트 조건
CONNECT BY PRIOR EMPNO = MGR    -- 부모 → 자식 (순방향)
ORDER SIBLINGS BY ENAME;        -- 형제끼리 정렬
```

- `LEVEL`: 루트 = **1**
- `PRIOR 자식 = 부모` → 순방향, `PRIOR 부모 = 자식` → 역방향
- `CONNECT_BY_ISLEAF`(리프면 1), `CONNECT_BY_ROOT`(루트 값), `SYS_CONNECT_BY_PATH`(경로 문자열), `CONNECT_BY_ISCYCLE`
- START WITH의 조건은 루트를 고르는 것이라, WHERE처럼 결과를 거르지 않음

> 실습 엔진에는 CONNECT BY가 없어서 `WITH RECURSIVE`로 같은 결과를 만듭니다. (실습 L18)

## PIVOT · 정규표현식

- **PIVOT**: 행 → 열, 집계 함수 필요 / **UNPIVOT**: 열 → 행
- 정규표현식 함수: `REGEXP_LIKE`, `REGEXP_SUBSTR`, `REGEXP_REPLACE`, `REGEXP_INSTR`, `REGEXP_COUNT`

| 메타문자 | 의미 |
|---|---|
| `^` / `$` | 시작 / 끝 |
| `.` | 아무 한 문자 |
| `*` / `+` / `?` | 0회 이상 / 1회 이상 / 0~1회 |
| `{n}` | 정확히 n회 |
| `[abc]`, `[^abc]` | 문자 집합 / 제외 |
| `\d`, `\w`, `\s` | 숫자 / 단어 문자 / 공백 |

## DML · TCL

| 구분 | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| 분류 | DML | DDL | DDL |
| 범위 | WHERE로 일부 가능 | 전체 데이터 | 데이터 + 구조 |
| ROLLBACK | 가능 | 불가 (Oracle) | 불가 (Oracle) |

- **MERGE**: 있으면 UPDATE, 없으면 INSERT
- **ACID**: 원자성, 일관성, 고립성, 지속성
- `ROLLBACK TO 세이브포인트`는 그 이후 작업만 취소
- **Oracle**: DDL 실행 시 자동 커밋 / **SQL Server**: 기본 AUTO COMMIT

## DDL · DCL

**ALTER TABLE 비교**

| 작업 | Oracle | SQL Server |
|---|---|---|
| 컬럼 추가 | ADD | ADD |
| 컬럼 수정 | MODIFY | ALTER COLUMN |
| 컬럼 이름 변경 | RENAME COLUMN a TO b | sp_rename |
| 컬럼 삭제 | DROP COLUMN | DROP COLUMN |

**제약조건**: PRIMARY KEY(UNIQUE + NOT NULL, 테이블당 1개), UNIQUE(NULL 허용), NOT NULL, CHECK, FOREIGN KEY(`ON DELETE CASCADE / SET NULL`)

**문자 타입**: CHAR는 고정 길이·비교 시 공백 채움, VARCHAR(2)는 가변 길이·공백도 문자로 비교

**DCL**: `GRANT 권한 ON 객체 TO 사용자 [WITH GRANT OPTION]`, `REVOKE`, ROLE로 권한을 묶어서 관리
