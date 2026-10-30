package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.common.AdminApiException;
import java.util.*;

@Component
public class BookVariantStore {
    private final JdbcTemplate jdbc;
    public BookVariantStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<VariantView> read(long bookId) {
        return jdbc.query("select id::text,name,stock from book_variant where book_copy_id=? order by sort_order",
                (r,n) -> new VariantView(r.getString(1), r.getString(2), r.getLong(3)), bookId);
    }

    public List<VariantView> save(long bookId, List<VariantWrite> rows) {
        var existing = read(bookId).stream().map(VariantView::id).collect(java.util.stream.Collectors.toSet());
        var incoming = rows.stream().map(VariantWrite::id).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        if (!existing.equals(incoming)) throw AdminApiException.field("variants", "Giữ đủ các biến thể đã lưu của sách này");
        // Clear names in this transaction to permit swapping names without a transient unique conflict.
        jdbc.update("update book_variant set name=null where book_copy_id=?", bookId);
        for (int i=0; i<rows.size(); i++) {
            var row = rows.get(i);
            if (row.id() == null)
                jdbc.update("insert into book_variant(id,book_copy_id,name,stock,sort_order) values(?,?,?,?,?)",
                        UUID.randomUUID(), bookId, row.name(), row.stock(), i);
            else jdbc.update("update book_variant set name=?,stock=?,sort_order=? where id=? and book_copy_id=?",
                        row.name(), row.stock(), i, UUID.fromString(row.id()), bookId);
        }
        return read(bookId);
    }
}
