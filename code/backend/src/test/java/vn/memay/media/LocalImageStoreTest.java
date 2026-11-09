package vn.memay.media;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import vn.memay.media.ImageTypes.*;

class LocalImageStoreTest {
    @TempDir Path root;

    @Test void stagesAndHashesBytesWithHardLimit() throws Exception {
        var store = new LocalImageStore(root.toRealPath());
        var staged = store.stage(UUID.randomUUID(), new ByteArrayInputStream(new byte[]{97,98,99}));
        assertThat(staged.bytes()).isEqualTo(3);
        assertThat(staged.sha256()).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(Files.readAllBytes(root.resolve(staged.key()))).containsExactly(97,98,99);
        assertThatThrownBy(() -> store.stage(UUID.randomUUID(),
                new ByteArrayInputStream(new byte[10 * 1024 * 1024 + 1]))).isInstanceOf(IOException.class);
    }

    @Test void enumeratesOldStagingBeyondTheDeletionBudgetSoPinnedReceiptsCannotHideOrphans() throws Exception {
        var store = new LocalImageStore(root.toRealPath());
        var cutoff = java.time.Instant.now().minusSeconds(60);
        var old = java.nio.file.attribute.FileTime.from(cutoff.minusSeconds(60));
        var staging = Files.createDirectory(root.resolve("staging"));
        for (int i = 0; i < 101; i++)
            Files.setLastModifiedTime(Files.createDirectory(staging.resolve(UUID.randomUUID().toString())), old);
        assertThat(store.stagingBefore(cutoff)).hasSize(101);
    }

    @Test void publishesOnlyTheVerifiedManifest() throws Exception {
        var store = new LocalImageStore(root.toRealPath());
        var media = UUID.randomUUID();
        var generation = UUID.randomUUID();
        var output = Files.createDirectories(root.resolve("staging/" + generation + "/output"));
        byte[] jpeg = ImageValidatorTest.image("jpeg");
        var file = Files.write(output.resolve("320.jpg"), jpeg);
        var key = "derived/" + media + "/" + generation + "/320.jpg";
        String hash = java.util.HexFormat.of().formatHex(
                java.security.MessageDigest.getInstance("SHA-256").digest(jpeg));
        var manifest = new Manifest(media, generation, "v1",
                List.of(new Variant("320", key, "image/jpeg", 1, 1, jpeg.length, hash)));
        var extra = Files.writeString(output.resolve("extra.txt"), "unexpected");
        assertThatThrownBy(() -> store.publish(manifest)).isInstanceOf(IOException.class);
        assertThat(root.resolve(key)).doesNotExist();
        Files.delete(extra);
        store.publish(manifest);
        assertThat(root.resolve(key)).hasBinaryContent(jpeg);
        assertThat(file).doesNotExist();
        assertThatThrownBy(() -> store.publish(manifest)).isInstanceOf(IOException.class);
    }

    @Test void rejectsEscapingAndSymlinkedPaths() throws Exception {
        var store = new LocalImageStore(root.toRealPath());
        var media = UUID.randomUUID();
        var generation = UUID.randomUUID();
        var manifest = new Manifest(media, generation, "v1",
                List.of(new Variant("320", "../outside.jpg", "image/jpeg", 1, 1, 3, "bad")));
        assertThatThrownBy(() -> store.publish(manifest)).isInstanceOf(IOException.class);
        var staging = root.resolve("staging");
        Files.createDirectories(staging);
        var operation = UUID.randomUUID();
        Files.createSymbolicLink(staging.resolve(operation.toString()), root);
        assertThatThrownBy(() -> store.stage(operation, new ByteArrayInputStream(new byte[]{1})))
                .isInstanceOf(IOException.class);
        assertThat(root.resolve("input")).doesNotExist();
    }
}
