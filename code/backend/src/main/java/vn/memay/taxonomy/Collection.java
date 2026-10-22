package vn.memay.taxonomy;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="collection")
public class Collection {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,length=100) public String name;
 @Column(nullable=false,unique=true,length=120,updatable=false) public String slug;
 @Column(nullable=false) public Integer sortOrder;
 @Column(nullable=false) public Boolean active;
 @Version @Column(nullable=false) public Long version;
 @Column(nullable=false) public Instant createdAt;
 @Column(nullable=false) public Instant updatedAt;
}
