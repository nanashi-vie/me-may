package vn.memay.catalogue;

import org.springframework.stereotype.Service;
import java.util.*;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookImportDtos.*;

@Service
public class BookImportService {
    private final BookAccess access;private final BookImportGate gate;private final BookImportParser parser;
    private final BookImportValidator validator;private final BookImportStore store;private final BookImportTransaction transactions;
    public BookImportService(BookAccess access,BookImportGate gate,BookImportParser parser,BookImportValidator validator,BookImportStore store,BookImportTransaction transactions) {
        this.access=access;this.gate=gate;this.parser=parser;this.validator=validator;this.store=store;this.transactions=transactions;
    }
    private ImportDocument read(AdminUser actor,String filename,byte[] bytes) {
        try { return validator.normalize(parser.parse(filename,bytes)); }
        catch(BookImportException e){gate.charge(actor.getId());throw e;}
    }
    public ImportPreview preview(AdminUser actor,String filename,byte[] bytes) {
        access.requireOwner(actor);
        try(var permit=gate.acquire(actor.getId())) {
            var document=read(actor,filename,bytes);
            var receipt=store.find(document.fingerprint());if(receipt.isPresent())return new ImportPreview(document,receipt.get());
            gate.charge(actor.getId());
            try {transactions.resolve(document,false);}
            catch(BookImportException e) {
                var issues=new ArrayList<>(document.issues());issues.addAll(e.issues);
                document=new ImportDocument(document.groups(),List.copyOf(issues.subList(0,Math.min(1000,issues.size()))),document.totalIssues()+e.totalIssues,document.rowCount(),null,document.schemaVersion());
            }
            return new ImportPreview(document,null);
        }
    }
    public CommitResult confirm(AdminUser actor,String filename,byte[] bytes,String expected) {
        access.requireOwner(actor);
        try(var permit=gate.acquire(actor.getId())) {
            var document=read(actor,filename,bytes);
            if(!document.valid()){gate.charge(actor.getId());throw BookImportTransaction.invalid(document.issues(),document.totalIssues());}
            if(!Objects.equals(expected,document.fingerprint())) {
                gate.charge(actor.getId());throw BookImportException.file(409,"fingerprint_mismatch","File đã thay đổi; kiểm tra lại trước khi import.");
            }
            var receipt=store.find(document.fingerprint());if(receipt.isPresent())return new CommitResult(receipt.get(),false);
            gate.charge(actor.getId());return transactions.commit(actor,document);
        }
    }
}
