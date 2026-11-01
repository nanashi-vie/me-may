package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import vn.memay.support.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

class CategoryExpansionTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;
    @Autowired BookStatusService status;
    @Test void bothTaxonomiesExposeTheRequestedLabelsAndManualBooksCanUseThem()throws Exception {
        var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
        for(String path:List.of("/api/v1/taxonomy","/api/v1/admin/taxonomy")) {
            var response=api.send("GET",path,null,false);assertThat(response.statusCode()).isEqualTo(200);
            var labels=new LinkedHashMap<String,String>();tree(response).path("categories").forEach(item->labels.put(item.path("code").asString(),item.path("label").asString()));
            assertThat(labels).containsEntry("READING_PRACTICE","Tập đọc").containsEntry("COOKING_CRAFT_ACTIVITY","Nấu ăn - thủ công - activity book");
        }
        for(String code:List.of("READING_PRACTICE","COOKING_CRAFT_ACTIVITY")) {
            var book=ready();var write=BookFixtures.write("New category "+code,code,null,21000L,null,null,List.of(),List.of());
            book=update(Long.parseLong(book.id()),book.version(),owner,write);
            book=status.publication(Long.parseLong(book.id()),book.version(),owner,BookDtos.Publication.PUBLISHED,true);
            assertThat(book.categoryCode()).isEqualTo(code);assertThat(book.binding()).isNull();
            var response=api.send("GET","/api/v1/books?category="+code,null,false);
            assertThat(response.statusCode()).isEqualTo(200);assertThat(tree(response).path("totalElements").asInt()).isEqualTo(1);
            assertThat(tree(response).path("items").get(0).path("bookCode").asString()).isEqualTo(book.bookCode());
        }
    }
    @Test void v12AddsCategoriesWithoutChangingExistingCategoriesOrBooks() {
        String schema="categories_"+UUID.randomUUID().toString().replace("-","");var db=PgTestData.jdbc(schema);
        var config=Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema);
        try {
            config.target("11").load().migrate();var old=db.queryForList("select * from category order by id");
            db.update("insert into book_copy(id,book_code,title,availability) values(1,'MM-000001','Keep old','AVAILABLE')");
            db.update("insert into listing(book_copy_id,slug,publication_status,category_id) values(1,'keep-old','ARCHIVED',(select id from category where code='BOARD_BOOK'))");
            var books=db.queryForList("select b.*,l.* from book_copy b join listing l on b.id=l.book_copy_id");
            config.target(MigrationVersion.LATEST).load().migrate();
            assertThat(db.queryForList("select * from category where sort_order<6 order by id")).isEqualTo(old);
            assertThat(db.queryForObject("select count(*) from category",Long.class)).isEqualTo(8);
            assertThat(db.queryForList("select b.*,l.* from book_copy b join listing l on b.id=l.book_copy_id")).isEqualTo(books);
        } finally {PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade");}
    }
}
