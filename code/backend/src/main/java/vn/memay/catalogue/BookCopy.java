package vn.memay.catalogue;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "book_copy")
public class BookCopy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, unique = true, length = 32, updatable = false)
    public String bookCode;
    @Column(length = 300)
    public String title;
    @Column(length = 32)
    public String isbn;
    @Column(length = 200)
    public String publisher;
    @Column(length = 200)
    public String author;
    @Column(length = 50)
    public String language;
    @Column(length = 16)
    public String binding;
    @Column(length = 16)
    public String conditionGrade;
    @Column(length = 4000)
    public String conditionNote;
    @Column(name="weight_g")
    public Long weightG;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    public BookDtos.Availability availability;
    @Version
    @Column(nullable = false)
    public Long version;
    @Column(nullable = false)
    public Instant createdAt;
    @Column(nullable = false)
    public Instant updatedAt;

    public void touch(Instant now) {
        updatedAt = updatedAt == null || now.isAfter(updatedAt) ? now : updatedAt.plusNanos(1000);
    }
}
