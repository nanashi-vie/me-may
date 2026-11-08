package vn.memay.media;

import org.springframework.stereotype.Service;
import vn.memay.auth.AdminUser;
import vn.memay.catalogue.BookAccess;
import vn.memay.common.AdminApiException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class BookPhotoDownloadService {
    private static final int MAX_BOOKS = 20;
    private static final int MAX_IMAGE_BYTES = 32 * 1024 * 1024;
    private final Semaphore archiveSlots = new Semaphore(1);
    private final BookAccess access;
    private final MediaTransactions transactions;
    private final MediaGateway gateway;

    public BookPhotoDownloadService(BookAccess access, MediaTransactions transactions, MediaGateway gateway) {
        this.access = access;
        this.transactions = transactions;
        this.gateway = gateway;
    }

    public record Archive(String filename, List<String> missingBookCodes, byte[] content) {}

    public Archive create(AdminUser actor, List<Long> ids) {
        access.requireOwner(actor);
        if (ids.isEmpty() || ids.size() > MAX_BOOKS
                || ids.stream().anyMatch(id -> id == null || id <= 0)
                || new HashSet<>(ids).size() != ids.size()) {
            throw AdminApiException.field("ids", "Chọn từ 1 đến 20 cuốn khác nhau");
        }
        if (!archiveSlots.tryAcquire()) {
            throw new AdminApiException(429, "photo_download_busy");
        }
        try {
            var books = transactions.downloadPhotos(ids);
            var missing = books.stream().filter(book -> book.photos().isEmpty())
                    .map(MediaTransactions.DownloadBook::code).toList();
            if (missing.size() == books.size()) {
                throw new AdminApiException(422, "no_book_photos");
            }
            String filename = books.size() == 1 ? books.getFirst().code() + ".zip" : "me-may-anh-sach.zip";
            return new Archive(filename, missing, zip(books));
        } finally {
            archiveSlots.release();
        }
    }

    private byte[] zip(List<MediaTransactions.DownloadBook> books) {
        var bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int remaining = MAX_IMAGE_BYTES;
        try (var zip = new ZipOutputStream(bytes)) {
            zip.setLevel(Deflater.NO_COMPRESSION);
            for (var book : books) {
                for (var photo : book.photos()) {
                    try (var input = gateway.openAdminPreview(photo.key(), 1280)) {
                        zip.putNextEntry(new ZipEntry(book.code() + "/" + photo.role().name() + ".jpg"));
                        for (int count; (count = input.read(buffer)) != -1; ) {
                            remaining -= count;
                            if (remaining < 0) {
                                throw new AdminApiException(413, "photo_download_too_large");
                            }
                            zip.write(buffer, 0, count);
                        }
                        zip.closeEntry();
                    }
                }
            }
        } catch (IOException e) {
            throw new AdminApiException(502, "media_provider_error");
        }
        return bytes.toByteArray();
    }
}
