package vn.memay.order;
import org.springframework.stereotype.Component;
import vn.memay.common.AdminApiException;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Component
public class CatalogMatchService {
 private final OrderRepository db;private final OrderMutations mutations;
 public CatalogMatchService(OrderRepository db,OrderMutations mutations){this.db=db;this.mutations=mutations;}
 private static final String NORMAL="regexp_replace(btrim(regexp_replace(replace(normalize(lower(coalesce(b.title,'')),NFD),'đ','d'), U&'[\\0300-\\036F]','','g')), '\\s+', ' ', 'g')";
 private static final String SELECT="select b.id,l.id listing_id,b.book_code,b.title,b.weight_g,l.price_min_vnd,l.price_max_vnd,b.version,l.publication_status,(select coalesce(sum(v.stock),0) from book_variant v where v.book_copy_id=b.id) stock,(select coalesce(sum(r.quantity),0) from order_reservation r where r.book_copy_id=b.id and r.state='ACTIVE') reserved_quantity,exists(select 1 from book_media m where m.book_copy_id=b.id and m.role='FRONT' and m.state='ACTIVE') has_cover,(select fi.sale_price_vnd from flash_sale_item fi cross join flash_sale f where fi.listing_id=l.id and f.id=1 and f.enabled and f.starts_at<=current_timestamp and f.ends_at>current_timestamp and b.availability='AVAILABLE' and l.publication_status='PUBLISHED' and fi.sale_price_vnd<l.price_min_vnd) sale_price_vnd from book_copy b join listing l on l.book_copy_id=b.id where b.deleted_at is null";
 private CatalogCandidate candidate(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new CatalogCandidate(r.getString("id"),r.getString("listing_id"),r.getString("book_code"),r.getString("title"),r.getObject("weight_g",Long.class),r.getObject("price_min_vnd",Long.class),r.getObject("price_max_vnd",Long.class),r.getLong("stock"),r.getString("publication_status"),r.getLong("version"),r.getBoolean("has_cover")?"/api/v1/admin/books/"+r.getString("id")+"/media/FRONT/content":null,r.getObject("sale_price_vnd",Long.class),r.getLong("reserved_quantity"),Math.addExact(r.getLong("stock"),r.getLong("reserved_quantity")));}
 public CatalogCandidate catalog(long id){return db.jdbc.query(SELECT+" and b.id=?",this::candidate,id).stream().findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));}
 public List<CatalogCandidate> find(String title){
  String q=normalizeTitle(text(title,"title",300,true));if(q.isEmpty())throw AdminApiException.field("title","Nhập tên sách");var tokens=Arrays.stream(q.split(" ")).filter(s->!s.isEmpty()).map(s->s.substring(0,Math.min(3,s.length()))).distinct().toList();
  var args=new ArrayList<Object>();var where=new StringBuilder(" and ("+NORMAL+"=?");args.add(q);
  for(String token:tokens){where.append(" or ").append(NORMAL).append(" like ? escape '!'");args.add("%"+literal(token)+"%");}where.append(")");
  String score=tokens.stream().map(t->"case when "+NORMAL+" like ? escape '!' then 1 else 0 end").collect(java.util.stream.Collectors.joining("+"));
  args.add(q);for(String token:tokens)args.add("%"+literal(token)+"%");args.add(q);
  // ponytail: cap fuzzy candidates at 200; exact matches rank first. A larger catalogue may need a measured indexed search upgrade.
  var candidates=db.jdbc.query(SELECT+where+" order by ("+NORMAL+"=?) desc,("+score+") desc,abs(length("+NORMAL+")-length(?)),b.id limit 200",this::candidate,args.toArray());
  return candidates.stream().filter(c->similarity(q,normalizeTitle(c.title()))>=0.8).sorted(Comparator.<CatalogCandidate>comparingDouble(c->similarity(q,normalizeTitle(c.title()))).reversed().thenComparingLong(c->Long.parseLong(c.id()))).limit(5).toList();
 }
 public MatchResult match(String title){var result=find(title);String normalized=normalizeTitle(title);return new MatchResult(normalized,mutations.hash(Arrays.asList(normalized,result.stream().map(c->List.of(c.id(),c.version())).toList())),result);}
 public String confirm(String title,MatchConfirmation confirmation){var result=match(title);if(result.items().isEmpty())return null;
  if(confirmation==null||!result.normalizedTitle().equals(confirmation.normalizedTitle())||!result.fingerprint().equals(confirmation.fingerprint()))throw new ManualMatchException(result);
  return text(confirmation.reason(),"manualMatchOverrideReason",1000,true);
 }
 private static String literal(String s){return s.replace("!","!!").replace("%","!%").replace("_","!_");}
 private static double similarity(String a,String b){if(a.equals(b))return 1;int[] row=new int[b.length()+1];for(int j=0;j<row.length;j++)row[j]=j;
  for(int i=1;i<=a.length();i++){int diagonal=row[0];row[0]=i;for(int j=1;j<=b.length();j++){int old=row[j];row[j]=Math.min(Math.min(row[j]+1,row[j-1]+1),diagonal+(a.charAt(i-1)==b.charAt(j-1)?0:1));diagonal=old;}}
  return 1d-(double)row[b.length()]/Math.max(a.length(),b.length());
 }
 public static final class ManualMatchException extends AdminApiException {public final MatchResult matches;public ManualMatchException(MatchResult matches){super(409,"manual_match_confirmation_required");this.matches=matches;}}
 public Page<CatalogCandidate> catalogList(String query,int page,int size){
  String q=text(query,"q",200,false);String where="";var args=new ArrayList<Object>();
  if(q!=null){where=" and ("+NORMAL+" like ? escape '!' or lower(b.book_code) like ? escape '!')";args.add("%"+literal(normalizeTitle(q))+"%");args.add("%"+literal(q.toLowerCase(Locale.ROOT))+"%");}
  long total=db.jdbc.queryForObject("select count(*) from book_copy b join listing l on l.book_copy_id=b.id where b.deleted_at is null"+where,Long.class,args.toArray());args.add(size);args.add((long)page*size);
  var result=db.jdbc.query(SELECT+where+" order by b.updated_at desc,b.id desc limit ? offset ?",this::candidate,args.toArray());return new Page<>(result,page,size,total,(total+size-1)/size);
 }

}
