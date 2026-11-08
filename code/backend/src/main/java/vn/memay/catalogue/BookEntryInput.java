package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import java.util.Objects;
import vn.memay.common.AdminApiException;
import vn.memay.catalogue.BookDtos.*;

/** HTTP-only optional fields; BookWrite stays byte-compatible with import receipts. */
@Component
public class BookEntryInput {
    private final ObjectMapper json;
    public BookEntryInput(ObjectMapper json) { this.json=json; }
    public record Options(boolean noteSupplied,String note,boolean gradeSupplied,
                          boolean unitSupplied,Long unitPrice,boolean stockSupplied,Long stock,boolean variantsSupplied,boolean featuresSupplied,java.util.List<String> featureCodes,
                          boolean storageBoxSupplied, Integer storageBoxNumber) {
        public static Options legacy() { return new Options(true,null,true,false,null,false,null,true,false,java.util.List.of(),false,null); }
    }
    public record Create(BookCreate body,Options options,BookDtos.Publication publication) {}
    public record Update(BookUpdate body,Options options,boolean publishAfterSave,boolean confirmedActualCopy,java.util.List<BookDtos.MediaMetadata> mediaMetadata) {}
    public Create create(JsonNode body) {
        ObjectNode copy=object(body);ObjectNode write=object(copy.get("write"));
        var options=extras(write);copy.set("write",write);
        BookDtos.Publication publication=null;
        if(copy.has("publication")) {
            var value=copy.remove("publication");
            try { publication=BookDtos.Publication.valueOf(value.asString()); }
            catch(RuntimeException ex) { throw AdminApiException.field("publication","Chọn ARCHIVED hoặc PUBLISHED"); }
        }
        return new Create(decode(copy,BookCreate.class),options,publication);
    }
    public Update update(JsonNode body) {
        ObjectNode copy=object(body);var options=extras(copy);
        boolean publish=flag(copy,"publishAfterSave"),confirmed=flag(copy,"confirmedActualCopy");
        var metadata=new java.util.ArrayList<BookDtos.MediaMetadata>();
        if(copy.has("mediaMetadata")) {
            var rows=copy.remove("mediaMetadata");
            if(!rows.isArray() || rows.size()>8) throw AdminApiException.field("mediaMetadata","Tối đa 8 ảnh");
            for(var row:rows) metadata.add(decode(object(row),BookDtos.MediaMetadata.class));
        }
        return new Update(decode(copy,BookUpdate.class),options,publish,confirmed,metadata);
    }
    private boolean flag(ObjectNode node,String key) {
        if(!node.has(key)) return false;
        var value=node.remove(key);
        if(!value.isBoolean()) throw AdminApiException.field(key,"Expected boolean");
        return value.asBoolean();
    }
    private <T> T decode(ObjectNode node,Class<T> type) {
        try { return json.treeToValue(node,type); }
        catch(tools.jackson.core.JacksonException e) { throw new AdminApiException(400,"invalid_request"); }
    }
    private ObjectNode object(JsonNode node) {
        if(node==null || !node.isObject()) throw AdminApiException.field("body","Expected an object");
        return ((ObjectNode)node).deepCopy();
    }
    private Options extras(ObjectNode node) {
        boolean note=node.has("internalNote"),oldNote=node.has("conditionNote");
        String value=note?text(node.get("internalNote"),"internalNote"):oldNote?text(node.get("conditionNote"),"conditionNote"):null;
        if(note && oldNote && !Objects.equals(value,text(node.get("conditionNote"),"conditionNote")))
            throw AdminApiException.field("internalNote","Conflicting note aliases");
        if(note) {node.put("conditionNote",value);node.remove("internalNote");}
        boolean unit=node.has("unitPricePerKgVnd");Long price=null;
        if(unit && !node.get("unitPricePerKgVnd").isNull()) {
            var n=node.get("unitPricePerKgVnd");
            if(!n.isIntegralNumber() || !n.canConvertToLong() || n.asLong()<1 || n.asLong()>999999999999L)
                throw AdminApiException.field("unitPricePerKgVnd","Enter a positive integer VND/kg");
            price=n.asLong();
        }
        boolean stock=node.has("stock"), variants=node.has("variants");Long quantity=null;
        if(stock) {
            var n=node.get("stock");
            if(n.isNull() || !n.isIntegralNumber() || !n.canConvertToLong() || n.asLong()<0 || n.asLong()>9007199254740991L)
                throw AdminApiException.field("stock","Enter a non-negative integer stock");
            if(variants && !node.get("variants").isNull()) throw AdminApiException.field("stock","Send stock or variants, not both");
            quantity=n.asLong();node.remove("variants");
        }
        node.remove("stock");
        node.remove("unitPricePerKgVnd");
        boolean features=node.has("featureCodes");var codes=new java.util.ArrayList<String>();
        if(features) {
            var input=node.remove("featureCodes");
            if(!input.isArray()) throw AdminApiException.field("featureCodes","Chọn danh sách đặc điểm");
            for(var code:input) {
                if(!code.isString()) throw AdminApiException.field("featureCodes","Mã đặc điểm không hợp lệ");
                codes.add(code.asString());
            }
        }
        var box = node.remove("storageBoxNumber");
        Integer number = box == null || box.isNull() ? null : BookStorageBoxes.positiveNumber(box);
        return new Options(note||oldNote,value,node.has("conditionGrade"),unit,price,stock,quantity,variants,features,codes,box != null,number);
    }
    private String text(JsonNode node,String field) {
        if(node.isNull()) return null;
        if(!node.isString()) throw AdminApiException.field(field,"Expected text");
        return BookValidation.trim(node.asString());
    }
    public static BookWrite resolve(BookWrite w,BookDetail before,Options o,BookVariantStore store) {
        var rows=w.variants();
        if(o.stockSupplied()) {
            if(before==null) {
                if(o.stock()>999999) throw AdminApiException.field("stock","Maximum stock is 999999");
                rows=java.util.List.of(new VariantWrite(null,null,o.stock()));
            } else rows=store.pooledRows(Long.parseLong(before.id()),o.stock());
        } else if(!o.variantsSupplied() && before!=null)
            rows=before.variants().stream().map(v -> new VariantWrite(v.id(),v.name(),v.stock())).toList();
        return new BookWrite(w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.binding(),
            o.gradeSupplied()?w.conditionGrade():before==null?null:before.conditionGrade(),
            o.noteSupplied()?w.conditionNote():before==null?null:before.conditionNote(),
            w.priceMinVnd(),w.priceMaxVnd(),w.weightG(),w.description(),w.categoryCode(),w.ageGroups(),
            w.readingLevel(),w.readingVideoUrl(),w.collectionIds(),rows);
    }
}
