package vn.memay.support;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.*;
import java.util.*;
/** Seed legacy archived records for update/read tests; creation behavior is tested through finalization. */
public final class BookTestData {
 public static BookDtos.BookDetail seed(JdbcTemplate jdbc,BookQueryService queries,AdminUser actor,BookDtos.BookWrite w) {
  String code=BookCodeGenerator.format(jdbc.queryForObject("select nextval('book_code_seq')",Long.class));
  Long id=jdbc.queryForObject("insert into book_copy(book_code,title,isbn,publisher,author,language,binding,condition_grade,condition_note,weight_g) values(?,?,?,?,?,?,?,?,?,?) returning id",Long.class,code,w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.binding(),w.conditionGrade(),w.conditionNote(),w.weightG());
  jdbc.update("insert into book_variant(book_copy_id,stock,sort_order) values(?,1,0)",id);
  Long category=w.categoryCode()==null?null:jdbc.queryForObject("select id from category where code=?",Long.class,w.categoryCode());
  Long listing=jdbc.queryForObject("insert into listing(book_copy_id,slug,price_min_vnd,price_max_vnd,description,category_id,reading_level,reading_video_url,publication_status) values(?,?,?,?,?,?,?,?,'ARCHIVED') returning id",Long.class,id,code.toLowerCase(Locale.ROOT),w.priceMinVnd(),w.priceMaxVnd(),w.description(),category,w.readingLevel(),w.readingVideoUrl());
  if(w.ageGroups()!=null)for(var age:w.ageGroups())jdbc.update("insert into listing_age_group values(?,?)",listing,age);
  if(w.collectionIds()!=null)for(var collection:w.collectionIds())jdbc.update("insert into listing_collection values(?,?)",listing,Long.parseLong(collection));
  jdbc.update("insert into audit_event(actor_id,target_type,target_id,action,aggregate_version) values(?,'BOOK',?,'CREATE',0)",actor.getId(),id);
  return queries.detail(id,actor);
 }
}
