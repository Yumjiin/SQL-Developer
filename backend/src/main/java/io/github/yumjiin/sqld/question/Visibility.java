package io.github.yumjiin.sqld.question;

/**
 * 문제 공개 범위.
 * PUBLIC  : 누구나 조회 가능 (직접 작성한 문제)
 * PRIVATE : 관리자만 조회 가능 (기출 복원 문제 등) — 로그인 기능을 만든 뒤 사용
 */
public enum Visibility {
    PUBLIC,
    PRIVATE
}
