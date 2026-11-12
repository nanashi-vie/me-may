package vn.memay.media;

import java.io.*;
import java.nio.file.Path;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;

@Service
@ConditionalOnProperty(prefix="memay.media.local",name="enabled",havingValue="true")
public class HeroBannerMedia {
 public record Upload(UUID id,UUID jobId,String status,String previewUrl,String errorCode){}
 public record Content(byte[] bytes,String mime,String etag){}
 private final LocalImageStore store;
 private final JdbcTemplate jdbc;
 private final ImageJobRepository jobs;
 private final UploadLimiter limiter;
 private final MediaRecoveryMode mode;
 public HeroBannerMedia(@Value("${memay.media.local.root}") String root,JdbcTemplate jdbc,ImageJobRepository jobs,UploadLimiter limiter,MediaRecoveryMode mode){
  this.store=new LocalImageStore(Path.of(root).resolve("banners"));this.jdbc=jdbc;this.jobs=jobs;this.limiter=limiter;this.mode=mode;
 }
 LocalImageStore store(){return store;}
 private void owner(AdminUser a,boolean lock){
  if(a==null||a.getRole()!=AdminUser.Role.OWNER||!a.isActive())throw new AdminApiException(403,"forbidden");
  if(lock&&jdbc.queryForList("select id from admin_user where id=? and role='OWNER' and active=true for update",Long.class,a.getId()).isEmpty())throw new AdminApiException(403,"forbidden");
 }
 @Transactional public Upload upload(AdminUser a,UUID requestKey,InputStream input){
  mode.requireActive();owner(a,true);if(requestKey==null)throw AdminApiException.field("requestKey","Required");
  try(var limit=limiter.acquire(a.getId())){
   UUID inputId=UUID.randomUUID();LocalImageStore.StagedInput staged;
   try{staged=store.stage(inputId,input);}catch(IOException e){throw new AdminApiException(422,"invalid_image_input");}
   TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){public void afterCompletion(int status){if(status!=STATUS_COMMITTED)discard(inputId);}});
   var old=jdbc.queryForList("select media_id,sha256 from hero_banner_upload where owner_id=? and request_key=?",a.getId(),requestKey);
   if(!old.isEmpty()){
    discard(inputId);if(!staged.sha256().equals(old.getFirst().get("sha256")))throw new AdminApiException(409,"request_key_reused");
    return status(a,(UUID)old.getFirst().get("media_id"));
   }
   int drafts=jdbc.queryForObject("select count(*) from hero_banner_upload where owner_id=? and published_at is null and expires_at>clock_timestamp()",Integer.class,a.getId());
   if(drafts>=30)throw new AdminApiException(429,"banner_draft_limit");
   if(!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from image_recipe where version='hero-v1')",Boolean.class)))throw new AdminApiException(503,"banner_recipe_unavailable");
   UUID media=UUID.randomUUID(),generation=UUID.randomUUID();String key="banners/"+staged.key();
   UUID job=jobs.enqueue(media,generation,ImageTypes.JobKind.PROCESS,key,"hero-v1","hero:"+a.getId()+":"+requestKey,10);
   jobs.registerOriginalHash(generation,staged.sha256());
   jdbc.update("insert into hero_banner_upload(media_id,generation_id,job_id,owner_id,request_key,input_key,sha256) values(?,?,?,?,?,?,?)",media,generation,job,a.getId(),requestKey,key,staged.sha256());
   return status(a,media);
  }
 }
 private void discard(UUID id){try{store.discardStaging(id);}catch(IOException ignored){/* Unreferenced staging is swept later. */}}
 @Transactional(readOnly=true) public Upload status(AdminUser a,UUID id){
  owner(a,false);var rows=jdbc.queryForList("select u.*,j.status,j.error_code from hero_banner_upload u join image_job j on j.id=u.job_id where u.media_id=? and u.expires_at>clock_timestamp()",id);
  if(rows.isEmpty())throw new AdminApiException(404,"banner_not_found");var r=rows.getFirst();
  if(((Number)r.get("owner_id")).longValue()!=a.getId()&&r.get("published_at")==null)throw new AdminApiException(403,"forbidden");
  return new Upload(id,(UUID)r.get("job_id"),(String)r.get("status"),"/api/v1/admin/hero-banners/uploads/"+id+"/content",(String)r.get("error_code"));
 }
 boolean lockUpload(UUID media,UUID generation){return !jdbc.queryForList("select media_id from hero_banner_upload where media_id=? and generation_id=? and expires_at>clock_timestamp() for update",UUID.class,media,generation).isEmpty();}
 @Transactional(readOnly=true) public Content content(AdminUser actor,UUID id,int size,String format,boolean privatePreview){
  if(!Set.of(800,1600,3200).contains(size)||!Set.of("jpg","webp").contains(format))throw new AdminApiException(400,"invalid_banner_variant");
  if(privatePreview)status(actor,id);
  String mime=format.equals("jpg")?"image/jpeg":"image/webp";
  var variants=jdbc.query("select v.* from hero_banner_upload u join image_job j on j.id=u.job_id join image_variant v on v.generation_id=u.generation_id where u.media_id=? and j.status='READY' and u.expires_at>clock_timestamp() and (? or u.published_at is not null) and v.name=? and v.mime=?",(r,n)->new ImageTypes.Variant(r.getString("name"),r.getString("storage_key"),r.getString("mime"),r.getInt("width"),r.getInt("height"),r.getLong("bytes"),r.getString("sha256")),id,privatePreview,Integer.toString(size),mime);
  if(variants.isEmpty())throw new AdminApiException(404,"banner_not_found");
  var v=variants.getFirst();
  try{return new Content(store.readVariant(id,v),mime,"\""+v.sha256()+"\"");}catch(IOException e){throw new AdminApiException(404,"banner_not_found");}
 }
 @org.springframework.scheduling.annotation.Scheduled(fixedDelayString="${memay.media.banners.cleanup-delay-ms:3600000}")
 @Transactional public void cleanup(){
  if(mode.isolated())return;
  jdbc.queryForObject("select id from hero_banner_config where id=1 for update",Integer.class);
  var expired=jdbc.queryForList("select u.* from hero_banner_upload u join image_job j on j.id=u.job_id where u.expires_at<=clock_timestamp() and not exists(select 1 from hero_banner_item i where i.media_id=u.media_id) and not(j.status='PROCESSING' and j.lease_until>clock_timestamp()) limit 100 for update of j,u skip locked");
  for(var r:expired){
   UUID id=(UUID)r.get("media_id"),generation=(UUID)r.get("generation_id");
   try{store.discardGeneration(id,generation);store.discardStaging(UUID.fromString(((String)r.get("input_key")).split("/")[2]));}catch(IOException e){throw new IllegalStateException("banner_cleanup_deferred",e);}
   jdbc.update("delete from hero_banner_upload where media_id=?",id);jdbc.update("delete from image_job where media_id=?",id);jdbc.update("delete from image_generation where media_id=?",id);jdbc.update("delete from image_asset where media_id=?",id);
  }
  try{for(var id:store.stagingBefore(java.time.Instant.now().minusSeconds(86400))){
   boolean referenced=Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from hero_banner_upload where input_key=?) or exists(select 1 from image_job where lease_token=? and status='PROCESSING' and lease_until>clock_timestamp())",Boolean.class,"banners/staging/"+id+"/input",id));
   if(!referenced)store.discardStaging(id);
  }}catch(IOException e){throw new IllegalStateException("banner_cleanup_deferred",e);}
 }
}
