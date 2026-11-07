package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.*;

@Component
public class BookImportStore {
    private final JdbcTemplate jdbc;
    public BookImportStore(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public Optional<ImportReceipt> find(String fingerprint) {
        if(fingerprint==null)return Optional.empty();
        var batches=jdbc.queryForList("select id,created_at from book_import_batch where fingerprint=?",fingerprint);
        if(batches.isEmpty())return Optional.empty();var batch=batches.getFirst();var id=(UUID)batch.get("id");
        var items=new ArrayList<>(jdbc.query("select i.group_key,i.book_id::text,i.book_code,i.title,b.id is null from book_import_item i left join book_copy b on b.id=i.book_id where i.batch_id=?",
                (r,n)->new ImportedBook(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getBoolean(5)),id));
        items.sort(Comparator.comparing(ImportedBook::groupKey));
        return Optional.of(new ImportReceipt(id,fingerprint,((java.sql.Timestamp)batch.get("created_at")).toInstant(),List.copyOf(items)));
    }
}
