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
                          boolean unitSupplied,Long unitPrice) {
        public static Options legacy() { return new Options(true,null,true,false,null); }
    }
    public record Create(BookCreate body,Options options) {}
    public record Update(BookUpdate body,Options options) {}
    public Create create(JsonNode body) {
        ObjectNode copy=object(body);ObjectNode write=object(copy.get("write"));
        var options=extras(write);copy.set("write",write);
        return new Create(decode(copy,BookCreate.class),options);
    }
    public Update update(JsonNode body) {
        ObjectNode copy=object(body);var options=extras(copy);
        return new Update(decode(copy,BookUpdate.class),options);
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
        node.remove("unitPricePerKgVnd");
        return new Options(note||oldNote,value,node.has("conditionGrade"),unit,price);
    }
    private String text(JsonNode node,String field) {
        if(node.isNull()) return null;
        if(!node.isString()) throw AdminApiException.field(field,"Expected text");
        return BookValidation.trim(node.asString());
    }
    public static BookWrite resolve(BookWrite w,BookDetail before,Options o) {
        return new BookWrite(w.title(),w.isbn(),w.publisher(),w.author(),w.language(),w.binding(),
            o.gradeSupplied()?w.conditionGrade():before==null?null:before.conditionGrade(),
            o.noteSupplied()?w.conditionNote():before==null?null:before.conditionNote(),
            w.priceMinVnd(),w.priceMaxVnd(),w.weightG(),w.description(),w.categoryCode(),w.ageGroups(),
            w.readingLevel(),w.readingVideoUrl(),w.collectionIds(),w.variants());
    }
}
