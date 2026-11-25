package vn.memay.common;

import java.util.List;
import java.util.TreeMap;

/** One row of a bulk admin request; ids travel as JSON strings. */
public record VersionedItem(String id, Long version) {
    /** Validated id→version map in ascending id order, so bulk writers always lock rows in the same order. */
    public static TreeMap<Long, Long> ordered(List<VersionedItem> items, boolean limited) {
        if (items == null || items.isEmpty() || (limited && items.size() > 100))
            throw AdminApiException.field("items", "Danh sách không hợp lệ");
        var ordered = new TreeMap<Long, Long>();
        for (var item : items) {
            long id;
            try {
                id = Long.parseLong(item == null ? null : item.id());
            } catch (NumberFormatException e) {
                throw AdminApiException.field("items", "Mã không hợp lệ");
            }
            if (id < 1 || item.version() == null || item.version() < 0 || ordered.putIfAbsent(id, item.version()) != null)
                throw AdminApiException.field("items", "Danh sách không hợp lệ");
        }
        return ordered;
    }
}
