package vn.memay.taxonomy;
public interface CategoryRepository extends org.springframework.data.jpa.repository.JpaRepository<Category,Long> { java.util.Optional<Category> findByCode(String code); java.util.List<Category> findAllByOrderBySortOrderAsc(); }
