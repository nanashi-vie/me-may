package vn.memay.taxonomy;
import java.time.Instant;
import java.util.List;
import jakarta.validation.constraints.*;
public final class TaxonomyDtos {
 public record Option(String code,String label,int sortOrder){}
 public record Taxonomy(List<Option> categories,List<Option> ageGroups,List<Option> bindings,List<Option> readingLevels){}
 public record CollectionDto(String id,String name,String slug,int sortOrder,boolean active,long version,Instant createdAt,Instant updatedAt){}
 public record CollectionCreate(@NotBlank @Size(max=100) String name,@NotBlank @Size(max=120) @Pattern(regexp="[a-z0-9]+(-[a-z0-9]+)*") String slug,@NotNull @Min(0) Integer sortOrder,@NotNull Boolean active){}
 public record CollectionUpdate(@NotNull @PositiveOrZero Long version,@NotBlank @Size(max=100) String name,@NotNull @Min(0) Integer sortOrder,@NotNull Boolean active){}
}
