package vn.memay.media;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="book_media")
public class BookMedia {
 @Id  public java.util.UUID id;
 @Column(nullable=false) public Long bookCopyId;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) public MediaDtos.MediaRole role;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=16) public MediaDtos.MediaState state;
 @Column(nullable=false,unique=true,length=300,updatable=false) public String storagePublicId;
 @Column(length=200) public String assetId;
 @Column(length=16) public String format;
  public Long bytes;
  public Integer width;
  public Integer height;
 @Column(length=300) public String alt;
 @Column(length=500) public String sourceRef;
 @Column(nullable=false) public Instant createdAt;
 @Column(nullable=false) public Instant updatedAt;
}
