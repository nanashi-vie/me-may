package vn.memay.catalogue;
import java.time.Instant;
import java.util.List;
public final class PublicCatalogueDtos {
 public record Media(String role,String alt,String contentPath){}
 public record Book(String id,String bookCode,String slug,String title,String publisher,String author,List<String> ageGroups,String categoryCode,String binding,String conditionGrade,String conditionNote,Long priceVnd,Long originalPriceVnd,Instant saleEndsAt,String description,String readingLevel,String readingVideoUrl,String availability,List<Media> media){}
 public record Collection(String slug,String name){}
 public record CollectionPage(Collection collection,BookDtos.Page<Book> books){}
 public record Shelf(String title,String href,List<Book> books){}
 public record Home(List<Shelf> shelves){}
 public record Contact(String hotlineUrl,String groupUrl){}
}
