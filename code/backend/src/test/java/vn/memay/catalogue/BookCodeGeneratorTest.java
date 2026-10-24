package vn.memay.catalogue;
import org.junit.jupiter.api.Test;
import vn.memay.support.PgTestData;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
class BookCodeGeneratorTest {
 @Test void expandsBeyondSixDigits(){
  assertThat(BookCodeGenerator.format(1)).isEqualTo("MM-000001");
  assertThat(BookCodeGenerator.format(999999)).isEqualTo("MM-999999");
  assertThat(BookCodeGenerator.format(1000000)).isEqualTo("MM-1000000");
 }
 @Test void concurrentNextCodeDoesNotReuseRollback(){
  String schema="code_"+UUID.randomUUID().toString().replace("-",""); var jdbc=PgTestData.jdbc(schema);
  try {
   PgTestData.jdbc().execute("create schema "+schema); jdbc.execute("create sequence book_code_seq no cycle");
   var generator=new BookCodeGenerator(jdbc);
   var first=generator.nextCode();
   var tx=new org.springframework.jdbc.datasource.DataSourceTransactionManager(jdbc.getDataSource());
   new org.springframework.transaction.support.TransactionTemplate(tx).execute(status->{ generator.nextCode(); status.setRollbackOnly(); return null; });
   assertThat(first).isEqualTo("MM-000001"); assertThat(generator.nextCode()).isEqualTo("MM-000003");
   try(var pool=Executors.newFixedThreadPool(4)){
    var tasks=new ArrayList<Callable<String>>(); for(int i=0;i<20;i++) tasks.add(generator::nextCode);
    var codes=new HashSet<String>(); for(var f:pool.invokeAll(tasks)) codes.add(f.get()); assertThat(codes).hasSize(20);
   }
  } catch(Exception e){ throw new RuntimeException(e); } finally { PgTestData.jdbc().execute("drop schema if exists "+schema+" cascade"); }
 }
}
