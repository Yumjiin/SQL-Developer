package io.github.yumjiin.sqld.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS 설정.
 * 브라우저는 기본적으로 "다른 주소(origin)"의 API 호출을 막습니다.
 * React 개발 서버(localhost:5173)와 배포 사이트(yumjiin.github.io)에서 이 API를 부를 수 있게 허용합니다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://localhost:5500",
                        "http://127.0.0.1:5500",
                        "https://yumjiin.github.io"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}
