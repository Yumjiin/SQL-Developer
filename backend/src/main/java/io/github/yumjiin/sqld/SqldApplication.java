package io.github.yumjiin.sqld;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;

@OpenAPIDefinition(info = @Info(title = "SQLD 실전 노트 API", version = "v1", description = "문제 조회, 관리자 문제 관리 API"))

@SpringBootApplication
public class SqldApplication {

    public static void main(String[] args) {
        SpringApplication.run(SqldApplication.class, args);
    }
}
