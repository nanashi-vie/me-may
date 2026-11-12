package vn.memay.catalogue;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.*;
import java.util.*;
import static vn.memay.support.AdminHttpClient.*;
import static org.assertj.core.api.Assertions.*;
class HeroBannerApiTest extends CatalogueTestSupport {
 @Value("${local.server.port}") int port;
 AdminHttpClient api;
 @BeforeEach void login()throws Exception{api=new AdminHttpClient(port);api.login("owner@catalogue.test");}
 private UUID upload(long actor,String state){
  UUID id=UUID.randomUUID(),g=UUID.randomUUID(),j=UUID.randomUUID();
  jdbc.update("insert into image_recipe(version,worker_digest,configuration) values('v1','test','{}') on conflict do nothing");
  jdbc.update("insert into image_asset(media_id) values(?)",id);
  jdbc.update("insert into image_generation(id,media_id,recipe_version) values(?,?,'v1')",g,id);
  jdbc.update("insert into image_job(id,media_id,generation_id,kind,status,input_key,dedupe_key) values(?,?,?,'PROCESS',?,'banners/staging/00000000-0000-0000-0000-000000000000/input',?)",j,id,g,state,j.toString());
  jdbc.update("insert into hero_banner_upload(media_id,generation_id,job_id,owner_id,request_key,input_key,sha256) values(?,?,?,?,?,'banners/staging/00000000-0000-0000-0000-000000000000/input',?)",id,g,j,actor,UUID.randomUUID(),"0".repeat(64));return id;
 }
 @Test void savesOrdersClearsAndRejectsStaleWithoutTouchingShelves()throws Exception{
  var initial=api.send("GET","/api/v1/admin/hero-banners",null,false);assertThat(initial.statusCode()).isEqualTo(200);assertThat(tree(initial).path("version").asLong()).isZero();
  var a=upload(owner.getId(),"READY");var b=upload(owner.getId(),"READY");long shelves=jdbc.queryForObject("select version from home_featured_config where id=1",Long.class);
  String body=json(Map.of("version",0,"banners",List.of(Map.of("id",a,"alt","A"),Map.of("id",b,"alt","B"))));
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",body,true).statusCode()).isEqualTo(200);
  var home=tree(new AdminHttpClient(port).send("GET","/api/v1/home",null,false));assertThat(home.path("banners").get(0).path("id").asString()).isEqualTo(a.toString());
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",body,true).statusCode()).isEqualTo(409);
  var reorder=json(Map.of("version",1,"banners",List.of(Map.of("id",b,"alt","B"),Map.of("id",a,"alt","A"))));assertThat(api.send("PUT","/api/v1/admin/hero-banners",reorder,true).statusCode()).isEqualTo(200);
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",2,"banners",List.of())),true).statusCode()).isEqualTo(200);
  assertThat(tree(new AdminHttpClient(port).send("GET","/api/v1/home",null,false)).path("banners").size()).isZero();
  assertThat(jdbc.queryForObject("select version from home_featured_config where id=1",Long.class)).isEqualTo(shelves);
  assertThat(jdbc.queryForObject("select expires_at > clock_timestamp()+interval '23 hours' from hero_banner_upload where media_id=?",Boolean.class,a)).isTrue();
 }
 @Test void enforcesTenReadyOwnerScopedUniqueUploads()throws Exception{
  var items=new ArrayList<Map<String,Object>>();for(int i=0;i<11;i++)items.add(Map.of("id",upload(owner.getId(),"READY"),"alt","Banner"));
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",items)),true).statusCode()).isEqualTo(400);
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",List.of(items.get(0),items.get(0)))),true).statusCode()).isEqualTo(400);
  for(UUID id:List.of(upload(staff.getId(),"READY"),upload(owner.getId(),"PENDING"))){assertThat(api.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",List.of(Map.of("id",id,"alt","X")))),true).statusCode()).isEqualTo(409);}
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",items.subList(0,10))),true).statusCode()).isEqualTo(200);
 }
 @Test void ownerOnlyAndNoopAuditRollback()throws Exception{
  String empty=json(Map.of("version",0,"banners",List.of()));assertThat(api.send("PUT","/api/v1/admin/hero-banners",empty,true).statusCode()).isEqualTo(200);assertThat(jdbc.queryForObject("select version from hero_banner_config",Long.class)).isZero();
  var id=upload(owner.getId(),"READY");jdbc.execute("alter table audit_event add constraint hero_test_audit_failure check(target_type <> 'HERO_BANNER') not valid");
  try{assertThat(api.send("PUT","/api/v1/admin/hero-banners",json(Map.of("version",0,"banners",List.of(Map.of("id",id,"alt","X")))),true).statusCode()).isEqualTo(409);assertThat(jdbc.queryForObject("select count(*) from hero_banner_item",Integer.class)).isZero();}finally{jdbc.execute("alter table audit_event drop constraint hero_test_audit_failure");}
  assertThat(api.send("PUT","/api/v1/admin/hero-banners",empty,false).statusCode()).isEqualTo(403);
  api.login("staff@catalogue.test");for(String method:List.of("GET","PUT"))assertThat(api.send(method,"/api/v1/admin/hero-banners",method.equals("PUT")?empty:null,true).statusCode()).isEqualTo(403);
  assertThat(new AdminHttpClient(port).send("GET","/api/v1/admin/hero-banners",null,false).statusCode()).isEqualTo(401);
 }
 @Test void simultaneousEditorsOnlyOneVersionWins()throws Exception{
  var id=upload(owner.getId(),"READY");var other=new AdminHttpClient(port);other.login(owner.getEmail());
  String body=json(Map.of("version",0,"banners",List.of(Map.of("id",id,"alt","Race"))));
  var gate=new java.util.concurrent.CountDownLatch(1);
  try(var pool=java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()){
   var one=pool.submit(()->{gate.await();return api.send("PUT","/api/v1/admin/hero-banners",body,true).statusCode();});
   var two=pool.submit(()->{gate.await();return other.send("PUT","/api/v1/admin/hero-banners",body,true).statusCode();});gate.countDown();
   assertThat(List.of(one.get(),two.get())).containsExactlyInAnyOrder(200,409);
  }
 }

 @org.springframework.beans.factory.annotation.Autowired HeroBannerService bannerService;
 @org.springframework.beans.factory.annotation.Autowired vn.memay.audit.AuditService audit;
 @Test void configurationReadRemainsConsistentWhenSaveCommitsDuringRead(){
  UUID id=upload(owner.getId(),"READY");var once=new java.util.concurrent.atomic.AtomicBoolean(true);
  var observed=new org.springframework.jdbc.core.JdbcTemplate(jdbc.getDataSource()){
   @Override public <T> T query(String sql,org.springframework.jdbc.core.ResultSetExtractor<T> extractor){
    T result=super.query(sql,extractor);
    if(sql.toLowerCase(java.util.Locale.ROOT).contains("from hero_banner_config")&&once.compareAndSet(true,false))
     bannerService.save(owner,new HeroBannerService.Update(0L,List.of(new HeroBannerService.Item(id,"Concurrent"))));
    return result;
   }
  };
  var view=new HeroBannerService(observed,audit).get(owner);
  assertThat(once.get()).as("Controlled interleaving executed").isFalse();
  assertThat(view.version()==0&&view.banners().isEmpty()||view.version()==1&&view.banners().size()==1)
   .as("A reader sees a complete version, never old version with new items").isTrue();
 }

}
