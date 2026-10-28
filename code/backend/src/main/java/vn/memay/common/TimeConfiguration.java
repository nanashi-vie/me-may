package vn.memay.common;

@org.springframework.context.annotation.Configuration
public class TimeConfiguration {
    @org.springframework.context.annotation.Bean
    java.time.Clock clock() {
        return java.time.Clock.systemUTC();
    }
}
