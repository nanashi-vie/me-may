package vn.memay.catalogue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

class BookEntryContractTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;
    Map<String,Object> body(BookDtos.BookDetail b) {
        var w=new LinkedHashMap<String,Object>(JSON.convertValue(b,Map.class));
        for(String key:List.of("id","bookCode","slug","publication","availability","publishedAt","createdAt","updatedAt","media","totalStock","stock","stockLimit","internalNote","unitPricePerKgVnd")) w.remove(key);
        return w;
    }
    AdminHttpClient ownerApi() throws Exception {var api=new AdminHttpClient(port);api.login("owner@catalogue.test");return api;}
    @Test void emptyInternalNoteDoesNotBlockPublishing() throws Exception {
        var api=ownerApi();var b=ready();var w=body(b);w.remove("conditionNote");w.remove("conditionGrade");w.put("internalNote",null);
        var saved=api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true);
        assertThat(saved.statusCode()).isEqualTo(200);
        var pub=api.send("PATCH","/api/v1/admin/books/"+b.id()+"/publication",json(Map.of("version",tree(saved).path("version").asLong(),"status","PUBLISHED","confirmedActualCopy",true)),true);
        assertThat(pub.statusCode()).isEqualTo(200);
        assertThat(tree(pub).path("internalNote").isNull()).isTrue();
    }
    @Test void legacyMetadataUpdatePreservesNewFields() throws Exception {
        var api=ownerApi();var b=ready();var w=body(b);w.remove("conditionNote");w.put("internalNote","private");w.put("unitPricePerKgVnd",80000);
        var r=api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true);assertThat(r.statusCode()).isEqualTo(200);
        w.remove("internalNote");w.remove("unitPricePerKgVnd");w.put("version",tree(r).path("version").asLong());w.put("title","Changed");
        r=api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true);assertThat(r.statusCode()).isEqualTo(200);
        assertThat(tree(r).path("internalNote").asString()).isEqualTo("private");
        assertThat(tree(r).path("unitPricePerKgVnd").asLong()).isEqualTo(80000);
    }
    @Test void explicitNullClearsOptionalFields() throws Exception {
        var api=ownerApi();var b=ready();var w=body(b);w.remove("conditionNote");w.put("internalNote","private");w.put("unitPricePerKgVnd",80000);
        var r=api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true);assertThat(r.statusCode()).isEqualTo(200);
        w.put("version",tree(r).path("version").asLong());w.put("internalNote",null);w.put("unitPricePerKgVnd",null);
        r=api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true);assertThat(r.statusCode()).isEqualTo(200);
        assertThat(tree(r).path("internalNote").isNull()).isTrue();assertThat(tree(r).path("unitPricePerKgVnd").isNull()).isTrue();
    }
    @Test void manualPricesWinOverUnitPrice() throws Exception {
        var api=ownerApi();var b=ready();var w=body(b);w.put("unitPricePerKgVnd",80000);w.put("weightG",450);w.put("priceMinVnd",40000);w.put("priceMaxVnd",48000);
        var r=api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true);assertThat(r.statusCode()).isEqualTo(200);
        assertThat(tree(r).path("priceMinVnd").asLong()).isEqualTo(40000);assertThat(tree(r).path("priceMaxVnd").asLong()).isEqualTo(48000);
        assertThat(tree(r).path("unitPricePerKgVnd").asLong()).isEqualTo(80000);
    }
    @Test void pooledStockPreservesLegacyRows() throws Exception {
        var api=ownerApi();var b=ready();long id=Long.parseLong(b.id());
        jdbc.update("update book_variant set name='A',stock=2 where book_copy_id=?",id);
        jdbc.update("insert into book_variant(book_copy_id,name,stock,sort_order) values(?,'B',3,1)",id);
        var originals=queries.detail(id,owner).variants();
        for(long desired:new long[]{4,6,0}) {
            var current=queries.detail(id,owner);var w=body(current);w.remove("variants");w.put("stock",desired);
            var r=api.send("PUT","/api/v1/admin/books/"+id,json(w),true);assertThat(r.statusCode()).isEqualTo(200);
            var saved=queries.detail(id,owner);assertThat(saved.totalStock()).isEqualTo(desired);
            assertThat(saved.variants()).extracting(BookDtos.VariantView::id).containsExactlyElementsOf(originals.stream().map(BookDtos.VariantView::id).toList());
            assertThat(saved.variants()).extracting(BookDtos.VariantView::name).containsExactly("A","B");
            if(desired==4) assertThat(saved.variants()).extracting(BookDtos.VariantView::stock).containsExactly(2L,2L);
            if(desired==6) assertThat(saved.variants()).extracting(BookDtos.VariantView::stock).containsExactly(4L,2L);
            assertThat(saved.availability().name()).isEqualTo(desired==0?"SOLD":"AVAILABLE");
        }
    }
    @Test void largeLegacyStockRemainsEditable() throws Exception {
        var api=ownerApi();var b=ready();long id=Long.parseLong(b.id());
        jdbc.update("update book_variant set name='A',stock=999999 where book_copy_id=?",id);
        jdbc.update("insert into book_variant(book_copy_id,name,stock,sort_order) values(?,'B',999999,1)",id);
        var current=queries.detail(id,owner);var w=body(current);w.remove("variants");w.remove("conditionNote");w.put("internalNote","remember");
        var r=api.send("PUT","/api/v1/admin/books/"+id,json(w),true);assertThat(r.statusCode()).isEqualTo(200);
        assertThat(tree(r).path("stock").asLong()).isEqualTo(1999998);assertThat(tree(r).path("stockLimit").asLong()).isEqualTo(1999998);
        w.put("version",tree(r).path("version").asLong());w.put("stock",1999999);
        assertThat(api.send("PUT","/api/v1/admin/books/"+id,json(w),true).statusCode()).isEqualTo(400);
        assertThat(queries.detail(id,owner).totalStock()).isEqualTo(1999998);
    }
    @Test void rejectsMixedNullAndFractionalPooledStock() throws Exception {
        var api=ownerApi();var b=ready();var w=body(b);w.put("stock",1);
        assertThat(api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true).statusCode()).isEqualTo(400);
        w.remove("variants");
        for(Object value:Arrays.asList(null,-1,1.5,"2",1000000)) {
            w.put("stock",value);assertThat(api.send("PUT","/api/v1/admin/books/"+b.id(),json(w),true).statusCode()).isEqualTo(400);
        }
        assertThat(queries.detail(Long.parseLong(b.id()),owner).version()).isEqualTo(b.version());
    }
    @Test void titleDuplicateIsAdvisoryAcrossAllStatuses() throws Exception {
        var api=ownerApi();var b=ready();long id=Long.parseLong(b.id());
        jdbc.update("update book_copy set title='Same',availability='SOLD' where id=?",id);
        var r=api.send("GET","/api/v1/admin/books/title-duplicate?title=%20SAME%20",null,false);
        assertThat(r.statusCode()).isEqualTo(200);assertThat(tree(r).path("duplicate").asBoolean()).isTrue();
        assertThat(r.headers().firstValue("cache-control").orElse("")).contains("no-store");
        assertThat(tree(api.send("GET","/api/v1/admin/books/title-duplicate?title=same&excludeId="+id,null,false)).path("duplicate").asBoolean()).isFalse();
        assertThat(tree(api.send("GET","/api/v1/admin/books/title-duplicate?title=%25",null,false)).path("duplicate").asBoolean()).isFalse();
        assertThat(tree(api.send("GET","/api/v1/admin/books/title-duplicate?title=Sa%20me",null,false)).path("duplicate").asBoolean()).isFalse();
        assertThat(api.send("GET","/api/v1/admin/books/title-duplicate?title="+"x".repeat(301),null,false).statusCode()).isEqualTo(400);
        api.login("staff@catalogue.test");assertThat(api.send("GET","/api/v1/admin/books/title-duplicate?title=same",null,false).statusCode()).isEqualTo(200);
        assertThat(new AdminHttpClient(port).send("GET","/api/v1/admin/books/title-duplicate?title=same",null,false).statusCode()).isEqualTo(401);
    }
}
