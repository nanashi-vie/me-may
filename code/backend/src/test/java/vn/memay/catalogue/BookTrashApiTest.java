package vn.memay.catalogue;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.CatalogueTestSupport;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookTrashApiTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;
    @Autowired BookTrashService trash;

    @Test void hidesRestoresAndPurgesWithDurableImageCleanupAndReceipt() throws Exception {
        var api=new AdminHttpClient(port);
        api.login("owner@catalogue.test");
        var book=ready();
        long id=Long.parseLong(book.id());
        String path="/api/v1/admin/books/"+id;
        var published=api.send("PATCH",path+"/publication",
                json(Map.of("version",book.version(),"status","PUBLISHED","confirmedActualCopy",true)),true);
        assertThat(published.statusCode()).isEqualTo(200);
        var version=tree(published).path("version").asLong();
        api.login("staff@catalogue.test");
        assertThat(api.send("PATCH",path+"/trash",json(Map.of("version",version,"trashed",true)),true).statusCode()).isEqualTo(403);
        api.login("owner@catalogue.test");
        assertThat(api.send("PATCH",path+"/trash",json(Map.of("version",version,"trashed",true)),true).statusCode()).isEqualTo(204);
        assertThat(api.send("GET",path,null,false).statusCode()).isEqualTo(404);
        assertThat(api.send("GET","/api/v1/books/"+book.slug(),null,false).statusCode()).isEqualTo(404);
        assertThat(api.send("GET","/api/v1/books/"+book.slug()+"/media/FRONT",null,false).statusCode()).isEqualTo(404);
        var trashed=tree(api.send("GET","/api/v1/admin/books/trash",null,false)).path("items").get(0);
        assertThat(trashed.path("id").asString()).isEqualTo(book.id());
        assertThat(api.send("PATCH",path+"/trash",json(Map.of("version",version,"trashed",false)),true).statusCode()).isEqualTo(409);
        assertThat(api.send("PATCH",path+"/trash",json(Map.of("version",version+1,"trashed",false)),true).statusCode()).isEqualTo(204);
        var restored=tree(api.send("GET",path,null,false));
        assertThat(restored.path("publishedAt")).isEqualTo(tree(published).path("publishedAt"));
        assertThat(restored.path("publication").asString()).isEqualTo("ARCHIVED");
        assertThat(api.send("PATCH",path+"/trash",json(Map.of("version",version+2,"trashed",true)),true).statusCode()).isEqualTo(204);
        var deleted=Instant.parse("2020-01-01T00:00:00Z");
        jdbc.update("update book_copy set deleted_at=? where id=?",Timestamp.from(deleted),id);
        var batch=java.util.UUID.randomUUID();
        jdbc.update("insert into book_import_batch(id,fingerprint,schema_version,owner_id) values(?,?,?,?)",
                batch,"a".repeat(64),4,owner.getId());
        jdbc.update("insert into book_import_item(batch_id,group_key,book_id,book_code,title) values(?,?,?,?,?)",
                batch,"R001",id,book.bookCode(),book.title());
        trash.purgeExpired(deleted.plusSeconds(604799));
        assertThat(jdbc.queryForObject("select count(*) from book_copy where id=?",Long.class,id)).isEqualTo(1);
        assertThat(api.send("PATCH",path+"/trash",json(Map.of("version",version+3,"trashed",false)),true).statusCode()).isEqualTo(409);
        trash.purgeExpired(deleted.plusSeconds(604800));
        trash.purgeExpired(deleted.plusSeconds(604801));
        assertThat(jdbc.queryForObject("select count(*) from book_copy where id=?",Long.class,id)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from book_media where book_copy_id is null and state='DELETE_PENDING'",Long.class)).isEqualTo(3);
        var receipt=new BookImportStore(jdbc).find("a".repeat(64)).orElseThrow();
        assertThat(receipt.books().getFirst().purged()).isTrue();
        assertThat(receipt.books().getFirst().bookCode()).isEqualTo(book.bookCode());
    }
}
