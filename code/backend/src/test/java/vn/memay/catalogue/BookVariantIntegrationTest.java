package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookVariantIntegrationTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;
    Map<String,Object> variant(String id,String name,Object stock) {
        var row=new LinkedHashMap<String,Object>();row.put("id",id);row.put("name",name);row.put("stock",stock);return row;
    }
    Map<String,Object> body(BookDtos.BookDetail b,List<?> variants) {
        var w=new LinkedHashMap<String,Object>(JSON.convertValue(b,Map.class));
        for(String key:List.of("id","bookCode","slug","publication","availability","publishedAt","createdAt","updatedAt","media","totalStock"))w.remove(key);
        w.put("variants",variants);return w;
    }
    @Test void stockAndAvailabilityCommitTogether() throws Exception {
        var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var b=ready();
        String id=jdbc.queryForObject("select id::text from book_variant where book_copy_id=?",String.class,Long.parseLong(b.id()));
        var write=body(b,List.of(variant(id,"Độ mới cao",2),variant(null,"Có cấn góc",1)));
        var saved=api.send("PUT","/api/v1/admin/books/"+b.id(),json(write),true);
        assertThat(saved.statusCode()).isEqualTo(200);var book=tree(saved);
        assertThat(book.path("totalStock").asLong()).isEqualTo(3);
        assertThat(book.path("variants").size()).isEqualTo(2);
        assertThat(book.path("priceMinVnd").asLong()).isEqualTo(10000);
        assertThat(book.path("version").asLong()).isEqualTo(b.version()+1);
        String second=book.path("variants").get(1).path("id").asString();
        write.put("version",book.path("version").asLong());write.put("variants",List.of(variant(id,"Độ mới cao",0),variant(second,"Có cấn góc",1)));
        book=tree(api.send("PUT","/api/v1/admin/books/"+b.id(),json(write),true));
        assertThat(book.path("totalStock").asLong()).isEqualTo(1);assertThat(book.path("availability").asString()).isEqualTo("AVAILABLE");
        write.put("version",book.path("version").asLong());write.put("variants",List.of(variant(id,"Độ mới cao",0),variant(second,"Có cấn góc",0)));
        book=tree(api.send("PUT","/api/v1/admin/books/"+b.id(),json(write),true));
        assertThat(book.path("totalStock").asLong()).isZero();assertThat(book.path("availability").asString()).isEqualTo("SOLD");
        write.put("version",book.path("version").asLong());
        assertThat(tree(api.send("PUT","/api/v1/admin/books/"+b.id(),json(write),true)).path("version").asLong()).isEqualTo(book.path("version").asLong());
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("select count(*) from book_media",Long.class)).isEqualTo(3L);
        assertThat(jdbc.queryForObject("select after_data->>'totalStock' from audit_event where action='UPDATE' order by id desc limit 1",String.class)).isEqualTo("0");
        assertThat(api.send("PATCH","/api/v1/admin/books/"+b.id()+"/availability",json(Map.of("version",book.path("version").asLong(),"availability","AVAILABLE")),true).statusCode()).isEqualTo(409);
    }
    @Test void rejectsInvalidOrForeignVariants() throws Exception {
        var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var b=ready();var other=ready();
        String id=jdbc.queryForObject("select id::text from book_variant where book_copy_id=?",String.class,Long.parseLong(b.id()));
        String foreign=jdbc.queryForObject("select id::text from book_variant where book_copy_id=?",String.class,Long.parseLong(other.id()));
        var invalid=new ArrayList<List<?>>();invalid.add(List.of());invalid.add(Arrays.asList((Object)null));
        for(Object stock:Arrays.asList(null,-1,1.5,"2",1000000))invalid.add(List.of(variant(id,null,stock)));
        invalid.add(List.of(variant(id,"A",1),variant(null," a ",1)));
        invalid.add(List.of(variant(id,null,1),variant(null,"B",1)));
        invalid.add(List.of(variant(id,"x".repeat(101),1)));
        invalid.add(List.of(variant(foreign,"A",1)));invalid.add(List.of(variant(null,null,1)));
        invalid.add(List.of(variant(id,"A",1),variant(id,"B",1)));
        invalid.add(List.of(variant(UUID.randomUUID().toString(),null,1)));
        for(var rows:invalid)assertThat(api.send("PUT","/api/v1/admin/books/"+b.id(),json(body(b,rows)),true).statusCode()).isIn(400,409);
        var missing=body(b,null);assertThat(api.send("PUT","/api/v1/admin/books/"+b.id(),json(missing),true).statusCode()).isEqualTo(400);
        assertThat(queries.detail(Long.parseLong(b.id()),owner).version()).isEqualTo(b.version());
        assertThat(jdbc.queryForObject("select count(*) from book_variant",Long.class)).isEqualTo(2L);
        api.login("staff@catalogue.test");assertThat(api.send("PUT","/api/v1/admin/books/"+b.id(),json(body(b,List.of(variant(id,null,0)))),true).statusCode()).isEqualTo(403);
    }
    @Test void concurrentStockUpdatesShareAggregateVersion() throws Exception {
        var api=new AdminHttpClient(port);api.login("owner@catalogue.test");var b=ready();
        String id=jdbc.queryForObject("select id::text from book_variant where book_copy_id=?",String.class,Long.parseLong(b.id()));
        String a=json(body(b,List.of(variant(id,null,0)))),c=json(body(b,List.of(variant(id,null,9))));
        api.send("GET","/api/v1/auth/csrf",null,false);
        var first=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{return api.send("PUT","/api/v1/admin/books/"+b.id(),a,true).statusCode();}catch(Exception e){throw new RuntimeException(e);}});
        int second=api.send("PUT","/api/v1/admin/books/"+b.id(),c,true).statusCode();
        assertThat(List.of(first.get(),second)).containsExactlyInAnyOrder(200,409);
        var fresh=tree(api.send("GET","/api/v1/admin/books/"+b.id(),null,false));
        long stock=fresh.path("totalStock").asLong();assertThat(stock).isIn(0L,9L);
        assertThat(fresh.path("availability").asString()).isEqualTo(stock==0?"SOLD":"AVAILABLE");
        assertThat(jdbc.queryForObject("select count(*) from audit_event where action='UPDATE'",Long.class)).isEqualTo(1L);
    }
}
