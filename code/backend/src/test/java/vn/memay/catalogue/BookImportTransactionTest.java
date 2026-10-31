package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.support.CatalogueTestSupport;
import vn.memay.catalogue.BookImportDtos.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

class BookImportTransactionTest extends CatalogueTestSupport {
    @Autowired BookImportTransaction imports;
    @Autowired BookImportStore receipts;
    final BookImportValidator validator=new BookImportValidator(new BookValidation());
    ImportDocument document() {return validator.normalize(List.of(BookImportValidationTest.row(2,"A","Mới","2"),BookImportValidationTest.row(3,"A","Lỗi","1"),BookImportValidationTest.row(4,"B","","0")));}
    long count(String table){return jdbc.queryForObject("select count(*) from "+table,Long.class);}
    @Test void createsHiddenBooksWithoutAnyImageSessionOrPublishedAudit() {
        var result=imports.commit(owner,document());assertThat(result.created()).isTrue();
        assertThat(result.receipt().books()).hasSize(2);assertThat(count("book_variant")).isEqualTo(3);
        assertThat(count("book_media")).isZero();assertThat(count("upload_session")).isZero();
        assertThat(jdbc.queryForList("select publication_status from listing",String.class)).containsOnly("ARCHIVED");
        assertThat(jdbc.queryForObject("select count(*) from listing where published_at is not null",Long.class)).isZero();
        assertThat(jdbc.queryForList("select action from audit_event",String.class)).containsExactly("CREATE","CREATE");
        assertThat(jdbc.queryForList("select after_data->>'source' from audit_event",String.class)).containsOnly("IMPORT");
        assertThat(queries.detail(Long.parseLong(result.receipt().books().getFirst().id()),owner).totalStock()).isEqualTo(3);
        assertThatThrownBy(()->imports.commit(staff,document())).hasMessageContaining("forbidden");
    }
    @Test void errorOnLastBookRollsBackWholeBatch() {
        var doc=validator.normalize(List.of(BookImportValidationTest.row(2,"A","","1"),BookImportValidationTest.change(BookImportValidationTest.row(3,"B","","1"),"ten_sach","reject-last")));
        jdbc.execute("alter table book_copy add constraint import_test_reject check(title <> 'reject-last')");
        try { assertThatThrownBy(()->imports.commit(owner,doc)).isInstanceOf(RuntimeException.class); }
        finally {jdbc.execute("alter table book_copy drop constraint import_test_reject");}
        for(String table:List.of("book_copy","listing","book_variant","audit_event","book_import_batch","book_import_item"))assertThat(count(table)).as(table).isZero();
        assertThat(receipts.find(doc.fingerprint())).isEmpty();
        assertThat(imports.commit(owner,doc).created()).isTrue();assertThat(count("book_copy")).isEqualTo(2);
    }
    @Test void concurrentSameFileReturnsOneReceipt() throws Exception {
        var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        var other=users.save(new vn.memay.auth.AdminUser("other@import.test","unused-test-hash",vn.memay.auth.AdminUser.Role.OWNER));
        try {
            Callable<CommitResult> work=()->{start.await();return imports.commit(owner,document());};
            var a=pool.submit(work);var b=pool.submit(()->{start.await();return imports.commit(other,document());});start.countDown();
            var first=a.get(20,TimeUnit.SECONDS);var second=b.get(20,TimeUnit.SECONDS);
            assertThat(first.receipt().id()).isEqualTo(second.receipt().id());assertThat(first.created()).isNotEqualTo(second.created());
            assertThat(count("book_import_batch")).isEqualTo(1);assertThat(count("book_copy")).isEqualTo(2);assertThat(count("book_variant")).isEqualTo(3);
        } finally {pool.shutdownNow();}
    }
    @Test void retryAfterCollectionDeactivationDoesNotOverwriteEditedBook() {
        jdbc.update("insert into collection(name,slug,active) values('New','new',true)");
        var doc=validator.normalize(List.of(BookImportValidationTest.change(BookImportValidationTest.row(2,"A","","1"),"bo_suu_tap","new")));
        var first=imports.commit(owner,doc);String id=first.receipt().books().getFirst().id();
        jdbc.update("update collection set active=false where slug='new'");
        jdbc.update("update book_copy set title='Edited',version=7 where id=?",Long.parseLong(id));
        jdbc.update("update book_variant set stock=9 where book_copy_id=?",Long.parseLong(id));
        var retry=imports.commit(owner,doc);assertThat(retry.created()).isFalse();assertThat(retry.receipt()).isEqualTo(first.receipt());
        assertThat(queries.detail(Long.parseLong(id),owner).title()).isEqualTo("Edited");assertThat(queries.detail(Long.parseLong(id),owner).totalStock()).isEqualTo(9);
        assertThat(queries.detail(Long.parseLong(id),owner).version()).isEqualTo(7);assertThat(count("audit_event")).isEqualTo(1);
    }
}
