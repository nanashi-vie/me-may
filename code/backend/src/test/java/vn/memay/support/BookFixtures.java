package vn.memay.support;
import vn.memay.catalogue.BookDtos.BookWrite;
import java.util.List;
public final class BookFixtures {
 public static BookWrite draft(String title){return write(title,null,null,null,null,null,List.of(),List.of());}
 public static BookWrite write(String title,String category,String binding,Long price,String level,String basis,List<String> ages,List<String> collections){
  return new BookWrite(title,"same-isbn",null,null,null,binding,null,"Ghi chú thực tế",price,null,category,ages,level,null,collections);
 }
}
