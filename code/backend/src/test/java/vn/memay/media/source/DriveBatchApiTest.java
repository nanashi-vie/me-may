package vn.memay.media.source;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.context.TestPropertySource;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.CatalogueTestSupport;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;

@TestPropertySource(properties="memay.media.local.enabled=true")
class DriveBatchApiTest extends CatalogueTestSupport {
    @Value("${local.server.port}") int port;
    @Test void ownerCanImportButStaffAndMissingCsrfCannot() throws Exception {
        jdbc.update("INSERT INTO image_recipe VALUES('v1','fixture','{}') ON CONFLICT DO NOTHING");
        var api=new AdminHttpClient(port);
        api.login(owner.getEmail());
        var session=tree(api.send("POST","/api/v1/admin/upload-sessions","{}",true)).path("id").asString();
        String path="/api/v1/admin/drive-image-batches";
        String input=json(Map.of("mode","IMPORT","sessionId",session,"fileIds",List.of("file-a"),
                "targets",List.of(),"requestKey",UUID.randomUUID()));
        assertThat(api.send("POST",path,input,false).statusCode()).isEqualTo(403);
        var accepted=api.send("POST",path,input,true);
        assertThat(accepted.statusCode()).isEqualTo(202);
        String id=tree(accepted).path("id").asString();
        assertThat(api.send("GET",path+"/"+id,null,false).statusCode()).isEqualTo(200);
        api.login(staff.getEmail());
        assertThat(api.send("POST",path,input,true).statusCode()).isEqualTo(403);
        assertThat(api.send("GET",path+"/"+id,null,false).statusCode()).isEqualTo(403);
    }
}
