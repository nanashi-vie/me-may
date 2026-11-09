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
import java.util.Set;

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

    String originalHash(String key) throws IOException {
        if (key == null || !key.matches("staging/[a-f0-9-]{36}/input"))
            throw new IOException("Invalid image input key");
        Path input = directory(key.substring(0, key.lastIndexOf('/')), false).resolve("input");
        if (!Files.isRegularFile(input, NOFOLLOW_LINKS)) throw new IOException("Image input missing");
        try (var bytes = Files.newInputStream(input, READ, NOFOLLOW_LINKS)) {
            var digest = sha256();
            byte[] buffer = new byte[8192];
            long size = 0;
            for (int count; (count = bytes.read(buffer)) != -1;) {
                size += count;
                if (size > MAX_INPUT_BYTES) throw new IOException("Invalid image input size");
                digest.update(buffer, 0, count);
            }
            if (size == 0) throw new IOException("Invalid image input size");
            return HexFormat.of().formatHex(digest.digest());
        }
    }

    private final java.util.Map<String, Boolean> knownCorrupt = java.util.Collections.synchronizedMap(
            new java.util.LinkedHashMap<>() {
                @Override protected boolean removeEldestEntry(java.util.Map.Entry<String, Boolean> entry) {
                    return size() > 4096;
                }
            });

    String integrity(UUID media, UUID generation, ImageTypes.Variant variant) {
        String format = variant.mime().equals("image/jpeg") ? "jpg" : "webp";
        String name = variant.name() + "." + format;
        String key = "derived/" + media + "/" + generation + "/" + name;
        if (!variant.name().matches("[0-9]{1,4}") || !key.equals(variant.key())) return "CORRUPT";
        try {
            Path file = directory("derived/" + media + "/" + generation, false).resolve(name);
            verifyFile(file, variant, format);
            knownCorrupt.remove(key);
            return "OK";
        } catch (java.nio.file.NoSuchFileException missing) {
            return "MISSING";
        } catch (IOException error) {
            if (Files.notExists(root.resolve(key), NOFOLLOW_LINKS)) return "MISSING";
            knownCorrupt.put(key, true);
            return "CORRUPT";
        }
    }

    void restoreAttempt(Manifest expected, UUID token) throws IOException {
        Path source = directory("staging/" + token + "/output", false);
        validate(expected, source);
        Path target = directory(destination(expected), true);
        for (var variant : expected.variants()) {
            String format = variant.mime().equals("image/jpeg") ? "jpg" : "webp";
            String name = variant.name() + "." + format;
            if (!"OK".equals(integrity(expected.mediaId(), expected.generationId(), variant))) {
                Files.move(source.resolve(name), target.resolve(name), ATOMIC_MOVE, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                knownCorrupt.remove(variant.key());
            }
        }
    }

    record DiskGeneration(UUID media, UUID generation) {
        String cursor() { return media + ":" + generation; }
    }

    record DiskPage(java.util.List<DiskGeneration> generations, boolean unexpectedLayout) {}

    DiskPage diskPage(String after, int limit) throws IOException {
        boolean unexpected = false;
        var page = new java.util.TreeSet<DiskGeneration>(java.util.Comparator.comparing(DiskGeneration::cursor));
        if (Files.notExists(root.resolve("derived"), NOFOLLOW_LINKS)) return new DiskPage(java.util.List.of(), false);
        try (var mediaDirs = Files.newDirectoryStream(directory("derived", false))) {
            for (Path mediaPath : mediaDirs) {
                UUID media = directoryId(mediaPath);
                if (media == null) {
                    unexpected = true;
                    continue;
                }
                try (var generations = Files.newDirectoryStream(mediaPath)) {
                    for (Path generationPath : generations) {
                        UUID generation = directoryId(generationPath);
                        if (generation == null) {
                            unexpected = true;
                            continue;
                        }
                        var item = new DiskGeneration(media, generation);
                        if (after == null || item.cursor().compareTo(after) > 0) {
                            page.add(item);
                            if (page.size() > limit) page.pollLast();
                        }
                    }
                } catch (java.nio.file.NoSuchFileException ignored) {
                    // A live cleanup can remove a generation while inventory is walking.
                }
            }
        }
        return new DiskPage(java.util.List.copyOf(page), unexpected);
    }

    boolean hasUnexpectedFiles(DiskGeneration disk, Set<String> expected) throws IOException {
        var folder = directory("derived/" + disk.media() + "/" + disk.generation(), false);
        try (var files = Files.newDirectoryStream(folder)) {
            for (Path file : files) {
                if (!expected.contains(file.getFileName().toString())) return true;
            }
        }
        return false;
    }

    private static UUID directoryId(Path path) {
        if (!Files.isDirectory(path, NOFOLLOW_LINKS)) return null;
        try {
            String name = path.getFileName().toString();
            UUID id = UUID.fromString(name);
            return id.toString().equals(name) ? id : null;
        } catch (IllegalArgumentException e) { return null; }
    }

    boolean hasVariant(UUID media, UUID generation, int size, String format, long bytes) {
        if (media == null || generation == null || !Set.of(320, 480, 640, 1280, 1400).contains(size)
                || !Set.of("jpg", "webp").contains(format)) return false;
        if (knownCorrupt.containsKey("derived/" + media + "/" + generation + "/" + size + "." + format)) return false;
        try {
            Path file = directory("derived/" + media + "/" + generation, false).resolve(size + "." + format);
            var attributes = Files.readAttributes(file, java.nio.file.attribute.BasicFileAttributes.class, NOFOLLOW_LINKS);
            return attributes.isRegularFile() && attributes.size() == bytes;
        } catch (IOException e) {
            return false;
        }
    }

    void discardGeneration(UUID media, UUID generation) throws IOException {
        discardTree("derived/" + media + "/" + generation);
    }

    void discardStaging(UUID id) throws IOException {
        discardTree("staging/" + id);
    }

    java.util.List<UUID> stagingBefore(java.time.Instant cutoff) throws IOException {
        if (Files.notExists(root.resolve("staging"), NOFOLLOW_LINKS)) return java.util.List.of();
        try (var dirs = Files.list(directory("staging", false))) {
            var result = new java.util.ArrayList<UUID>();
            for (Path path : dirs.toList()) {
                if (!Files.isDirectory(path, NOFOLLOW_LINKS)
                        || !Files.getLastModifiedTime(path, NOFOLLOW_LINKS).toInstant().isBefore(cutoff)) continue;
                try {
                    UUID id = UUID.fromString(path.getFileName().toString());
                    if (id.toString().equals(path.getFileName().toString())) result.add(id);
                } catch (IllegalArgumentException ignored) {
                    // Only application-owned UUID directories are eligible.
                }
            }
            return result;
        }
    }

    private void discardTree(String relative) throws IOException {
        if (Files.notExists(root.resolve(relative), NOFOLLOW_LINKS)) return;
        try (var paths = Files.walk(directory(relative, false))) {
            for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    public void discardInput(UUID operationId) throws IOException {
        Path operation = directory("staging/" + operationId, false);
        Files.deleteIfExists(operation.resolve("input"));
        Files.delete(operation);
    }

    void validateMigrationVariants(Manifest manifest) throws IOException {
        var required = Set.of("320:image/jpeg", "320:image/webp", "480:image/jpeg", "480:image/webp",
                "640:image/jpeg", "640:image/webp", "1280:image/jpeg", "1400:image/jpeg", "1400:image/webp");
        var actual = manifest.variants().stream().map(v -> v.name() + ":" + v.mime())
                .collect(java.util.stream.Collectors.toSet());
        if (!required.equals(actual) || manifest.variants().size() != required.size()
                || manifest.variants().stream().anyMatch(v ->
                    Math.max(v.width(), v.height()) > Integer.parseInt(v.name())))
            throw new IOException("Incomplete migration variants");
    }

    void validateMigrationPreview(Manifest manifest, UUID attempt) throws IOException {
        if (manifest.variants().size() != 1) throw new IOException("Invalid preview output");
        var variant = manifest.variants().getFirst();
        if (!"480".equals(variant.name()) || !"image/jpeg".equals(variant.mime())
                || variant.width() > 480 || variant.height() > 480)
            throw new IOException("Invalid preview variant");
        validate(manifest, directory("staging/" + attempt + "/output", false));
    }

    InputStream openMigrationPreview(UUID attempt) throws IOException {
        Path file = directory("staging/" + attempt + "/output", false).resolve("480.jpg");
        if (!Files.isRegularFile(file, NOFOLLOW_LINKS)) throw new IOException("Preview missing");
        return Files.newInputStream(file, READ, NOFOLLOW_LINKS);
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
            verifyFile(source.resolve(fileName), variant, extension);
        }
        try (var files = Files.list(source)) {
            if (files.anyMatch(path -> !expected.contains(path.getFileName().toString())))
                throw new IOException("Unexpected staged output");
        }
    }

    private static void verifyFile(Path path, ImageTypes.Variant variant, String extension) throws IOException {
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
            long size = header.length;
            for (int count; (count = input.read(buffer)) != -1;) {
                size += count;
                if (size > variant.bytes()) throw new IOException("Variant grew during verification");
                digest.update(buffer, 0, count);
            }
        }
        if (!HexFormat.of().formatHex(digest.digest()).equals(variant.sha256()))
            throw new IOException("Variant checksum does not match manifest");
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
