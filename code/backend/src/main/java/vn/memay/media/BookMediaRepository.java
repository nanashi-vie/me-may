package vn.memay.media;

public interface BookMediaRepository
        extends org.springframework.data.jpa.repository.JpaRepository<BookMedia, java.util.UUID> {
    java.util.List<BookMedia> findByBookCopyIdAndState(Long bookCopyId, MediaDtos.MediaState state);
}
