package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;
import java.util.*;

@Service
public class HeroBannerService {
 public record Banner(String id,String alt,String src,String srcset,int width,int height){}
 public record Config(long version,List<Banner> banners){}
 public record Item(UUID id,String alt){}
 public record Update(Long version,List<Item> banners){}
 private final JdbcTemplate jdbc;
 private final AuditService audit;
 public HeroBannerService(JdbcTemplate jdbc,AuditService audit){this.jdbc=jdbc;this.audit=audit;}
 private void owner(AdminUser actor,boolean lock){
  if(actor==null||actor.getRole()!=AdminUser.Role.OWNER||!actor.isActive())throw new AdminApiException(403,"forbidden");
  if(lock&&jdbc.queryForList("select id from admin_user where id=? and active=true and role='OWNER' for share",Long.class,actor.getId()).isEmpty())throw new AdminApiException(403,"forbidden");
 }
 @Transactional(readOnly=true) public Config get(AdminUser actor){owner(actor,false);return current();}
 @Transactional(readOnly=true) public List<Banner> published(){return current().banners();}
 private Config current(){
  long version=jdbc.queryForObject("select version from hero_banner_config where id=1",Long.class);
  var items=jdbc.query("select i.media_id,i.alt from hero_banner_item i join hero_banner_upload u using(media_id) join image_job j on j.id=u.job_id where j.status='READY' and u.published_at is not null order by i.position",(r,n)->banner(r.getObject(1,UUID.class),r.getString(2)));
  return new Config(version,items);
 }
 private Banner banner(UUID id,String alt){String path="/api/v1/hero-banners/"+id+"/content";return new Banner(id.toString(),alt,path+"?size=1600&format=webp",path+"?size=800&format=webp 800w, "+path+"?size=1600&format=webp 1600w, "+path+"?size=3200&format=webp 3200w",3200,800);}
 @Transactional public Config save(AdminUser actor,Update request){
  owner(actor,true);
  long version=jdbc.queryForObject("select version from hero_banner_config where id=1 for update",Long.class);
  if(request==null||request.version()==null||request.version()<0)throw AdminApiException.field("version","Missing version");
  if(request.version()!=version)throw AdminApiException.conflict(version);
  if(request.banners()==null||request.banners().size()>10)throw AdminApiException.field("banners","Maximum 10 banners");
  var ids=new LinkedHashSet<UUID>();var next=new ArrayList<Item>();
  for(var item:request.banners()){
   if(item==null||item.id()==null||!ids.add(item.id()))throw AdminApiException.field("banners","Invalid or duplicate banner");
   String alt=item.alt()==null?"":item.alt().strip();if(alt.length()>300)throw AdminApiException.field("banners","Description exceeds 300 characters");
   if(alt.isEmpty())alt="Xem tất cả sách tại Mẹ Mây";next.add(new Item(item.id(),alt));
  }
  for(UUID id:ids.stream().sorted().toList()){
   var rows=jdbc.queryForList("select u.media_id from hero_banner_upload u join image_job j on j.id=u.job_id where u.media_id=? and j.status='READY' and u.expires_at>clock_timestamp() and (u.owner_id=? or u.published_at is not null) for update of u",UUID.class,id,actor.getId());
   if(rows.isEmpty())throw new AdminApiException(409,"banner_not_available");
  }
  var before=current();var old=before.banners().stream().map(b->new Item(UUID.fromString(b.id()),b.alt())).toList();if(old.equals(next))return before;
  jdbc.update("update hero_banner_upload set expires_at=clock_timestamp()+interval '24 hours' where media_id in(select media_id from hero_banner_item)");
  jdbc.update("delete from hero_banner_item");
  for(int i=0;i<next.size();i++){
   var item=next.get(i);jdbc.update("insert into hero_banner_item(position,media_id,alt) values(?,?,?)",i,item.id(),item.alt());
   jdbc.update("update hero_banner_upload set published_at=coalesce(published_at,clock_timestamp()),expires_at='infinity' where media_id=?",item.id());
  }
  jdbc.update("update hero_banner_config set version=version+1 where id=1");
  var result=current();audit.record(actor,"HERO_BANNER",1,"UPDATE",Map.of("items",old),Map.of("items",next),result.version());return result;
 }
}
