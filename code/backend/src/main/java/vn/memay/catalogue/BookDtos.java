package vn.memay.catalogue;

import java.time.Instant;
import java.util.List;
import vn.memay.media.MediaDtos.MediaRole;

public final class BookDtos {
    public enum Publication {
        PUBLISHED, ARCHIVED
    }

    public enum Availability {
        AVAILABLE, SOLD
    }

    public record BookWrite(String title, String isbn, String publisher, String author, String language, String binding,
            String conditionGrade, String conditionNote, Long priceMinVnd, Long priceMaxVnd, Long weightG, String description, String categoryCode,
            List<String> ageGroups, String readingLevel, String readingVideoUrl, List<String> collectionIds) {
    }

    public record MediaAssignment(java.util.UUID mediaId, MediaRole role) {}
    public record BookCreate(BookWrite write, java.util.UUID uploadSessionId, List<MediaAssignment> media, boolean confirmedActualCopy) {}

    public record BookUpdate(
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
            String title, String isbn, String publisher, String author, String language, String binding,
            String conditionGrade, String conditionNote, Long priceMinVnd, Long priceMaxVnd, Long weightG, String description, String categoryCode,
            List<String> ageGroups, String readingLevel, String readingVideoUrl, List<String> collectionIds, List<MediaAssignment> media) {
        public BookWrite write() {
            return new BookWrite(title, isbn, publisher, author, language, binding, conditionGrade, conditionNote,
                    priceMinVnd, priceMaxVnd, weightG, description, categoryCode, ageGroups, readingLevel, readingVideoUrl, collectionIds);
        }
    }

    public record PublicationChange(
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
            @jakarta.validation.constraints.NotNull Publication status, Boolean confirmedActualCopy) {
    }

    public record AvailabilityChange(
            @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero Long version,
            @jakarta.validation.constraints.NotNull Availability availability) {
    }

    public record MediaView(String id, MediaRole role, String alt, String sourceRef, String contentPath) {
    }

    public record BookDetail(String id, String bookCode, String slug, long version, String title, String isbn,
            String publisher, String author, String language, String binding, String conditionGrade,
            String conditionNote, Long priceMinVnd, Long priceMaxVnd, Long weightG, String description, String categoryCode, List<String> ageGroups,
            String readingLevel, String readingVideoUrl, List<String> collectionIds, Publication publication,
            Availability availability, Instant publishedAt, Instant createdAt, Instant updatedAt,
            List<MediaView> media) {
    }

    public record BookSummary(String id, String bookCode, String title, Long priceMinVnd, Long priceMaxVnd, Publication publication,
            Availability availability, long version, Instant updatedAt, String frontContentPath) {
    }

    public record BookFilter(String q, Publication publication, Availability availability, int page, int size) {
    }

    public record Page<T>(List<T> items, int page, int size, long totalElements, int totalPages) {
    }

    public record PreviewMedia(String id, MediaRole role, String alt, String contentPath) {
    }

    public record PreviewBook(String bookCode, String slug, String title, String publisher, String author,
            List<String> ageGroups, String categoryCode, String binding, String conditionGrade, String conditionNote,
            Long priceMinVnd, Long priceMaxVnd, Long weightG, String description, String readingLevel, String readingVideoUrl, Availability availability,
            List<PreviewMedia> media) {
    }

    public record AuditSummary(String id, String actorId, String action, java.util.Map<String, Object> before,
            java.util.Map<String, Object> after, long aggregateVersion, Instant createdAt) {
    }
}
