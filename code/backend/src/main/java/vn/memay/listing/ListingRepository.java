package vn.memay.listing;
public interface ListingRepository extends org.springframework.data.jpa.repository.JpaRepository<Listing,Long> { java.util.Optional<Listing> findByBookCopyId(Long bookCopyId); }
