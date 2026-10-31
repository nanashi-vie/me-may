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
        var items=new ArrayList<>(jdbc.query("select group_key,book_id::text,book_code,title from book_import_item where batch_id=?",
                (r,n)->new ImportedBook(r.getString(1),r.getString(2),r.getString(3),r.getString(4)),id));
        items.sort(Comparator.comparing(ImportedBook::groupKey));
        return Optional.of(new ImportReceipt(id,fingerprint,((java.sql.Timestamp)batch.get("created_at")).toInstant(),List.copyOf(items)));
    }
}
