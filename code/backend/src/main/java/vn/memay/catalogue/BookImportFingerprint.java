package vn.memay.catalogue;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.ImportGroup;
import tools.jackson.databind.json.JsonMapper;

public final class BookImportFingerprint {
    private BookImportFingerprint() {}
    public static String digest(List<ImportGroup> groups) {
        var canonical=groups.stream().sorted(Comparator.comparing(ImportGroup::key))
                .map(g->List.of(g.key(),g.write(),g.collectionSlugs())).toList();
        try {
            byte[] bytes=new JsonMapper().writeValueAsString(List.of(BookImportSchema.VERSION,canonical)).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
