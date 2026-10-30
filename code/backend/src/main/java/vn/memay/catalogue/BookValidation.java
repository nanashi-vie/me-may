package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import vn.memay.catalogue.BookDtos.*;
import vn.memay.common.AdminApiException;
import java.util.*;
import java.net.URI;

@Component
public class BookValidation {
    public static final List<String> AGES = List.of("AGE_0_3", "AGE_4_6", "AGE_7_9", "AGE_10_PLUS");
    public static final List<String> LEVELS = List.of("PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2");

    public static String trim(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private static void text(String key, String value, int max) {
        if (value != null && value.length() > max)
            throw AdminApiException.field(key, "Tối đa " + max + " ký tự");
    }

    public BookWrite normalize(BookWrite w) {
        if (w == null)
            throw AdminApiException.field("body", "Thiếu nội dung");
        return new BookWrite(trim(w.title()), trim(w.isbn()), trim(w.publisher()), trim(w.author()), trim(w.language()),
                trim(w.binding()), trim(w.conditionGrade()), trim(w.conditionNote()), w.priceMinVnd(), w.priceMaxVnd(),
                w.weightG(),
                trim(w.description()), trim(w.categoryCode()),
                ordered(w.ageGroups(), Comparator.comparingInt(AGES::indexOf)), trim(w.readingLevel()),
                trim(w.readingVideoUrl()), ordered(w.collectionIds(), Comparator.comparing(java.math.BigInteger::new)),
                normalizeVariants(w.variants()));
    }

    public List<VariantWrite> normalizeVariants(List<VariantWrite> input) {
        if (input == null || input.isEmpty())
            throw AdminApiException.field("variants", "Cần ít nhất một dòng tồn kho");
        var names = new HashSet<String>();
        var ids = new HashSet<String>();
        var result = new ArrayList<VariantWrite>();
        for (var row : input) {
            if (row == null || row.stock() == null || row.stock() < 0 || row.stock() > 999999)
                throw AdminApiException.field("variants", "Tồn kho nguyên từ 0 đến 999999");
            String name = trim(row.name()), id = row.id();
            text("variants", name, 100);
            if (input.size() > 1 && name == null)
                throw AdminApiException.field("variants", "Đặt tên cho từng biến thể");
            if (name != null && !names.add(name.toLowerCase(Locale.ROOT)))
                throw AdminApiException.field("variants", "Tên biến thể bị trùng");
            if (id != null) {
                try {
                    if (!UUID.fromString(id).toString().equals(id))
                        throw new IllegalArgumentException();
                } catch (IllegalArgumentException e) {
                    throw AdminApiException.field("variants", "ID biến thể không hợp lệ");
                }
                if (!ids.add(id))
                    throw AdminApiException.field("variants", "ID biến thể bị trùng");
            }
            result.add(new VariantWrite(id, name, row.stock()));
        }
        return List.copyOf(result);
    }

    private static List<String> ordered(List<String> input, Comparator<String> comparator) {
        if (input == null)
            return List.of();
        var values = new ArrayList<>(input);
        try {
            values.sort(comparator);
        } catch (RuntimeException ignored) {
            return input;
        }
        return values;
    }

    public void validateWrite(BookWrite w) {
        text("title", w.title(), 300);
        text("isbn", w.isbn(), 32);
        text("publisher", w.publisher(), 200);
        text("author", w.author(), 200);
        text("language", w.language(), 50);
        text("conditionNote", w.conditionNote(), 4000);
        text("description", w.description(), 10000);
        text("readingVideoUrl", w.readingVideoUrl(), 2048);
        if ("PICTURE_BOOK".equals(w.categoryCode())) {
            if (!List.of("PAPERBACK", "HARDCOVER").contains(w.binding() == null ? "" : w.binding()))
                throw AdminApiException.field("binding", "Chọn Paperback hoặc Hardcover");
        } else if (w.binding() != null)
            throw AdminApiException.field("binding", "Chỉ dùng cho Picture book");
        if (w.conditionGrade() != null
                && !List.of("VERY_GOOD", "GOOD", "FAIR", "HIGH_FRESHNESS", "MINOR_FLAWS").contains(w.conditionGrade()))
            throw AdminApiException.field("conditionGrade", "Không hợp lệ");
        if (w.priceMinVnd() != null && (w.priceMinVnd() < 1 || w.priceMinVnd() > 999999999999L))
            throw AdminApiException.field("priceMinVnd", "Giá nguyên VND phải lớn hơn 0");
        if (w.priceMaxVnd() != null && (w.priceMaxVnd() < 1 || w.priceMaxVnd() > 999999999999L))
            throw AdminApiException.field("priceMaxVnd", "Giá nguyên VND phải lớn hơn 0");
        if ((w.priceMinVnd() == null) != (w.priceMaxVnd() == null) ||
                w.priceMinVnd() != null && w.priceMinVnd() > w.priceMaxVnd())
            throw AdminApiException.field("priceMaxVnd", "Nhập đủ hai đầu khoảng giá và giá đến không nhỏ hơn giá từ");
        if (w.weightG() == null || w.weightG() < 1 || w.weightG() > 9007199254740991L)
            throw AdminApiException.field("weightG", "Nhập trọng lượng nguyên gram lớn hơn 0");
        if (w.ageGroups().size() > 4 || w.ageGroups().stream().anyMatch(Objects::isNull)
                || new HashSet<>(w.ageGroups()).size() != w.ageGroups().size() || !AGES.containsAll(w.ageGroups()))
            throw AdminApiException.field("ageGroups", "Nhóm tuổi không hợp lệ hoặc trùng");
        if (w.collectionIds().size() > 100 || w.collectionIds().stream().anyMatch(Objects::isNull)
                || new HashSet<>(w.collectionIds()).size() != w.collectionIds().size())
            throw AdminApiException.field("collectionIds", "Bộ sưu tập không hợp lệ hoặc trùng");
        if (w.readingLevel() != null) {
            if (!LEVELS.contains(w.readingLevel()))
                throw AdminApiException.field("readingLevel", "Mức đọc không hợp lệ");
        }
        if (w.readingVideoUrl() != null) {
            try {
                var u = URI.create(w.readingVideoUrl());
                if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null || u.getUserInfo() != null
                        || w.readingVideoUrl().chars().anyMatch(c -> c < 32 || c == 127))
                    throw new IllegalArgumentException();
            } catch (RuntimeException ex) {
                throw AdminApiException.field("readingVideoUrl", "Dùng URL HTTPS hợp lệ");
            }
        }
    }

    public void validatePublished(BookDetail b) {
        if (trim(b.title()) == null)
            throw AdminApiException.field("title", "Nhập tên sách");
        if (b.categoryCode() == null)
            throw AdminApiException.field("categoryCode", "Chọn thể loại");
        if (b.weightG() == null || b.weightG() < 1)
            throw AdminApiException.field("weightG", "Nhập trọng lượng sách (g)");
        if (b.priceMinVnd() == null || b.priceMaxVnd() == null)
            throw AdminApiException.field("priceMinVnd", "Nhập giá tham khảo");
        if (trim(b.conditionNote()) == null)
            throw AdminApiException.field("conditionNote", "Mô tả tình trạng thực tế");
        var roles = b.media().stream().map(BookDtos.MediaView::role).toList();
        if (roles.size() < 2 || roles.size() > 6 || new HashSet<>(roles).size() != roles.size()
                || !roles.containsAll(
                        List.of(vn.memay.media.MediaDtos.MediaRole.FRONT, vn.memay.media.MediaDtos.MediaRole.BACK)))
            throw AdminApiException.field("media", "Cần từ 2 đến 6 ảnh, bắt buộc bìa và lưng");
    }
}
