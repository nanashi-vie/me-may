package vn.memay.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.UUID;

import static java.nio.file.LinkOption.NOFOLLOW_LINKS;
import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardOpenOption.*;
import vn.memay.media.ImageTypes.Manifest;

public final class LocalImageStore {
    public static final long MAX_INPUT_BYTES = 10L * 1024 * 1024;
    private final Path root;

    public LocalImageStore(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    public record StagedInput(String key, long bytes, String sha256) {}

    public StagedInput stage(UUID operationId, InputStream input) throws IOException {
        String directory = "staging/" + operationId;
        Path staging = directory("staging", true);
        Path operation = Files.createDirectory(staging.resolve(operationId.toString()));
        Path partial = operation.resolve("input.part");
        var digest = sha256();
        long size = 0;
        try {
            try (var channel = FileChannel.open(partial, CREATE_NEW, WRITE, NOFOLLOW_LINKS)) {
                var output = Channels.newOutputStream(channel);
                byte[] buffer = new byte[8192];
                for (int count; (count = input.read(buffer)) != -1;) {
                    size += count;
                    if (size > MAX_INPUT_BYTES) throw new IOException("Image input exceeds 10 MiB");
                    digest.update(buffer, 0, count);
                    output.write(buffer, 0, count);
                }
                if (size == 0) throw new IOException("Empty image input");
                channel.force(true);
            }
            Files.move(partial, operation.resolve("input"), ATOMIC_MOVE);
            return new StagedInput(directory + "/input", size, HexFormat.of().formatHex(digest.digest()));
        } catch (IOException | RuntimeException failure) {
            try {
                Files.deleteIfExists(partial);
                Files.delete(operation);
            } catch (IOException cleanup) {
                failure.addSuppressed(cleanup);
            }
            throw failure;
        }
    }

    public void discardInput(UUID operationId) throws IOException {
        Path operation = directory("staging/" + operationId, false);
        Files.deleteIfExists(operation.resolve("input"));
        Files.delete(operation);
    }

    public void validate(Manifest manifest) throws IOException {
        validate(manifest, directory("staging/" + manifest.generationId() + "/output", false));
    }

    private void validate(Manifest manifest, Path source) throws IOException {
        String destination = destination(manifest);
        if (manifest.variants().isEmpty()) throw new IOException("Empty image manifest");
        var expected = new HashSet<String>();
        for (var variant : manifest.variants()) {
            String extension = switch (variant.mime()) {
                case "image/jpeg" -> "jpg";
                case "image/webp" -> "webp";
                default -> throw new IOException("Unsupported variant type");
            };
            if (!variant.name().matches("[a-z0-9_-]{1,32}"))
                throw new IOException("Invalid variant name");
            String fileName = variant.name() + "." + extension;
            if (!expected.add(fileName) || !variant.key().equals(destination + "/" + fileName)
                    || variant.width() < 1 || variant.height() < 1 || variant.bytes() < 1
                    || variant.bytes() > MAX_INPUT_BYTES)
                throw new IOException("Invalid variant metadata");
            Path path = source.resolve(fileName);
            if (!Files.isRegularFile(path, NOFOLLOW_LINKS) || Files.size(path) != variant.bytes())
                throw new IOException("Variant file does not match manifest");
            var digest = sha256();
            try (var input = Files.newInputStream(path, READ, NOFOLLOW_LINKS)) {
                byte[] header = input.readNBytes(12);
                boolean matches = extension.equals("jpg")
                        ? header.length >= 3 && header[0] == (byte) 0xff && header[1] == (byte) 0xd8
                            && header[2] == (byte) 0xff
                        : header.length == 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F'
                            && header[3] == 'F' && header[8] == 'W' && header[9] == 'E'
                            && header[10] == 'B' && header[11] == 'P';
                if (!matches) throw new IOException("Variant content type does not match manifest");
                digest.update(header);
                byte[] buffer = new byte[8192];
                for (int count; (count = input.read(buffer)) != -1;) digest.update(buffer, 0, count);
            }
            if (!HexFormat.of().formatHex(digest.digest()).equals(variant.sha256()))
                throw new IOException("Variant checksum does not match manifest");
        }
        try (var files = Files.list(source)) {
            if (files.anyMatch(path -> !expected.contains(path.getFileName().toString())))
                throw new IOException("Unexpected staged output");
        }
    }

    public synchronized void publish(Manifest manifest) throws IOException {
        publish(manifest, manifest.generationId(), false);
    }

    synchronized void publishAttempt(Manifest manifest, UUID leaseToken) throws IOException {
        publish(manifest, leaseToken, true);
    }

    private void publish(Manifest manifest, UUID stagingId, boolean recoverExisting) throws IOException {
        Path parent = directory("derived/" + manifest.mediaId(), true);
        Path target = parent.resolve(manifest.generationId().toString());
        if (Files.exists(target, NOFOLLOW_LINKS)) {
            if (!recoverExisting) throw new IOException("Generation already exists");
            validate(manifest, directory(destination(manifest), false));
            return;
        }
        Path source = directory("staging/" + stagingId + "/output", false);
        validate(manifest, source);
        Files.move(source, target, ATOMIC_MOVE);
    }

    private String destination(Manifest manifest) {
        return "derived/" + manifest.mediaId() + "/" + manifest.generationId();
    }

    private Path directory(String relative, boolean create) throws IOException {
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) throw new IOException("Invalid image storage path");
        Path current = target.getRoot();
        for (Path part : target) {
            current = current.resolve(part);
            if (create && !Files.exists(current, NOFOLLOW_LINKS)) {
                try {
                    Files.createDirectory(current);
                } catch (java.nio.file.FileAlreadyExistsException ignored) {
                    // A concurrent upload may create the shared parent.
                }
            }
            if (!Files.isDirectory(current, NOFOLLOW_LINKS))
                throw new IOException("Image storage directory missing or symlinked");
        }
        return target;
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
