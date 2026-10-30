package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.listing.Listing;
import vn.memay.media.*;
import vn.memay.taxonomy.CategoryRepository;
import java.util.*;

@Component
public class BookMapper {
    private final JdbcTemplate jdbc;
    private final BookVariantStore variants;
    private final CategoryRepository categories;
    private final BookMediaRepository media;

    public BookMapper(JdbcTemplate jdbc, CategoryRepository categories, BookMediaRepository media, BookVariantStore variants) {
        this.variants = variants;
        this.jdbc = jdbc;
        this.categories = categories;
        this.media = media;
    }

    public BookDetail detail(BookCopy b, Listing l) {
        String category = l.categoryId == null ? null : categories.findById(l.categoryId).orElseThrow().code;
        var ages = jdbc.queryForList(
                "select age_group from listing_age_group where listing_id=? order by case age_group when 'AGE_0_3' then 0 when 'AGE_4_6' then 1 when 'AGE_7_9' then 2 else 3 end",
                String.class, l.id);
        var cols = jdbc.queryForList(
                "select collection_id::text from listing_collection where listing_id=? order by collection_id",
                String.class, l.id);
        var images = media.findByBookCopyIdAndState(b.id, MediaDtos.MediaState.ACTIVE).stream()
                .sorted(Comparator.comparing(x -> x.role.ordinal())).map(m -> new MediaView(m.id.toString(), m.role,
                        m.alt, m.sourceRef, "/api/v1/admin/books/" + b.id + "/media/" + m.role + "/content"))
                .toList();
        var stock = variants.read(b.id);
        return new BookDetail(b.id.toString(), b.bookCode, l.slug, b.version, b.title, b.isbn, b.publisher, b.author,
                b.language, b.binding, b.conditionGrade, b.conditionNote, l.priceMinVnd, l.priceMaxVnd, b.weightG, l.description, category, ages,
                l.readingLevel, l.readingVideoUrl, cols, l.publicationStatus, b.availability, l.publishedAt,
                b.createdAt, b.updatedAt, images, stock, stock.stream().mapToLong(VariantView::stock).sum());
    }

    public BookWrite write(BookDetail d) {
        return new BookWrite(d.title(), d.isbn(), d.publisher(), d.author(), d.language(), d.binding(),
                d.conditionGrade(), d.conditionNote(), d.priceMinVnd(), d.priceMaxVnd(), d.weightG(), d.description(), d.categoryCode(), d.ageGroups(),
                d.readingLevel(), d.readingVideoUrl(), d.collectionIds(), d.variants().stream().map(v -> new VariantWrite(v.id(), v.name(), v.stock())).toList());
    }
}
