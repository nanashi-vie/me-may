package vn.memay.media;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import java.time.*;
import java.sql.Timestamp;
import java.util.*;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import static vn.memay.media.UploadSessionDtos.*;

@Service
public class UploadSessionTransactions {
 private final JdbcTemplate jdbc; private final Clock clock; private final String namespace;
 public UploadSessionTransactions(JdbcTemplate jdbc,Clock clock,@Value("${memay.media.namespace:memay/dev}") String namespace) {
  this.jdbc=jdbc;this.clock=clock;this.namespace=namespace;
 }
 public void requireOwner(AdminUser actor) {
  var roles=jdbc.queryForList("select role from admin_user where id=? and active for share",String.class,actor.getId());
  if(roles.isEmpty())throw new AdminApiException(401,"unauthorized");
  if(!roles.getFirst().equals("OWNER"))throw new AdminApiException(403,"forbidden");
 }
 // Caller owns a DB transaction. Finalization and cleanup take this same session lock first.
 public Map<String,Object> lock(UUID id,AdminUser actor,boolean open) {
  requireOwner(actor);
  var rows=jdbc.queryForList("select * from upload_session where id=? and owner_id=? for update",id,actor.getId());
  if(rows.isEmpty())throw new AdminApiException(404,"not_found");
  var row=rows.getFirst();
  if(open) {
   if(!((Timestamp)row.get("expires_at")).toInstant().isAfter(clock.instant()))throw new AdminApiException(410,"upload_session_expired");
   if(!row.get("state").equals("OPEN"))throw new AdminApiException(409,"upload_session_closed");
  }
  return row;
 }
 @Transactional public UploadSession create(AdminUser actor) {
  requireOwner(actor);UUID id=UUID.randomUUID();Instant now=clock.instant();
  jdbc.update("insert into upload_session(id,owner_id,created_at,expires_at) values(?,?,?,?)",id,actor.getId(),Timestamp.from(now),Timestamp.from(now.plusSeconds(86400)));
  return view(id);
 }
 @Transactional public UploadSession get(UUID id,AdminUser actor) {lock(id,actor,true);return view(id);}
 private UploadSession view(UUID id) {
  var row=jdbc.queryForMap("select state,expires_at from upload_session where id=?",id);
  var media=jdbc.query("select * from temporary_media where session_id=? and state in ('UPLOADING','READY') order by created_at,id",(r,n)->new TemporaryMedia(r.getString("id"),r.getString("state"),r.getString("alt"),r.getString("source_ref"),r.getObject("width",Integer.class),r.getObject("height",Integer.class),"/api/v1/admin/upload-sessions/"+id+"/media/"+r.getString("id")),id);
  return new UploadSession(id.toString(),row.get("state").toString(),((Timestamp)row.get("expires_at")).toInstant(),media);
 }
 private String text(String field,String value,int max) {
  value=vn.memay.catalogue.BookValidation.trim(value);
  if(value!=null&&value.length()>max)throw AdminApiException.field(field,"Tối đa "+max+" ký tự");return value;
 }
 @Transactional public Intent begin(UUID session,AdminUser actor,UUID replace,String alt,String sourceRef) {
  lock(session,actor,true);
  long count=jdbc.queryForObject("select count(*) from temporary_media where session_id=? and state in ('READY','UPLOADING')",Long.class,session);
  if(replace!=null) {
   if(!Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from temporary_media where id=? and session_id=? and state='READY')",Boolean.class,replace,session)))throw new AdminApiException(404,"not_found");
   if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from temporary_media where replaces_id=? and state='UPLOADING')",Boolean.class,replace)))throw new AdminApiException(409,"replacement_in_progress");
  }
  if(count>=(replace==null?6:7))throw new AdminApiException(409,"media_limit");
  UUID id=UUID.randomUUID();Instant now=clock.instant();String key=namespace+"/"+id;
  jdbc.update("insert into temporary_media(id,session_id,state,storage_public_id,replaces_id,alt,source_ref,created_at,updated_at,delete_after) values(?,?,'UPLOADING',?,?,?,?,?,?,?)",id,session,key,replace,text("alt",alt,300),text("sourceRef",sourceRef,500),Timestamp.from(now),Timestamp.from(now),Timestamp.from(now.plusSeconds(3600)));
  return new Intent(id,session,key);
 }
 @Transactional public TemporaryMedia ready(Intent intent,AdminUser actor,MediaGateway.UploadedMedia uploaded) {
  lock(intent.sessionId(),actor,true);
  var rows=jdbc.queryForList("select * from temporary_media where id=? and session_id=? and state='UPLOADING' for update",intent.id(),intent.sessionId());
  if(rows.isEmpty())throw new AdminApiException(409,"media_conflict");
  if(!intent.publicId().equals(uploaded.publicId())||uploaded.assetId()==null||uploaded.format()==null||uploaded.bytes()<1||uploaded.width()<1||uploaded.height()<1)throw new AdminApiException(502,"media_provider_error");
  var replace=rows.getFirst().get("replaces_id");
  if(replace!=null&&jdbc.update("update temporary_media set state='DELETE_PENDING',delete_after=? where id=? and session_id=? and state='READY'",Timestamp.from(clock.instant()),replace,intent.sessionId())!=1)throw new AdminApiException(409,"media_conflict");
  jdbc.update("update temporary_media set state='READY',asset_id=?,format=?,bytes=?,width=?,height=?,updated_at=? where id=?",uploaded.assetId(),uploaded.format(),uploaded.bytes(),uploaded.width(),uploaded.height(),Timestamp.from(clock.instant()),intent.id());
  return view(intent.sessionId()).media().stream().filter(m->m.id().equals(intent.id().toString())).findFirst().orElseThrow();
 }
 @Transactional public void failed(UUID id) {
  jdbc.update("update temporary_media set state='DELETE_PENDING',delete_after=? where id=? and state='UPLOADING'",Timestamp.from(clock.instant().plusSeconds(3600)),id);
 }
 @Transactional public String contentKey(UUID session,UUID media,AdminUser actor) {
  lock(session,actor,true);var keys=jdbc.queryForList("select storage_public_id from temporary_media where id=? and session_id=? and state='READY'",String.class,media,session);
  if(keys.isEmpty())throw new AdminApiException(404,"not_found");return keys.getFirst();
 }
 @Transactional public void remove(UUID session,UUID media,AdminUser actor) {
  lock(session,actor,true);
  if(jdbc.update("update temporary_media set delete_after=case when state='UPLOADING' then delete_after else ? end,state='DELETE_PENDING' where id=? and session_id=? and state in ('UPLOADING','READY')",Timestamp.from(clock.instant()),media,session)==0)throw new AdminApiException(404,"not_found");
 }
 @Transactional public void cancel(UUID id,AdminUser actor) {
  lock(id,actor,true);jdbc.update("update upload_session set state='CANCELLED' where id=?",id);markPending(id);
 }
 private void markPending(UUID id) {
  jdbc.update("update temporary_media set delete_after=case when state='UPLOADING' then delete_after else ? end,state='DELETE_PENDING' where session_id=? and state in ('UPLOADING','READY')",Timestamp.from(clock.instant()),id);
 }
 @Transactional public void expire() {
  var sessions=jdbc.queryForList("select id from upload_session where state='OPEN' and expires_at<=? order by expires_at limit 100 for update skip locked",UUID.class,Timestamp.from(clock.instant()));
  for(UUID id:sessions){jdbc.update("update upload_session set state='CANCELLED' where id=?",id);markPending(id);}
  jdbc.update("update temporary_media set state='DELETE_PENDING' where state='UPLOADING' and delete_after<=?",Timestamp.from(clock.instant()));
 }
}
