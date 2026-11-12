package vn.memay.catalogue;

import java.time.Instant;
import java.util.List;

public final class PublicCatalogueDtos {
    public record ImageVariant(String url, int size, String format, int width, int height) {}

    public record Media(String role, String alt, String contentPath, String cacheKey,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
            List<ImageVariant> imageVariants) {
    }

    public record Variant(String id, String name, boolean available) {
    }

    public record Book(String id, String bookCode, String slug, String title, String publisher, String author,
            List<String> ageGroups, String categoryCode, String binding, String conditionGrade, String conditionNote,
            Long priceMinVnd, Long priceMaxVnd, Long salePriceVnd, Instant saleEndsAt, Long weightG, String description,
            String readingLevel,
            String readingVideoUrl, String availability, List<Media> media, List<Variant> variants, List<BookDtos.Feature> features) {
    }

    public record Collection(String slug, String name) {
    }

    public record CollectionPage(Collection collection, BookDtos.Page<Book> books) {
    }

    public record Shelf(String title, String href, List<Book> books) {
    }

    public record Home(List<Shelf> shelves, List<HeroBannerService.Banner> banners) {
    }

    public record Contact(String hotlineUrl, String groupUrl) {
    }

    public record RelatedBooks(List<Book> samePublisherBooks, List<Book> sameCategoryBooks) {
    }
}
