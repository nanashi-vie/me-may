package vn.memay.taxonomy;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="category")
public class Category {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,unique=true,length=32) public String code;
 @Column(nullable=false,length=100) public String name;
 @Column(nullable=false,unique=true,length=100) public String slug;
 @Column(nullable=false) public Integer sortOrder;
}
