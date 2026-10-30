package vn.memay.support;
import vn.memay.catalogue.BookDtos.BookWrite;
import java.util.List;
public final class BookFixtures {
 public static BookWrite draft(String title){return write(title,null,null,null,null,null,List.of(),List.of());}
 public static BookWrite write(String title,String category,String binding,Long price,String level,String basis,List<String> ages,List<String> collections){
  return new BookWrite(title,"same-isbn",null,null,null,binding,null,"Ghi chú thực tế",price,price,250L,null,category,ages,level,null,collections,List.of(new vn.memay.catalogue.BookDtos.VariantWrite(null,null,1L)));
 }
 public static BookWrite variants(BookWrite w,java.util.List<vn.memay.catalogue.BookDtos.VariantView> rows){
  return new BookWrite(w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.binding(),w.conditionGrade(),w.conditionNote(),w.priceMinVnd(),w.priceMaxVnd(),w.weightG(),w.description(),w.categoryCode(),w.ageGroups(),w.readingLevel(),w.readingVideoUrl(),w.collectionIds(),rows.stream().map(v->new vn.memay.catalogue.BookDtos.VariantWrite(v.id(),v.name(),v.stock())).toList());
 }
}
