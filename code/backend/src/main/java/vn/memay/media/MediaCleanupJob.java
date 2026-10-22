package vn.memay.media;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Clock;
import java.util.UUID;
@Component
public class MediaCleanupJob {
 private final JdbcTemplate jdbc;private final MediaGateway gateway;private final Clock clock;
 public MediaCleanupJob(JdbcTemplate jdbc,MediaGateway gateway,Clock clock){this.jdbc=jdbc;this.gateway=gateway;this.clock=clock;}
 @Scheduled(fixedDelayString="${memay.media.cleanup-delay-ms:600000}",initialDelayString="${memay.media.cleanup-delay-ms:600000}")
 public void runOnce(){
  // Conditional claim shares the row lock used by attach. ACTIVE can never be claimed.
  jdbc.update("update book_media set state='DELETE_PENDING',updated_at=? where id in (select id from book_media where state='UPLOADING' and updated_at<? order by updated_at,id limit 100 for update skip locked) and state='UPLOADING'",java.sql.Timestamp.from(clock.instant()),java.sql.Timestamp.from(clock.instant().minusSeconds(3600)));
  var pending=jdbc.query("select id,storage_public_id from book_media where state='DELETE_PENDING' order by updated_at,id limit 100",(r,n)->new MediaTransactions.Intent(r.getObject("id",UUID.class),r.getString("storage_public_id")));
  for(var intent:pending){try{gateway.delete(intent.publicId());jdbc.update("delete from book_media where id=? and state='DELETE_PENDING'",intent.id());}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(MediaCleanupJob.class).warn("Media cleanup deferred: {}",intent.id());}}
 }
}
