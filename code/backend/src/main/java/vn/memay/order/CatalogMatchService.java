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
 private CatalogCandidate candidate(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new CatalogCandidate(r.getString("id"),r.getString("listing_id"),r.getString("book_code"),r.getString("title"),r.getObject("weight_g",Long.class),r.getObject("price_min_vnd",Long.class),r.getObject("price_max_vnd",Long.class),r.getLong("stock"),r.getString("publication_status"),r.getLong("version"),r.getBoolean("has_cover")?"/api/v1/admin/books/"+r.getString("id")+"/media/FRONT/content":null,r.getObject("sale_price_vnd",Long.class),r.getLong("reserved_quantity"),Math.addExact(r.getLong("stock"),r.getLong("reserved_quantity")),false);}
 public CatalogCandidate catalog(long id){return db.jdbc.query(SELECT+" and b.id=?",this::candidate,id).stream().findFirst().orElseThrow(()->new AdminApiException(404,"not_found"));}
 /** Mirrors TitleMatch.normalize; the two arguments are the characters to replace and their replacement. */
 private static final String TITLE="btrim(regexp_replace(translate(lower(translate(regexp_replace(normalize(b.title,NFD),U&'[\\0300-\\036F]','','g'),'Đđ','dd')),?,?),' +',' ','g'))";
 private record Scored(long id,boolean exact,double score,int gap){}
 public List<CatalogCandidate> find(String title){
  String q=TitleMatch.normalize(text(title,"title",300,true));if(q.isEmpty())return List.of();
  var words=Arrays.stream(q.split(" ")).filter(w->w.length()>1).distinct().sorted(Comparator.comparingInt(String::length).reversed()).limit(12).toList();
  var args=new ArrayList<Object>(List.of(TitleMatch.SPACED+TitleMatch.DROPPED," ".repeat(TitleMatch.SPACED.length())));
  var hits=new StringBuilder("0");for(String w:words){hits.append("+case when ' '||n like ? then ").append(w.length()).append(" else 0 end");args.add("% "+w.substring(0,Math.min(3,w.length()))+"%");}
  Collections.addAll(args,q,q,q.length());
  // ponytail: cap fuzzy candidates at 200; exact matches rank first. A larger catalogue may need a measured indexed search upgrade.
  var scored=db.jdbc.query("with titles as materialized(select b.id,"+TITLE+" n from book_copy b join listing l on l.book_copy_id=b.id where b.deleted_at is null),hits as(select id,n,"+hits+" hit from titles) select id,n from hits where hit>0 or n=? order by (n=?) desc,hit desc,abs(length(n)-?),id limit 200",
   (r,i)->{String n=r.getString("n");return new Scored(r.getLong("id"),n.equals(q),TitleMatch.score(q,n),Math.abs(n.length()-q.length()));},args.toArray());
  var best=scored.stream().filter(s->s.exact()||s.score()>=TitleMatch.THRESHOLD).sorted(Comparator.comparing(Scored::exact).reversed().thenComparing(Comparator.comparingDouble(Scored::score).reversed()).thenComparingInt(Scored::gap).thenComparingLong(Scored::id)).limit(5).toList();
  if(best.isEmpty())return List.of();
  var found=new HashMap<Long,CatalogCandidate>();
  for(var c:db.jdbc.query(SELECT+" and b.id in ("+String.join(",",Collections.nCopies(best.size(),"?"))+")",this::candidate,best.stream().map(Scored::id).toArray()))found.put(Long.parseLong(c.id()),c);
  return best.stream().filter(s->found.containsKey(s.id())).map(s->s.exact()?found.get(s.id()).asExact():found.get(s.id())).toList();
 }
 public MatchResult match(String title){var result=find(title);String normalized=TitleMatch.normalize(title);return new MatchResult(normalized,mutations.hash(Arrays.asList(normalized,result.stream().filter(CatalogCandidate::exact).map(c->List.of(c.id(),c.version())).toList())),result);}
 /** Only identical titles need a reason; near titles are suggestions. */
 public String confirm(String title,MatchConfirmation confirmation){var result=match(title);if(result.items().stream().noneMatch(CatalogCandidate::exact))return null;
  if(confirmation==null||!result.normalizedTitle().equals(confirmation.normalizedTitle())||!result.fingerprint().equals(confirmation.fingerprint()))throw new ManualMatchException(result);
  return text(confirmation.reason(),"manualMatchOverrideReason",1000,true);
 }
 private static String literal(String s){return s.replace("!","!!").replace("%","!%").replace("_","!_");}
 public static final class ManualMatchException extends AdminApiException {public final MatchResult matches;public ManualMatchException(MatchResult matches){super(409,"manual_match_confirmation_required");this.matches=matches;}}
 public Page<CatalogCandidate> catalogList(String query,int page,int size){
  String q=text(query,"q",200,false);String where="";var args=new ArrayList<Object>();
  if(q!=null){where=" and ("+NORMAL+" like ? escape '!' or lower(b.book_code) like ? escape '!')";args.add("%"+literal(normalizeTitle(q))+"%");args.add("%"+literal(q.toLowerCase(Locale.ROOT))+"%");}
  long total=db.jdbc.queryForObject("select count(*) from book_copy b join listing l on l.book_copy_id=b.id where b.deleted_at is null"+where,Long.class,args.toArray());args.add(size);args.add((long)page*size);
  var result=db.jdbc.query(SELECT+where+" order by b.updated_at desc,b.id desc limit ? offset ?",this::candidate,args.toArray());return new Page<>(result,page,size,total,(total+size-1)/size);
 }

}
