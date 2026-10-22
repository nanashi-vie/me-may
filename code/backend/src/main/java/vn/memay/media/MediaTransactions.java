package vn.memay.media;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.*;
import java.time.Clock;
import java.util.*;
import vn.memay.catalogue.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.auth.AdminUser;
import vn.memay.listing.*;
import vn.memay.audit.AuditService;
import vn.memay.common.AdminApiException;
import static vn.memay.media.MediaDtos.*;
@Service
public class MediaTransactions {
 public record Intent(UUID id,String publicId){}
 private final vn.memay.auth.AdminUserRepository users;private final BookCopyRepository books;private final ListingRepository listings;private final BookMediaRepository images;private final BookAccess access;private final BookMapper mapper;private final AuditService audit;private final Clock clock;private final EntityManager em;private final JdbcTemplate jdbc;
 public MediaTransactions(vn.memay.auth.AdminUserRepository users,BookCopyRepository books,ListingRepository listings,BookMediaRepository images,BookAccess access,BookMapper mapper,AuditService audit,Clock clock,EntityManager em,JdbcTemplate jdbc){this.users=users;this.books=books;this.listings=listings;this.images=images;this.access=access;this.mapper=mapper;this.audit=audit;this.clock=clock;this.em=em;this.jdbc=jdbc;}
 private BookCopy book(long id,long version,AdminUser actor){actor=users.findById(actor.getId()).filter(AdminUser::isActive).orElseThrow(()->new AdminApiException(401,"unauthorized"));var b=books.findById(id).orElseThrow(()->new AdminApiException(404,"not_found"));if(b.version!=version)throw AdminApiException.conflict(b.version);access.requireWritable(actor,listings.findByBookCopyId(id).orElseThrow().publicationStatus);return b;}
 private String text(String key,String value,int max){value=BookValidation.trim(value);if(value!=null&&value.length()>max)throw AdminApiException.field(key,"Tối đa "+max+" ký tự");return value;}
 private String alt(String value,MediaRole role,String code){value=text("alt",value,300);return value!=null?value:switch(role){case FRONT->"Bìa trước ";case BACK->"Mặt sau ";case INSIDE->"Trang nội dung ";}+code;}
 @Transactional public Intent begin(long bookId,MediaRole role,long version,AdminUser actor,String alt,String sourceRef,String namespace){
  var b=book(bookId,version,actor);var m=new BookMedia();m.id=UUID.randomUUID();m.bookCopyId=bookId;m.role=role;m.state=MediaState.UPLOADING;m.storagePublicId=namespace+"/"+m.id;m.alt=alt(alt,role,b.bookCode);m.sourceRef=text("sourceRef",sourceRef,500);m.createdAt=clock.instant();m.updatedAt=m.createdAt;images.saveAndFlush(m);return new Intent(m.id,m.storagePublicId);
 }
 @Transactional public BookDetail attach(Intent intent,long bookId,long version,AdminUser actor,MediaGateway.UploadedMedia uploaded){
  var b=book(bookId,version,actor);var l=listings.findByBookCopyId(bookId).orElseThrow();var before=mapper.detail(b,l);
  // Flush aggregate version first: concurrent mutation loses before changing the active slot.
  b.touch(clock.instant());em.flush();var m=em.find(BookMedia.class,intent.id(),LockModeType.PESSIMISTIC_WRITE);
  if(m==null||m.state!=MediaState.UPLOADING||m.bookCopyId!=bookId)throw new AdminApiException(409,"media_conflict");
  if(!m.storagePublicId.equals(uploaded.publicId())||uploaded.assetId()==null||uploaded.format()==null||uploaded.bytes()<1||uploaded.width()<1||uploaded.height()<1)throw new AdminApiException(502,"media_provider_error");
  for(var previous:images.findByBookCopyIdAndState(bookId,MediaState.ACTIVE))if(previous.role==m.role){previous.state=MediaState.DELETE_PENDING;previous.updatedAt=clock.instant();}em.flush();
  m.state=MediaState.ACTIVE;m.assetId=uploaded.assetId();m.format=uploaded.format();m.bytes=uploaded.bytes();m.width=uploaded.width();m.height=uploaded.height();m.updatedAt=clock.instant();em.flush();var result=mapper.detail(b,l);audit.record(actor,"BOOK",bookId,"MEDIA_UPLOADED",audit.snapshot(before),audit.snapshot(result),b.version);return result;
 }
 @Transactional public void fail(UUID id){jdbc.update("update book_media set state='DELETE_PENDING',updated_at=? where id=? and state='UPLOADING'",java.sql.Timestamp.from(clock.instant()),id);}
 @Transactional public BookDetail metadata(long bookId,MediaRole role,long version,AdminUser actor,String alt,String sourceRef){
  var b=book(bookId,version,actor);var l=listings.findByBookCopyId(bookId).orElseThrow();var before=mapper.detail(b,l);var m=active(bookId,role);String nextAlt=alt(alt,role,b.bookCode),nextSource=text("sourceRef",sourceRef,500);if(Objects.equals(nextAlt,m.alt)&&Objects.equals(nextSource,m.sourceRef))return before;
  b.touch(clock.instant());em.flush();m.alt=nextAlt;m.sourceRef=nextSource;m.updatedAt=clock.instant();em.flush();var result=mapper.detail(b,l);audit.record(actor,"BOOK",bookId,"MEDIA_METADATA_CHANGED",audit.snapshot(before),audit.snapshot(result),b.version);return result;
 }
 @Transactional public BookDetail remove(long bookId,MediaRole role,long version,AdminUser actor){
  var b=book(bookId,version,actor);var l=listings.findByBookCopyId(bookId).orElseThrow();if(l.publicationStatus==Publication.PUBLISHED)throw new AdminApiException(409,"publication_requires_media");var before=mapper.detail(b,l);var m=active(bookId,role);b.touch(clock.instant());em.flush();m.state=MediaState.DELETE_PENDING;m.updatedAt=clock.instant();em.flush();var result=mapper.detail(b,l);audit.record(actor,"BOOK",bookId,"MEDIA_REMOVED",audit.snapshot(before),audit.snapshot(result),b.version);return result;
 }
 private BookMedia active(long bookId,MediaRole role){return images.findByBookCopyIdAndState(bookId,MediaState.ACTIVE).stream().filter(m->m.role==role).findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));}
 @Transactional(readOnly=true) public String activeKey(long id,MediaRole role){if(!books.existsById(id))throw new AdminApiException(404,"not_found");return active(id,role).storagePublicId;}
}
