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

    public Map<String, List<String>> writeErrors(BookWrite w) {
        var errors = new LinkedHashMap<String,List<String>>();
        textError(errors, "title", w.title(), 300);
        textError(errors, "isbn", w.isbn(), 32);
        textError(errors, "publisher", w.publisher(), 200);
        textError(errors, "author", w.author(), 200);
        textError(errors, "language", w.language(), 50);
        textError(errors, "conditionNote", w.conditionNote(), 4000);
        textError(errors, "description", w.description(), 10000);
        textError(errors, "readingVideoUrl", w.readingVideoUrl(), 2048);
        if ("PICTURE_BOOK".equals(w.categoryCode())) {
            if (!List.of("PAPERBACK", "HARDCOVER").contains(w.binding() == null ? "" : w.binding()))
                errors.put("binding", List.of("Chọn Paperback hoặc Hardcover"));
        } else if (w.binding() != null)
            errors.put("binding", List.of("Chỉ dùng cho Picture book"));
        if (w.conditionGrade() != null
                && !List.of("VERY_GOOD", "GOOD", "FAIR", "HIGH_FRESHNESS", "MINOR_FLAWS").contains(w.conditionGrade()))
            errors.put("conditionGrade", List.of("Không hợp lệ"));
        if (w.priceMinVnd() != null && (w.priceMinVnd() < 1 || w.priceMinVnd() > 999999999999L))
            errors.put("priceMinVnd", List.of("Giá nguyên VND phải lớn hơn 0"));
        if (w.priceMaxVnd() != null && (w.priceMaxVnd() < 1 || w.priceMaxVnd() > 999999999999L))
            errors.put("priceMaxVnd", List.of("Giá nguyên VND phải lớn hơn 0"));
        if ((w.priceMinVnd() == null) != (w.priceMaxVnd() == null) ||
                w.priceMinVnd() != null && w.priceMinVnd() > w.priceMaxVnd())
            errors.put("priceMaxVnd", List.of("Nhập đủ hai đầu khoảng giá và giá đến không nhỏ hơn giá từ"));
        if (w.weightG() == null || w.weightG() < 1 || w.weightG() > 9007199254740991L)
            errors.put("weightG", List.of("Nhập trọng lượng nguyên gram lớn hơn 0"));
        if (w.ageGroups().size() > 4 || w.ageGroups().stream().anyMatch(Objects::isNull)
                || new HashSet<>(w.ageGroups()).size() != w.ageGroups().size() || !AGES.containsAll(w.ageGroups()))
            errors.put("ageGroups", List.of("Nhóm tuổi không hợp lệ hoặc trùng"));
        if (w.collectionIds().size() > 100 || w.collectionIds().stream().anyMatch(Objects::isNull)
                || new HashSet<>(w.collectionIds()).size() != w.collectionIds().size())
            errors.put("collectionIds", List.of("Bộ sưu tập không hợp lệ hoặc trùng"));
        if (w.readingLevel() != null) {
            if (!LEVELS.contains(w.readingLevel()))
                errors.put("readingLevel", List.of("Mức đọc không hợp lệ"));
        }
        if (w.readingVideoUrl() != null) {
            try {
                var u = URI.create(w.readingVideoUrl());
                if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null || u.getUserInfo() != null
                        || w.readingVideoUrl().chars().anyMatch(c -> c < 32 || c == 127))
                    throw new IllegalArgumentException();
            } catch (RuntimeException ex) {
                errors.put("readingVideoUrl", List.of("Dùng URL HTTPS hợp lệ"));
            }
        }
        return errors;
    }

    private static void textError(Map<String,List<String>> errors,String key,String value,int max) {
        if(value!=null && value.length()>max) errors.put(key,List.of("Tối đa " + max + " ký tự"));
    }

    public void validateWrite(BookWrite w) {
        var errors=writeErrors(w);
        if(!errors.isEmpty()) throw new AdminApiException(400,"validation_error",errors,null);
    }

    public Map<String,List<String>> metadataErrors(BookWrite w) {
        return requiredMetadata(w.title(),w.categoryCode(),w.weightG(),w.priceMinVnd(),w.priceMaxVnd(),w.conditionNote());
    }

    private static Map<String,List<String>> requiredMetadata(String title,String category,Long weight,Long min,Long max,String note) {
        var errors=new LinkedHashMap<String,List<String>>();
        if (trim(title) == null)
            errors.put("title",List.of("Nhập tên sách"));
        if (category == null)
            errors.put("categoryCode",List.of("Chọn thể loại"));
        if (weight == null || weight < 1)
            errors.put("weightG",List.of("Nhập trọng lượng sách (g)"));
        if (min == null || max == null)
            errors.put("priceMinVnd",List.of("Nhập giá tham khảo"));
        if (trim(note) == null)
            errors.put("conditionNote",List.of("Mô tả tình trạng thực tế"));
        return errors;
    }

    public void validatePublished(BookDetail b) {
        var errors=requiredMetadata(b.title(),b.categoryCode(),b.weightG(),b.priceMinVnd(),b.priceMaxVnd(),b.conditionNote());
        if(!errors.isEmpty()) throw new AdminApiException(400,"validation_error",errors,null);
        var roles = b.media().stream().map(BookDtos.MediaView::role).toList();
        if (roles.size() < 2 || roles.size() > 6 || new HashSet<>(roles).size() != roles.size()
                || !roles.containsAll(
                        List.of(vn.memay.media.MediaDtos.MediaRole.FRONT, vn.memay.media.MediaDtos.MediaRole.BACK)))
            throw AdminApiException.field("media", "Cần từ 2 đến 6 ảnh, bắt buộc bìa và lưng");
    }
}
