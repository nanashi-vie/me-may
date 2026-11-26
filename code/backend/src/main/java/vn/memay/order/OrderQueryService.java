package vn.memay.order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.memay.auth.AdminUser;
import vn.memay.common.AdminApiException;
import java.sql.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
import static vn.memay.order.OrderValidation.*;
@Service
@Transactional(readOnly=true)
public class OrderQueryService {
 private final OrderRepository db;private final OrderMutations access;private final CatalogMatchService catalog;
 public OrderQueryService(OrderRepository db,OrderMutations access,CatalogMatchService catalog){this.db=db;this.access=access;this.catalog=catalog;}
 private record Where(String sql,List<Object> args){}
 private static final String END_DATE="((o.keep_until at time zone 'Asia/Ho_Chi_Minh')::date-1)";
 /** A cancelled order with return rows was closed after delivery, not cancelled before it. */
 private static final String RETURNED="(o.status='CANCELLED' and exists(select 1 from order_returns x where x.order_id=o.id))";
 private static final String AGGREGATES=" from orders o left join lateral (select coalesce(sum(quantity),0) qty,coalesce(sum(unit_price_vnd::numeric*quantity),0) subtotal,case when count(*) filter(where unit_weight_grams is null)>0 then null else coalesce(sum(unit_weight_grams::numeric*quantity),0) end weight from order_items where order_id=o.id) i on true left join lateral(select coalesce(sum(case when transaction_type='REFUND' then -amount else amount end),0) paid from order_payments where order_id=o.id and voided_at is null) p on true";
 public Page<OrderSummary> list(OrderFilter f,AdminUser actor){access.requireOwner(actor,false);Instant now=db.clock.instant();var w=where(f,now);var args=new ArrayList<>(w.args());
  long count=db.jdbc.queryForObject("select count(*) from orders o"+w.sql(),Long.class,args.toArray());args.add(f.size());args.add((long)f.page()*f.size());
  var rows=db.jdbc.query("select o.*,i.qty item_qty,i.subtotal item_subtotal,i.weight book_weight,p.paid paid_amount,"+OrderTrashService.trashable("o")+" trashable,"+RETURNED+" returned"+AGGREGATES+w.sql()+" order by "+group(f).order+" limit ? offset ?",(r,n)->{
   long subtotal=checked(r.getBigDecimal("item_subtotal").toBigIntegerExact(),"subtotal"),paid=checked(r.getBigDecimal("paid_amount").toBigIntegerExact(),"paidAmount");var weight=r.getBigDecimal("book_weight");
   var total=aggregate(subtotal,r.getLong("discount_amount"),r.getObject("shipping_fee",Long.class),paid,weight==null?null:checked(weight.toBigIntegerExact(),"totalBookWeightGrams"));
   Status status=Status.valueOf(r.getString("status"));Instant until=instant(r,"keep_until");
   return new OrderSummary(r.getString("id"),r.getString("order_code"),r.getString("customer_id"),r.getString("customer_name_snapshot"),r.getString("customer_phone_snapshot"),status,r.getString("fulfillment_type"),r.getTimestamp("created_at").toInstant(),until,r.getLong("item_qty"),total,r.getLong("version"),warning(status,until,now),r.getBoolean("trashable"),r.getBoolean("returned"),instant(r,"completed_at"),instant(r,"cancelled_at"));
  },args.toArray());return new Page<>(rows,f.page(),f.size(),count,(count+f.size()-1)/f.size());
 }
 /** Tab counts: validated like the list, but the open tab, its sub-filter and the page must not change them. */
 public OrderStats stats(OrderFilter f,AdminUser actor){access.requireOwner(actor,false);Instant now=db.clock.instant();where(f,now);
  var w=where(new OrderFilter(f.q(),"ALL",f.customerId(),f.createdFrom(),f.createdTo(),"ALL",0,1,"ALL"),now);var args=new ArrayList<Object>();args.add(Timestamp.from(now));args.add(java.sql.Date.valueOf(now.atZone(ZONE).toLocalDate()));args.addAll(w.args());
  String sql="with t as(select cast(? as timestamptz) moment,cast(? as date) today) select count(*) filter(where status='KEEPING'),count(*) filter(where status='KEEPING' and keep_until>t.moment and "+END_DATE+" between t.today+1 and t.today+3),count(*) filter(where status='KEEPING' and keep_until>t.moment and "+END_DATE+"=t.today),count(*) filter(where status='KEEPING' and keep_until<=t.moment),count(*) filter(where status='READY_TO_SHIP'),count(*) filter(where status='COMPLETED'),count(*) filter(where status='DRAFT'),count(*) filter(where status='CANCELLED' and not "+RETURNED+"),count(*) filter(where "+RETURNED+") from orders o cross join t"+w.sql();
  return db.jdbc.queryForObject(sql,(r,n)->new OrderStats(r.getLong(1),r.getLong(2),r.getLong(3),r.getLong(4),r.getLong(5),r.getLong(6),r.getLong(7),r.getLong(8),r.getLong(9)),args.toArray());
 }
 public OrderDetail detail(long id,AdminUser actor){access.requireOwner(actor,false);return db.require(id,false);}
 public Page<CatalogCandidate> catalog(String q,int page,int size,AdminUser actor){access.requireOwner(actor,false);paging(page,size);return catalog.catalogList(q,page,size);}
 public MatchResult matches(String title,AdminUser actor){access.requireOwner(actor,false);return catalog.match(title);}
 private Where where(OrderFilter f,Instant now){paging(f.page(),f.size());var sql=new StringBuilder(" where o.deleted_at is null");var args=new ArrayList<Object>();String q=text(f.q(),"q",200,false);
  var group=group(f);if(!group.condition.isEmpty())sql.append(" and ").append(group.condition);
  if(f.status()!=null&&!f.status().isBlank()&&!f.status().equals("ALL")){
   if(f.status().equals("RETURNED"))sql.append(" and ").append(RETURNED);
   else{try{Status.valueOf(f.status());}catch(IllegalArgumentException e){throw new AdminApiException(400,"invalid_request");}sql.append(" and o.status=?");args.add(f.status());
    if(f.status().equals("CANCELLED"))sql.append(" and not ").append(RETURNED);}
  }
  if(f.customerId()!=null&&!f.customerId().isBlank()){sql.append(" and o.customer_id=?");args.add(id(f.customerId(),"customerId"));}
  if(q!=null){String token="%"+literal(q.toLowerCase(Locale.ROOT))+"%";String phone=q.replaceAll("[\\s.\\-]","");if(phone.startsWith("+84"))phone="0"+phone.substring(3);String pt="%"+literal(phone)+"%";
   sql.append(" and (lower(o.order_code) like ? escape '!' or lower(o.customer_code_snapshot) like ? escape '!' or lower(o.customer_name_snapshot) like ? escape '!' or o.customer_phone_snapshot like ? escape '!' or exists(select 1 from customer c where c.id=o.customer_id and (lower(c.customer_code) like ? escape '!' or lower(c.full_name) like ? escape '!' or c.phone like ? escape '!')))");Collections.addAll(args,token,token,token,pt,token,token,pt);
  }
  LocalDate from=date(f.createdFrom(),"createdFrom"),to=date(f.createdTo(),"createdTo");if(from!=null&&to!=null&&from.isAfter(to))throw AdminApiException.field("createdFrom","Ngày bắt đầu phải trước ngày kết thúc");
  if(from!=null){sql.append(" and o.created_at>=?");args.add(Timestamp.from(from.atStartOfDay(ZONE).toInstant()));}if(to!=null){sql.append(" and o.created_at<?");args.add(Timestamp.from(to.plusDays(1).atStartOfDay(ZONE).toInstant()));}
  String warning=f.keepWarning()==null||f.keepWarning().isBlank()?"ALL":f.keepWarning();if(!Set.of("ALL","SOON","DUE","OVERDUE").contains(warning))throw new AdminApiException(400,"invalid_request");
  if(!warning.equals("ALL")){sql.append(" and o.status='KEEPING' and o.keep_until").append(warning.equals("OVERDUE")?"<=?":" >?");args.add(Timestamp.from(now));var today=now.atZone(ZONE).toLocalDate();
   if(warning.equals("SOON")){sql.append(" and ").append(END_DATE).append(" between ? and ?");args.add(java.sql.Date.valueOf(today.plusDays(1)));args.add(java.sql.Date.valueOf(today.plusDays(3)));}
   else if(warning.equals("DUE")){sql.append(" and ").append(END_DATE).append("=?");args.add(java.sql.Date.valueOf(today));}
  }return new Where(sql.toString(),args);
 }
 private static Group group(OrderFilter f){if(f.group()==null||f.group().isBlank())return Group.ALL;try{return Group.valueOf(f.group());}catch(IllegalArgumentException e){throw new AdminApiException(400,"invalid_request");}}
 private static Instant instant(ResultSet r,String column)throws SQLException{var at=r.getTimestamp(column);return at==null?null:at.toInstant();}
 static void paging(int page,int size){if(page<0||size<1||size>100)throw new AdminApiException(400,"invalid_request");}
 private static LocalDate date(String value,String field){if(value==null||value.isBlank())return null;try{if(!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}"))throw new IllegalArgumentException();return LocalDate.parse(value);}catch(RuntimeException e){throw AdminApiException.field(field,"Ngày không hợp lệ");}}
 private static String literal(String s){return s.replace("!","!!").replace("%","!%").replace("_","!_");}
 static String warning(Status status,Instant until,Instant now){if(status!=Status.KEEPING||until==null)return "";if(!now.isBefore(until))return "OVERDUE";long days=ChronoUnit.DAYS.between(now.atZone(ZONE).toLocalDate(),until.atZone(ZONE).toLocalDate().minusDays(1));return days==0?"DUE":days>=1&&days<=3?"SOON":"";}
}
