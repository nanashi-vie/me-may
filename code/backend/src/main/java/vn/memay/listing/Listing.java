package vn.memay.listing;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="listing")
public class Listing {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,unique=true,updatable=false) public Long bookCopyId;
 @Column(nullable=false,unique=true,length=80,updatable=false) public String slug;
  public Long priceVnd;
 @Column(length=10000) public String description;
  public Long categoryId;
 @Column(length=8) public String readingLevel;
 @Column(length=1000) public String readingLevelBasis;
 @Column(length=2048) public String readingVideoUrl;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) public vn.memay.catalogue.BookDtos.Publication publicationStatus;
  public Instant publishedAt;
 @Column(nullable=false) public Instant updatedAt;
}
