package vn.memay.catalogue;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import vn.memay.catalogue.BookImportDtos.ImportGroup;
import tools.jackson.databind.json.JsonMapper;

public final class BookImportFingerprint {
    private BookImportFingerprint() {}
    public static String digest(List<ImportGroup> groups) {
        return digest(groups,1);
    }
    public static String digest(List<ImportGroup> groups,int version) {
        if(version!=1 && version!=2)throw new IllegalArgumentException("Unknown import schema");
        var canonical=groups.stream().sorted(Comparator.comparing(ImportGroup::key))
                .map(g->List.of(g.key(),g.write(),g.collectionSlugs())).toList();
        try {
            byte[] bytes=new JsonMapper().writeValueAsString(List.of(version,canonical)).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    static String semanticContent(ImportGroup group) {
        return new JsonMapper().writeValueAsString(List.of(group.write(),group.collectionSlugs()));
    }
}
