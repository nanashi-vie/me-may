package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.common.AdminApiException;
import java.util.*;

@Component
public class BookVariantStore {
    private final JdbcTemplate jdbc;

    public BookVariantStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<VariantView> read(long bookId) {
        return jdbc.query("select id::text,name,stock from book_variant where book_copy_id=? order by sort_order",
                (r, n) -> new VariantView(r.getString(1), r.getString(2), r.getLong(3)), bookId);
    }

    public long stockLimit(long bookId) {
        return Math.min(9007199254740991L,(long)read(bookId).size()*999999L);
    }

    public List<VariantWrite> pooledRows(long bookId,long stock) {
        var rows=read(bookId);
        long limit=Math.min(9007199254740991L,(long)rows.size()*999999L);
        if(stock<0 || stock>limit) throw AdminApiException.field("stock","Stock exceeds available row capacity");
        long delta=stock-rows.stream().mapToLong(VariantView::stock).sum();
        var values=new ArrayList<>(rows.stream().map(v -> new VariantWrite(v.id(),v.name(),v.stock())).toList());
        if(delta>0) {
            for(int i=0;i<values.size() && delta>0;i++) {
                var v=values.get(i);long add=Math.min(delta,999999-v.stock());
                values.set(i,new VariantWrite(v.id(),v.name(),v.stock()+add));delta-=add;
            }
        } else {
            for(int i=values.size()-1;i>=0 && delta<0;i--) {
                var v=values.get(i);long remove=Math.min(-delta,v.stock());
                values.set(i,new VariantWrite(v.id(),v.name(),v.stock()-remove));delta+=remove;
            }
        }
        return List.copyOf(values);
    }

    public List<VariantView> save(long bookId, List<VariantWrite> rows) {
        var existing = read(bookId).stream().map(VariantView::id).collect(java.util.stream.Collectors.toSet());
        var incoming = rows.stream().map(VariantWrite::id).filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        if (!existing.equals(incoming))
            throw AdminApiException.field("variants", "Giữ đủ các biến thể đã lưu của sách này");
        // Clear names in this transaction to permit swapping names without a transient
        // unique conflict.
        jdbc.update("update book_variant set name=null where book_copy_id=?", bookId);
        for (int i = 0; i < rows.size(); i++) {
            var row = rows.get(i);
            if (row.id() == null)
                jdbc.update("insert into book_variant(id,book_copy_id,name,stock,sort_order) values(?,?,?,?,?)",
                        UUID.randomUUID(), bookId, row.name(), row.stock(), i);
            else
                jdbc.update("update book_variant set name=?,stock=?,sort_order=? where id=? and book_copy_id=?",
                        row.name(), row.stock(), i, UUID.fromString(row.id()), bookId);
        }
        return read(bookId);
    }
}
