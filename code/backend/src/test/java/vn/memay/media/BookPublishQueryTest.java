package vn.memay.media;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;
import vn.memay.common.PerformanceTimings;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.support.BookFixtures;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@TestPropertySource(properties="memay.performance.enabled=true")
class BookPublishQueryTest extends MediaTestSupport {
 @Autowired UploadSessionService sessions;
 @Autowired PerformanceTimings timings;
 @Test void publishMapsOnlyRequiredSnapshotsAndPersistsMatchingAudit() throws Exception {
  var session=sessions.create(owner);var assignments=new ArrayList<MediaAssignment>();
  for(var role:List.of(MediaDtos.MediaRole.FRONT,MediaDtos.MediaRole.BACK)){
   var image=sessions.upload(UUID.fromString(session.id()),owner,ImageValidatorTest.image("jpeg"),null,null,null,UUID.randomUUID());
   assignments.add(new MediaAssignment(UUID.fromString(image.id()),role));
  }
  var logger=(Logger)LoggerFactory.getLogger(PerformanceTimings.class);var appender=new ListAppender<ILoggingEvent>();appender.start();logger.addAppender(appender);
  BookDetail result;
  try(var trace=timings.start("publish")) {
   result=commands.createPublished(owner,new BookCreate(BookFixtures.write("Measured","BOARD_BOOK",null,20000L,null,null,List.of(),List.of()),UUID.fromString(session.id()),assignments,true));
  } finally {logger.detachAppender(appender);appender.stop();}
  assertThat(appender.list.stream().filter(e->e.getFormattedMessage().contains("phase=mapping ")).count()).isEqualTo(1);
  assertThat(appender.list.stream().filter(e->e.getFormattedMessage().contains("phase=fingerprint ")).count()).isEqualTo(1);
  assertThat(result.publication()).isEqualTo(Publication.PUBLISHED);assertThat(result.publishedAt()).isNotNull();assertThat(result.media()).hasSize(2);assertThat(result.totalStock()).isEqualTo(1);
  var persisted=queries.detail(Long.parseLong(result.id()),owner);assertThat(result).isEqualTo(persisted);
  assertThat(jdbc.queryForObject("select count(*) from audit_event where target_id=? and action in ('CREATE','PUBLISHED')",Integer.class,Long.parseLong(result.id()))).isEqualTo(2);
  assertThat(appender.list.stream().filter(e->e.getFormattedMessage().contains("phase=query ")).count()).isLessThan(39);
 }
}
