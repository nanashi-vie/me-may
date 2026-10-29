package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import vn.memay.support.*;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class OptimisticConflictApiTest extends CatalogueTestSupport {
 @MockitoBean BookStatusService status;@Value("${local.server.port}")int port;
 @Test void rawAndTranslatedLockExceptionsIncludeCommittedCurrentVersion()throws Exception{
  var b=seed(owner,BookFixtures.draft("A"));var api=new AdminHttpClient(port);api.login("owner@catalogue.test");
  for(var exception:new RuntimeException[]{new jakarta.persistence.OptimisticLockException("concurrent"),new org.springframework.orm.ObjectOptimisticLockingFailureException(BookCopy.class,Long.parseLong(b.id()))}){
   doThrow(exception).when(status).availability(anyLong(),anyLong(),any(),any());var r=api.send("PATCH","/api/v1/admin/books/"+b.id()+"/availability",AdminHttpClient.json(Map.of("version",b.version(),"availability","SOLD")),true);assertThat(r.statusCode()).isEqualTo(409);assertThat(AdminHttpClient.tree(r).path("currentVersion").isNumber()).isTrue();assertThat(AdminHttpClient.tree(r).path("currentVersion").asLong()).isEqualTo(b.version());
  }
 }
}
