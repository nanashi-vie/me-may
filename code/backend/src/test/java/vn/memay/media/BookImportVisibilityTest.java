package vn.memay.media;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import vn.memay.catalogue.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.catalogue.BookImportDtos.*;
import vn.memay.support.AdminHttpClient;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class BookImportVisibilityTest extends MediaTestSupport {
    @Autowired BookImportTransaction imports;@Autowired BookStatusService status;@Value("${local.server.port}") int port;
    BookDetail hidden() {
        var row=new CellRow("Sach",2,Map.of("nhom_sach","A","ten_sach","Imported synthetic","ngon_ngu","Tiếng Anh",
                "the_loai","BOARD_BOOK","gia_tu","21000","gia_den","25000","trong_luong_g","300","tinh_trang","HIGH_FRESHNESS","mo_ta_tinh_trang","Bìa đẹp","ton_kho","3"));
        var doc=new BookImportValidator(new BookValidation()).normalize(List.of(row));
        return queries.detail(Long.parseLong(imports.commit(owner,doc).receipt().books().getFirst().id()),owner);
    }
    @Test void unpublishedFilterCombinesWithExistingFiltersAndReturnsPublishedAt() {
        var fresh=hidden();var old=ready();old=status.publication(Long.parseLong(old.id()),old.version(),owner,Publication.PUBLISHED,true);
        status.publication(Long.parseLong(old.id()),old.version(),owner,Publication.ARCHIVED,false);
        var live=ready();status.publication(Long.parseLong(live.id()),live.version(),owner,Publication.PUBLISHED,true);
        var result=queries.list(owner,new BookFilter(null,null,null,0,20,true));
        assertThat(result.items()).hasSize(1);assertThat(result.items().getFirst().id()).isEqualTo(fresh.id());
        assertThat(result.items().getFirst().publishedAt()).isNull();assertThat(result.items().getFirst().totalStock()).isEqualTo(3);
        assertThat(queries.list(owner,new BookFilter(null,Publication.PUBLISHED,null,0,20,true)).items()).isEmpty();
        assertThat(queries.list(owner,new BookFilter(null,null,Availability.SOLD,0,20,true)).items()).isEmpty();
        assertThat(queries.list(owner,new BookFilter(null,null,null,0,20,false)).items()).hasSize(3);
    }
    @Test void importedHiddenMediaStaysPrivateUntilFirstPublication()throws Exception {
        var b=hidden();long id=Long.parseLong(b.id());
        b=media.upload(id,MediaDtos.MediaRole.FRONT,b.version(),owner,ImageValidatorTest.image("png"),null,null);
        final var front=b;assertThatThrownBy(()->status.publication(id,front.version(),owner,Publication.PUBLISHED,true)).hasMessageContaining("media");
        b=media.upload(id,MediaDtos.MediaRole.BACK,b.version(),owner,ImageValidatorTest.image("png"),null,null);
        var anon=new AdminHttpClient(port);
        assertThat(anon.send("GET","/api/v1/books/"+b.slug(),null,false).statusCode()).isEqualTo(404);
        assertThat(anon.send("GET","/api/v1/books/"+b.slug()+"/media/FRONT",null,false).statusCode()).isEqualTo(404);
        assertThat(AdminHttpClient.tree(anon.send("GET","/api/v1/books/lookup?code="+b.bookCode(),null,false)).size()).isZero();
        assertThat(anon.send("GET","/api/v1/books",null,false).body()).doesNotContain(b.bookCode());
        final var withPhotos=b;assertThatThrownBy(()->status.publication(id,withPhotos.version(),staff,Publication.PUBLISHED,true)).hasMessageContaining("forbidden");
        assertThatThrownBy(()->status.publication(id,withPhotos.version()-1,owner,Publication.PUBLISHED,true)).hasMessageContaining("version_conflict");
        b=status.publication(id,b.version(),owner,Publication.PUBLISHED,true);var first=b.publishedAt();assertThat(first).isNotNull();
        assertThat(anon.send("GET","/api/v1/books/"+b.slug(),null,false).statusCode()).isEqualTo(200);
        assertThat(anon.send("GET","/api/v1/books/"+b.slug()+"/media/FRONT",null,false).statusCode()).isEqualTo(200);
        b=status.publication(id,b.version(),owner,Publication.ARCHIVED,false);b=status.publication(id,b.version(),owner,Publication.PUBLISHED,true);
        assertThat(b.publishedAt()).isEqualTo(first);assertThat(b.id()).isEqualTo(withPhotos.id());
        assertThat(jdbc.queryForObject("select count(*) from book_copy",Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from upload_session",Long.class)).isZero();
    }
}
