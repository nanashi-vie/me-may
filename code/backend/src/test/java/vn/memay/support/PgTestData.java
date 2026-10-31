package vn.memay.support;
import java.net.URI;
import java.util.Properties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
public final class PgTestData {
 public static String requireTestJdbcUrl(String value) {
  if(value==null || !value.startsWith("jdbc:postgresql://")) throw new IllegalArgumentException("TEST_DB_URL must name me_may_test");
  try { if(!"/me_may_test".equals(URI.create(value.substring(5)).getPath())) throw new IllegalArgumentException(); }
  catch(RuntimeException e){ throw new IllegalArgumentException("TEST_DB_URL must name me_may_test"); }
  return value;
 }
 public static JdbcTemplate jdbc(){ return jdbc("public"); }
 public static JdbcTemplate jdbc(String schema){
  var ds=new DriverManagerDataSource(requireTestJdbcUrl(System.getenv("TEST_DB_URL")),System.getenv("DB_USER"),System.getenv("DB_PASSWORD"));
  var props=new Properties(); props.setProperty("currentSchema",schema); ds.setConnectionProperties(props); return new JdbcTemplate(ds);
 }
 public static void clean(JdbcTemplate jdbc){
  if(!"me_may_test".equals(jdbc.queryForObject("select current_database()",String.class))) throw new IllegalStateException("Refusing non-test database");
  for(String table:new String[]{"book_import_item","book_import_batch","temporary_media","upload_session","audit_event","flash_sale_item","book_media","listing_collection","listing_age_group","book_variant","listing","book_copy","collection"}) {
   if(Boolean.TRUE.equals(jdbc.queryForObject("select to_regclass(?) is not null",Boolean.class,table))) jdbc.execute("delete from "+table);
  }
  if(Boolean.TRUE.equals(jdbc.queryForObject("select to_regclass('flash_sale') is not null",Boolean.class))) jdbc.update("update flash_sale set enabled=false,starts_at=null,ends_at=null,version=0");
  jdbc.execute("delete from admin_user");
 }
}
