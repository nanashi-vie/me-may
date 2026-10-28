package vn.memay.catalogue;

import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookCodeGenerator {
    private final JdbcTemplate jdbc;

    public BookCodeGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String nextCode() {
        return format(jdbc.queryForObject("select nextval('book_code_seq')", Long.class));
    }

    public static String format(long value) {
        if (value < 1)
            throw new IllegalArgumentException("Invalid code sequence");
        return "MM-" + String.format(Locale.ROOT, "%06d", value);
    }
}
