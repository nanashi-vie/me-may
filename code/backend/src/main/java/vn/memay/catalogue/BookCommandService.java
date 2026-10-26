package vn.memay.catalogue;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.*;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.auth.AdminUser;
import vn.memay.audit.AuditService;
import vn.memay.listing.*;
import vn.memay.taxonomy.CategoryRepository;
import vn.memay.common.AdminApiException;
@Service
public class BookCommandService {
 private final BookCopyRepository books;private final ListingRepository listings;private final CategoryRepository categories;private final BookCodeGenerator codes;private final BookValidation validation;private final BookAccess access;private final BookMapper mapper;private final AuditService audit;private final JdbcTemplate jdbc;private final Clock clock;private final EntityManager em;
 public BookCommandService(BookCopyRepository books,ListingRepository listings,CategoryRepository categories,BookCodeGenerator codes,BookValidation validation,BookAccess access,BookMapper mapper,AuditService audit,JdbcTemplate jdbc,Clock clock,EntityManager em){this.books=books;this.listings=listings;this.categories=categories;this.codes=codes;this.validation=validation;this.access=access;this.mapper=mapper;this.audit=audit;this.jdbc=jdbc;this.clock=clock;this.em=em;}
 @Transactional public BookDetail create(AdminUser actor,BookWrite input){
  var w=validation.normalize(input);validation.validateDraft(w);
  var b=new BookCopy();b.bookCode=codes.nextCode();b.availability=Availability.AVAILABLE;b.createdAt=clock.instant();b.updatedAt=b.createdAt;
  var l=new Listing();l.publicationStatus=Publication.DRAFT;l.slug=b.bookCode.toLowerCase(Locale.ROOT);l.updatedAt=b.updatedAt;
  apply(b,l,w);books.saveAndFlush(b);l.bookCopyId=b.id;listings.saveAndFlush(l);mappings(l,w);em.flush();var result=mapper.detail(b,l);audit.record(actor,"BOOK",b.id,"CREATE",Map.of(),audit.snapshot(result),b.version);return result;
 }
 @Transactional public BookDetail update(long id,long version,AdminUser actor,BookWrite input){
  var b=books.findById(id).orElseThrow(()->new AdminApiException(404,"not_found"));var l=listings.findByBookCopyId(id).orElseThrow();
  access.requireWritable(actor,l.publicationStatus);if(b.version!=version)throw AdminApiException.conflict(b.version);
  var w=validation.normalize(input);validation.validateDraft(w);var before=mapper.detail(b,l);
  if(mapper.write(before).equals(w))return before;
  apply(b,l,w);mappings(l,w);b.touch(clock.instant());l.updatedAt=b.updatedAt;em.flush();var after=mapper.detail(b,l);if(l.publicationStatus==Publication.PUBLISHED)validation.validatePublished(after);audit.record(actor,"BOOK",id,"UPDATE",audit.snapshot(before),audit.snapshot(after),b.version);return after;
 }
 private void apply(BookCopy b,Listing l,BookWrite w){
  b.title=w.title();b.isbn=w.isbn();b.publisher=w.publisher();b.author=w.author();b.language=w.language();b.binding=w.binding();b.conditionGrade=w.conditionGrade();b.conditionNote=w.conditionNote();
  l.priceVnd=w.priceVnd();l.description=w.description();l.categoryId=w.categoryCode()==null?null:categories.findByCode(w.categoryCode()).orElseThrow(()->AdminApiException.field("categoryCode","Thể loại không hợp lệ")).id;l.readingLevel=w.readingLevel();l.readingVideoUrl=w.readingVideoUrl();
 }
 private void mappings(Listing l,BookWrite w){
  Set<String> previous=new HashSet<>(jdbc.queryForList("select collection_id::text from listing_collection where listing_id=?",String.class,l.id));
  for(String value:w.collectionIds()){long id;try{id=Long.parseLong(value);}catch(RuntimeException e){throw AdminApiException.field("collectionIds","ID không hợp lệ");}var active=jdbc.queryForList("select active from collection where id=?",Boolean.class,id);if(active.isEmpty()||(!active.getFirst()&&!previous.contains(value)))throw AdminApiException.field("collectionIds","Bộ sưu tập không hoạt động");}
  jdbc.update("delete from listing_age_group where listing_id=?",l.id);for(String age:w.ageGroups())jdbc.update("insert into listing_age_group values (?,?)",l.id,age);
  jdbc.update("delete from listing_collection where listing_id=?",l.id);for(String value:w.collectionIds())jdbc.update("insert into listing_collection values (?,?)",l.id,Long.parseLong(value));
 }
}
