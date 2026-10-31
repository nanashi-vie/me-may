package vn.memay.catalogue;

import java.time.Instant;
import java.util.*;
import vn.memay.catalogue.BookDtos.BookWrite;

public final class BookImportDtos {
    private BookImportDtos() {}
    public record CellRow(String sheet,int row,Map<String,String> cells,List<ImportIssue> issues) {
        public CellRow(String sheet,int row,Map<String,String> cells) { this(sheet,row,cells,List.of()); }
    }
    public record ImportIssue(String sheet,Integer row,String column,String code,String message) {}
    public record ImportGroup(String key,BookWrite write,List<String> collectionSlugs,List<Integer> rows) {}
    public record ImportDocument(List<ImportGroup> groups,List<ImportIssue> issues,int totalIssues,int rowCount,String fingerprint) {
        public boolean valid() { return totalIssues == 0; }
    }
    public record ImportedBook(String groupKey,String id,String bookCode,String title) {}
    public record ImportReceipt(UUID id,String fingerprint,Instant createdAt,List<ImportedBook> books) {}
    public record ImportPreview(ImportDocument document,ImportReceipt receipt) {}
    public record ResolvedImport(List<ImportGroup> groups) {}
    public record CommitResult(ImportReceipt receipt,boolean created) {}
    public record CollectionOption(String slug,String name) {}
    public record ImportOptions(vn.memay.taxonomy.TaxonomyDtos.Taxonomy taxonomy,List<CollectionOption> collections) {}
}
