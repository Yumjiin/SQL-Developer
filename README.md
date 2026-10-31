# SQLD 실전 노트

SQLD(SQL 개발자) 시험 공부용 정적 웹사이트입니다. 서버 없이 GitHub Pages에 그대로 올려서 쓸 수 있어요.

- **개념**: 1·2과목 시험 범위 순서대로 정리 (`data/guide.md`)
- **문제**: 객관식 문제은행, 고르면 바로 정답·해설 (`data/questions.json`)
- **SQL 실습**: 브라우저 안에서 진짜 SQL을 실행하고 자동 채점 (`data/labs.json`, `data/schema.sql`)
- **모의고사**: 1과목 10 + 2과목 40문항, 90분 타이머, 과락 판정
- **오답노트**: 틀린 문제가 자동으로 모이고, 다시 맞히면 빠짐

진행 상황은 브라우저 localStorage에 저장됩니다. 로그인이 필요 없는 대신 기기·브라우저마다 따로 저장돼요.

## 폴더 구조

```
index.html          화면 뼈대
css/style.css       디자인
js/app.js           동작 전체 (라우팅, 채점, 저장)
data/guide.md       개념 정리 (마크다운)
data/questions.json 객관식 문제
data/labs.json      SQL 실습 문제
data/schema.sql     실습용 테이블과 데이터 (DEPT, EMP, SALGRADE)
vendor/             sql.js(브라우저용 SQLite), marked(마크다운 변환)
.nojekyll           GitHub Pages가 파일을 가공하지 않도록 하는 빈 파일
```

## 내 컴퓨터에서 실행하기

`index.html`을 더블클릭해서 열면 브라우저 보안 정책 때문에 데이터 파일을 못 읽어요. 폴더에서 간단한 서버를 띄워서 여세요.

```bash
cd SQL-Developer
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## GitHub Pages로 배포하기

### 방법 A. 터미널(git)로 올리기

1. GitHub에서 **New repository** → 이름 예: `SQL-Developer` → Public → Create (README 추가 체크는 하지 않기)
2. 이 폴더에서:

```bash
cd SQL-Developer
git init
git add .
git commit -m "SQLD 실전 노트 첫 배포"
git branch -M main
git remote add origin https://github.com/Yumjiin/SQL-Developer.git
git push -u origin main
```

3. 저장소의 **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main**, 폴더: **/ (root)** → Save
4. 1~2분 뒤 `https://Yumjiin.github.io/SQL-Developer/` 에서 열립니다.

### 방법 B. 웹에서 드래그로 올리기

1. 저장소를 만든 뒤 **Add file → Upload files**
2. 폴더 안의 내용물(index.html, css, js, data, vendor, .nojekyll)을 통째로 끌어다 놓고 Commit
   - `.nojekyll`처럼 점으로 시작하는 파일은 Finder에서 안 보일 수 있어요. 빠져도 이 사이트는 동작합니다.
3. 위의 3~4단계와 같이 Pages 설정

이후 수정은 파일을 고치고 `git add . && git commit -m "문제 추가" && git push` 하면 1~2분 뒤 사이트에 반영돼요.

## 문제 추가하기

### 객관식 (`data/questions.json`)

```json
{
  "id": "Q072",
  "subject": 2,
  "chapter": "윈도우 함수",
  "question": "문제 내용",
  "code": "SQL이나 표가 필요하면 여기에 (없으면 이 줄 삭제)",
  "choices": ["보기1", "보기2", "보기3", "보기4"],
  "answer": 3,
  "explanation": "해설"
}
```

- `subject`: 1(데이터 모델링) 또는 2(SQL 기본 및 활용)
- `answer`: 정답 보기 번호 (1~4)
- `chapter`: 같은 이름끼리 단원 필터로 묶여요. 새 이름을 쓰면 단원이 새로 생깁니다.
- `id`는 겹치지 않게. 진행 기록과 오답노트가 id로 저장돼요.
- 문제를 늘리면 모의고사가 매번 다른 문제 조합으로 출제됩니다.

### SQL 실습 (`data/labs.json`)

```json
{
  "id": "L21",
  "chapter": "윈도우 함수",
  "level": 2,
  "title": "짧은 제목",
  "prompt": "문제 설명",
  "hint": "힌트",
  "answer": "정답 SQL",
  "orderMatters": true
}
```

- 채점은 **정답 SQL의 실행 결과**와 내 결과를 비교합니다. 정답 결과를 따로 적을 필요가 없어요.
- 컬럼 이름(별칭)은 비교하지 않고, 컬럼 순서와 값을 비교합니다.
- `orderMatters`: `true`면 행 순서까지 채점. 동점이 생길 수 있으면 문제에 정렬 기준을 끝까지 적어 주세요.
- UPDATE/DELETE 문제는 `"check": "SELECT ... ORDER BY ..."`를 추가하면, 실행 후 그 쿼리 결과로 채점합니다.

JSON은 쉼표 하나만 빠져도 사이트 전체가 안 열려요. 수정한 뒤 로컬에서 한 번 열어 보거나 [jsonlint.com](https://jsonlint.com) 같은 곳에서 확인하세요.

## 실습 엔진 참고 (SQLite vs Oracle)

실습은 브라우저 안의 **SQLite**(sql.js)로 돌아갑니다. 시험 기준인 Oracle·SQL Server와 다른 점:

| 항목 | 이 사이트 |
|---|---|
| NVL, NVL2, DECODE, MOD, TRUNC, LPAD, RPAD, INITCAP | Oracle처럼 동작하도록 추가함 |
| ROWNUM, TOP | 없음 → `LIMIT N` 또는 `ROW_NUMBER()` |
| CONNECT BY | 없음 → `WITH RECURSIVE` |
| ROLLUP, CUBE, GROUPING SETS, PIVOT | 없음 → `UNION ALL`로 흉내 |
| DUAL | 없음 → `SELECT 1 + 1;` 처럼 FROM 생략 |
| `'A' \|\| NULL` | NULL (Oracle은 'A') |
| 윈도우 함수, 서브쿼리, OUTER JOIN, 집합 연산(EXCEPT) | 지원 |

## 기출 문제를 넣을 때

SQLD는 공식 기출이 공개되지 않는 시험이라, 인터넷에 도는 "기출"은 대부분 응시자 복원본이거나 교재·강의의 재구성 문제이고 각각 저작권자가 있습니다. 공개 저장소·공개 사이트에 원문 그대로 옮기면 문제가 될 수 있어요.

- 공부한 개념을 내 말로 다시 쓴 문제, 보기와 상황을 바꾼 변형 문제 위주로 채우기
- 원문을 그대로 쓰고 싶다면 저장소를 **Private**으로 두고 로컬에서만 사용하기 (무료 계정은 Private 저장소로 Pages 공개가 안 됨)

## 사용한 라이브러리

- [sql.js](https://github.com/sql-js/sql.js) — MIT License (`vendor/LICENSE-sqljs.txt`)
- [marked](https://github.com/markedjs/marked) — MIT License (`vendor/LICENSE-marked.md`)
- 글꼴: Pretendard, JetBrains Mono (CDN)
