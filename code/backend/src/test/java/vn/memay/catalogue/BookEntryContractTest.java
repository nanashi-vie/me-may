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
}
