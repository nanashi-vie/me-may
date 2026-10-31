package vn.memay.catalogue;

import java.util.List;
import vn.memay.catalogue.BookImportDtos.ImportIssue;

public class BookImportException extends RuntimeException {
    public final int status;
    public final String error;
    public final List<ImportIssue> issues;
    public final int totalIssues;
    public BookImportException(int status,String error,List<ImportIssue> issues,int totalIssues) {
        super(error);this.status=status;this.error=error;this.issues=List.copyOf(issues);this.totalIssues=totalIssues;
    }
    public static BookImportException file(int status,String code,String message) {
        return new BookImportException(status,code,List.of(new ImportIssue(null,null,"file",code,message)),1);
    }
}
