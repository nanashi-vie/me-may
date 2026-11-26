package vn.memay.order;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.memay.common.AdminApiException;
import vn.memay.media.ImageValidator;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;

/** Transfer receipts are private finance records: kept as uploaded, outside every public media path. */
@Component
public class PaymentProofStore {
    private static final Logger log = LoggerFactory.getLogger(PaymentProofStore.class);
    private static final Pattern KEY = Pattern.compile("[0-9a-f-]{36}\\.(jpg|png)");
    private final Path dir;
    private final ImageValidator validator;

    public PaymentProofStore(@Value("${memay.media.local.root}") String root, ImageValidator validator) {
        this.validator = validator;
        this.dir = Path.of(root).toAbsolutePath().normalize().resolve("private/payment-proofs");
    }

    public record Proof(String key, String mime, int bytes, String sha256) {}

    public Proof store(byte[] bytes) {
        var info = validator.validate(bytes);
        boolean png = info.format().equals("png");
        String key = UUID.randomUUID() + (png ? ".png" : ".jpg");
        try {
            Files.createDirectories(dir);
            Path temp = Files.createTempFile(dir, ".upload-", ".tmp");
            try {
                Files.write(temp, bytes);
                Files.move(temp, dir.resolve(key), ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temp);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return new Proof(key, png ? "image/png" : "image/jpeg", bytes.length, sha256(bytes));
    }

    public byte[] read(String key) {
        try {
            return Files.readAllBytes(file(key));
        } catch (IOException e) {
            throw new AdminApiException(404, "not_found");
        }
    }

    /** Missing files are already gone; an IO failure is logged without the key's owner data. */
    public void delete(String key) {
        try {
            Files.deleteIfExists(file(key));
        } catch (IOException e) {
            log.warn("payment proof delete failed: {}", e.getClass().getSimpleName());
        }
    }

    private Path file(String key) {
        if (key == null || !KEY.matcher(key).matches()) throw new AdminApiException(404, "not_found");
        return dir.resolve(key);
    }

    public static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
