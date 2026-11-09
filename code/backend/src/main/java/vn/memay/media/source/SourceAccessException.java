package vn.memay.media.source;

public class SourceAccessException extends RuntimeException {
    private final String code;
    private final boolean retryable;
    private final int httpStatus;

    public SourceAccessException(String code, boolean retryable, int httpStatus) {
        super(code);
        this.code = code;
        this.retryable = retryable;
        this.httpStatus = httpStatus;
    }

    public String code() { return code; }
    public boolean retryable() { return retryable; }
    public int httpStatus() { return httpStatus; }
}
