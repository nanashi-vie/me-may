package vn.memay.catalogue;

public interface BookCopyRepository extends org.springframework.data.jpa.repository.JpaRepository<BookCopy, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select b from BookCopy b where b.id=:id")
    java.util.Optional<BookCopy> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
}
