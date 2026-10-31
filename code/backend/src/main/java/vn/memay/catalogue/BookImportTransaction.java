package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookImportDtos.*;
import java.util.*;

@Service
public class BookImportTransaction {
    private final JdbcTemplate jdbc;
    private final BookImportStore store;
    private final BookCommandService commands;
    private final BookAccess access;
    public BookImportTransaction(JdbcTemplate jdbc,BookImportStore store,BookCommandService commands,BookAccess access) {
        this.jdbc=jdbc;this.store=store;this.commands=commands;this.access=access;
    }
    @Transactional
    public CommitResult commit(AdminUser actor,ImportDocument document) {
        access.requireOwner(actor);
        if(!document.valid() || document.fingerprint()==null)throw invalid(document.issues(),document.totalIssues());
        if(!BookImportFingerprint.digest(document.groups()).equals(document.fingerprint()))
            throw BookImportException.file(409,"fingerprint_mismatch","File đã thay đổi; kiểm tra lại trước khi import.");
        UUID id=UUID.randomUUID();
        var inserted=jdbc.queryForList("insert into book_import_batch(id,fingerprint,schema_version,owner_id) values(?,?,?,?) on conflict(fingerprint) do nothing returning id",
                id,document.fingerprint(),BookImportSchema.VERSION,actor.getId());
        if(inserted.isEmpty())return new CommitResult(store.find(document.fingerprint()).orElseThrow(),false);
        var resolved=resolve(document,true);
        for(var group:resolved.groups()) {
            var book=commands.createImported(actor,group.write(),id);
            jdbc.update("insert into book_import_item(batch_id,group_key,book_id,book_code,title) values(?,?,?,?,?)",id,group.key(),Long.parseLong(book.id()),book.bookCode(),book.title());
        }
        return new CommitResult(store.find(document.fingerprint()).orElseThrow(),true);
    }
    public ResolvedImport resolve(ImportDocument document,boolean lock) {
        var errors=new ArrayList<ImportIssue>();var allSlugs=new TreeSet<String>();
        document.groups().forEach(g->allSlugs.addAll(g.collectionSlugs()));
        Set<String> categories=new HashSet<>(jdbc.queryForList("select code from category",String.class));
        var collections=new HashMap<String,Map<String,Object>>();
        if(!allSlugs.isEmpty()) {
            String sql="select id,slug,active from collection where slug in ("+String.join(",",Collections.nCopies(allSlugs.size(),"?"))+") order by id"+(lock?" for share":"");
            for(var row:jdbc.queryForList(sql,allSlugs.toArray()))collections.put((String)row.get("slug"),row);
        }
        var result=new ArrayList<ImportGroup>();
        for(var group:document.groups()) {
            if(!categories.contains(group.write().categoryCode()))for(int row:group.rows())errors.add(new ImportIssue(null,row,"the_loai","reference","Thể loại không còn hợp lệ."));
            var ids=new ArrayList<String>();
            for(String slug:group.collectionSlugs()) {
                var collection=collections.get(slug);
                if(collection==null || !Boolean.TRUE.equals(collection.get("active")))for(int row:group.rows())errors.add(new ImportIssue(null,row,"bo_suu_tap","reference","Bộ sưu tập không tồn tại hoặc đã ngừng dùng."));
                else ids.add(collection.get("id").toString());
            }
            result.add(new ImportGroup(group.key(),BookImportValidator.withCollections(group.write(),List.copyOf(ids)),group.collectionSlugs(),group.rows()));
        }
        if(!errors.isEmpty())throw invalid(errors,errors.size());return new ResolvedImport(List.copyOf(result));
    }
    static BookImportException invalid(List<ImportIssue> issues,int total) {
        return new BookImportException(422,"import_validation_error",issues.subList(0,Math.min(1000,issues.size())),total);
    }
}
