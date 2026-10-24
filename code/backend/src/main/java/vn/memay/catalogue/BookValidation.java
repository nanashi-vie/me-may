package vn.memay.catalogue;
import org.springframework.stereotype.Component;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.net.URI;
@Component
public class BookValidation {
 public static final List<String> AGES=List.of("AGE_0_3","AGE_4_6","AGE_7_9","AGE_10_PLUS");
 public static final List<String> LEVELS=List.of("PRE_A1","A1","A2","B1","B2","C1","C2");
 public static String trim(String v){return v==null||v.isBlank()?null:v.trim();}
 private static void text(String key,String value,int max){if(value!=null&&value.length()>max)throw AdminApiException.field(key,"Tối đa "+max+" ký tự");}
 public BookWrite normalize(BookWrite w){
  if(w==null)throw AdminApiException.field("body","Thiếu nội dung");
  return new BookWrite(trim(w.title()),trim(w.isbn()),trim(w.publisher()),trim(w.author()),trim(w.language()),trim(w.binding()),trim(w.conditionGrade()),trim(w.conditionNote()),w.priceVnd(),trim(w.description()),trim(w.categoryCode()),ordered(w.ageGroups(),Comparator.comparingInt(AGES::indexOf)),trim(w.readingLevel()),trim(w.readingVideoUrl()),ordered(w.collectionIds(),Comparator.comparing(java.math.BigInteger::new)));
 }
 private static List<String> ordered(List<String> input,Comparator<String> comparator){
  if(input==null)return List.of();var values=new ArrayList<>(input);try{values.sort(comparator);}catch(RuntimeException ignored){return input;}return values;
 }
 public void validateDraft(BookWrite w){
  text("title",w.title(),300);text("isbn",w.isbn(),32);text("publisher",w.publisher(),200);text("author",w.author(),200);text("language",w.language(),50);text("conditionNote",w.conditionNote(),4000);text("description",w.description(),10000);text("readingVideoUrl",w.readingVideoUrl(),2048);
  if("PICTURE_BOOK".equals(w.categoryCode())){if(!List.of("PAPERBACK","HARDCOVER").contains(w.binding()==null?"":w.binding()))throw AdminApiException.field("binding","Chọn Paperback hoặc Hardcover");}
  else if(w.binding()!=null)throw AdminApiException.field("binding","Chỉ dùng cho Picture book");
  if(w.conditionGrade()!=null&&!List.of("VERY_GOOD","GOOD","FAIR").contains(w.conditionGrade()))throw AdminApiException.field("conditionGrade","Không hợp lệ");
  if(w.priceVnd()!=null&&(w.priceVnd()<1||w.priceVnd()>999999999999L))throw AdminApiException.field("priceVnd","Giá nguyên VND phải lớn hơn 0");
  if(w.ageGroups().size()>4||w.ageGroups().stream().anyMatch(Objects::isNull)||new HashSet<>(w.ageGroups()).size()!=w.ageGroups().size()||!AGES.containsAll(w.ageGroups()))throw AdminApiException.field("ageGroups","Nhóm tuổi không hợp lệ hoặc trùng");
  if(w.collectionIds().size()>100||w.collectionIds().stream().anyMatch(Objects::isNull)||new HashSet<>(w.collectionIds()).size()!=w.collectionIds().size())throw AdminApiException.field("collectionIds","Bộ sưu tập không hợp lệ hoặc trùng");
  if(w.readingLevel()!=null){if(!LEVELS.contains(w.readingLevel()))throw AdminApiException.field("readingLevel","Mức đọc không hợp lệ");}
  if(w.readingVideoUrl()!=null){try{var u=URI.create(w.readingVideoUrl());if(!"https".equalsIgnoreCase(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||w.readingVideoUrl().chars().anyMatch(c->c<32||c==127))throw new IllegalArgumentException();}catch(RuntimeException ex){throw AdminApiException.field("readingVideoUrl","Dùng URL HTTPS hợp lệ");}}
 }
 public void validatePublished(BookDetail b){
  if(trim(b.title())==null)throw AdminApiException.field("title","Nhập tên sách");
  if(b.categoryCode()==null)throw AdminApiException.field("categoryCode","Chọn thể loại");
  if(b.priceVnd()==null)throw AdminApiException.field("priceVnd","Nhập giá tham khảo");
  if(trim(b.conditionNote())==null)throw AdminApiException.field("conditionNote","Mô tả tình trạng thực tế");
  if(b.media().size()!=3 || !new HashSet<>(b.media().stream().map(BookDtos.MediaView::role).toList()).equals(java.util.EnumSet.allOf(vn.memay.media.MediaDtos.MediaRole.class)))throw AdminApiException.field("media","Cần đủ bìa trước, mặt sau và một trang nội dung");
 }
}
