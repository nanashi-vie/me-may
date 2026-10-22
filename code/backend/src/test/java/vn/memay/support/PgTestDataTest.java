package vn.memay.support;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class PgTestDataTest {
 @Test void rejectsDevDatabaseBeforeConnecting(){
  for(String bad:new String[]{null,"","jdbc:postgresql://localhost:5432/me_may_dev","jdbc:postgresql://localhost:5432/me_may_test_extra","not a URI"})
   assertThatThrownBy(()->PgTestData.requireTestJdbcUrl(bad)).isInstanceOf(IllegalArgumentException.class);
  assertThat(PgTestData.requireTestJdbcUrl("jdbc:postgresql://localhost:5432/me_may_test")).endsWith("/me_may_test");
 }
}
