package vn.memay.catalogue;

import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import vn.memay.common.AdminApiException;
import vn.memay.catalogue.BookDtos.Feature;

@Component
public class BookFeatureStore {
    private final JdbcTemplate jdbc;
    public BookFeatureStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<Feature> read(long listingId) {
        return jdbc.query("select f.code,f.label from listing_feature lf join book_feature f on f.code=lf.feature_code where lf.listing_id=? order by lf.position",
            (r,n)->new Feature(r.getString(1),r.getString(2)),listingId);
    }
    public List<String> validate(List<String> codes,List<Feature> previous) {
        if(codes==null || codes.size()>3 || codes.stream().anyMatch(Objects::isNull) || new HashSet<>(codes).size()!=codes.size())
            throw AdminApiException.field("featureCodes","Chọn tối đa 3 đặc điểm, không trùng");
        var allowed=jdbc.queryForList("select code from book_feature where active",String.class);
        var existing=previous.stream().map(Feature::code).toList();
        if(codes.stream().anyMatch(c -> !allowed.contains(c) && !existing.contains(c)))
            throw AdminApiException.field("featureCodes","Đặc điểm sách không hợp lệ hoặc ngừng dùng");
        return List.copyOf(codes);
    }
    public void save(long listingId,List<String> codes) {
        jdbc.update("delete from listing_feature where listing_id=?",listingId);
        for(int i=0;i<codes.size();i++) jdbc.update("insert into listing_feature(listing_id,feature_code,position) values(?,?,?)",listingId,codes.get(i),i+1);
    }
}
