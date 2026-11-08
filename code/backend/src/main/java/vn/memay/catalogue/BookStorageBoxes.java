package vn.memay.catalogue;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import vn.memay.common.AdminApiException;

@Component
public class BookStorageBoxes {
    private final JdbcTemplate jdbc;

    public BookStorageBoxes(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static int positiveNumber(JsonNode value) {
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0)
            throw AdminApiException.field("storageBoxNumber", "Nhập số thùng nguyên dương hợp lệ");
        return value.asInt();
    }

    public List<Integer> list() {
        return jdbc.queryForList("select number from book_storage_box order by number", Integer.class);
    }

    public int create(int number) {
        if (jdbc.update("insert into book_storage_box(number) values (?) on conflict do nothing", number) == 0)
            throw new AdminApiException(409, "storage_box_exists");
        return number;
    }

    public void requireExisting(Integer number) {
        if (number != null && !Boolean.TRUE.equals(jdbc.queryForObject(
                "select exists(select 1 from book_storage_box where number=?)", Boolean.class, number)))
            throw AdminApiException.field("storageBoxNumber", "Thùng này chưa tồn tại");
    }
}
