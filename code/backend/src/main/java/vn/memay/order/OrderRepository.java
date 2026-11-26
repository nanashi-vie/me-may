package vn.memay.order;
import java.time.*;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
import static vn.memay.order.OrderDtos.*;
@Component
public class OrderRepository {
 final JdbcTemplate jdbc;final ObjectMapper json;final Clock clock;
 public OrderRepository(JdbcTemplate jdbc,ObjectMapper json,Clock clock){this.jdbc=jdbc;this.json=json;this.clock=clock;}
 public Optional<OrderDetail> find(long id,boolean lock){
  var rows=jdbc.queryForList("select * from orders where id=? and deleted_at is null"+(lock?" for update":""),id);
  if(rows.isEmpty())return Optional.empty();var r=rows.getFirst();var items=items(id);var payments=payments(id);
  var totals=OrderValidation.totals(items.stream().map(OrderItem::value).toList(),lng(r,"discount_amount"),nullableLong(r,"shipping_fee"),payments.stream().map(OrderPayment::value).toList());
  return Optional.of(new OrderDetail(str(r,"id"),str(r,"order_code"),str(r,"customer_id"),str(r,"customer_code_snapshot"),str(r,"customer_name_snapshot"),str(r,"customer_phone_snapshot"),Status.valueOf(str(r,"status")),str(r,"fulfillment_type"),lng(r,"version"),time(r,"created_at"),time(r,"updated_at"),time(r,"keep_started_at"),time(r,"keep_until"),(int)lng(r,"keep_extension_count"),lng(r,"required_deposit_vnd"),lng(r,"discount_amount"),str(r,"recipient_name"),str(r,"recipient_phone"),str(r,"shipping_address"),nullableLong(r,"shipping_fee"),nullableLong(r,"parcel_weight_grams"),Boolean.TRUE.equals(r.get("parcel_weight_overridden")),Boolean.TRUE.equals(r.get("parcel_weight_needs_review")),lng(r,"cod_amount"),Boolean.TRUE.equals(r.get("cod_needs_review")),nullableLong(r,"declared_value"),str(r,"shipping_payment_type"),str(r,"customer_payment_mode"),str(r,"tracking_code"),items,payments,shipments(id),notes(id),returns(id),totals,items.stream().mapToLong(OrderItem::quantity).sum(),clock.instant(),time(r,"completed_at"),time(r,"cancelled_at"),channel(str(r,"customer_id"))));
 }
 /** One contact handle from the live customer profile: TikTok, then Threads, then Zalo. Needs customer alias {@code c}. */
 public static final String CHANNEL="case when nullif(btrim(c.tiktok_id),'') is not null then 'TIKTOK' when nullif(btrim(c.threads_id),'') is not null then 'THREADS' when nullif(btrim(c.zalo_name),'') is not null then 'ZALO' end channel_type,coalesce(nullif(btrim(c.tiktok_id),''),nullif(btrim(c.threads_id),''),nullif(btrim(c.zalo_name),'')) channel_value";
 CustomerChannel channel(String customerId){var rows=jdbc.queryForList("select "+CHANNEL+" from customer c where c.id=?",Long.parseLong(customerId));
  if(rows.isEmpty()||rows.getFirst().get("channel_type")==null)return null;return new CustomerChannel(str(rows.getFirst(),"channel_type"),str(rows.getFirst(),"channel_value"));}
 public OrderDetail require(long id,boolean lock){return find(id,lock).orElseThrow(()->new vn.memay.common.AdminApiException(404,"not_found"));}
 public List<OrderItem> items(long id){return jdbc.query("select i.*,exists(select 1 from book_media m where m.book_copy_id=i.book_copy_id and m.role='FRONT' and m.state='ACTIVE') has_cover from order_items i where i.order_id=? order by i.id",(r,n)->new OrderItem(r.getString("id"),r.getString("source_type"),r.getString("book_copy_id"),r.getString("listing_id"),r.getString("book_code_snapshot"),r.getString("title_snapshot"),r.getLong("unit_price_vnd"),r.getLong("quantity"),r.getObject("unit_weight_grams",Long.class),r.getString("manual_match_override_reason"),r.getTimestamp("added_at").toInstant(),r.getBoolean("has_cover")?"/api/v1/admin/books/"+r.getString("book_copy_id")+"/media/FRONT/content":null),id);}
 public List<OrderPayment> payments(long id){return jdbc.query("select * from order_payments where order_id=? order by id",(r,n)->new OrderPayment(r.getString("id"),PaymentType.valueOf(r.getString("transaction_type")),r.getLong("amount"),r.getTimestamp("occurred_at").toInstant(),r.getString("note"),r.getString("created_by"),r.getTimestamp("created_at").toInstant(),r.getTimestamp("voided_at")==null?null:r.getTimestamp("voided_at").toInstant(),r.getString("void_reason"),r.getString("proof_key")!=null),id);}
 @SuppressWarnings("unchecked") public List<Shipment> shipments(long id){return jdbc.query("select * from order_shipments where order_id=? order by attempt_no",(r,n)->new Shipment(r.getString("id"),r.getInt("attempt_no"),r.getString("state"),json.readValue(r.getString("shipping_snapshot"),Map.class),r.getString("tracking_code"),r.getTimestamp("handed_over_at")==null?null:r.getTimestamp("handed_over_at").toInstant(),r.getTimestamp("failed_at")==null?null:r.getTimestamp("failed_at").toInstant(),r.getString("failure_reason"),r.getTimestamp("created_at").toInstant()),id);}
 public static String str(Map<String,Object> r,String k){return r.get(k)==null?null:r.get(k).toString();}
 public static long lng(Map<String,Object> r,String k){return r.get(k)==null?0:((Number)r.get(k)).longValue();}
 public static Long nullableLong(Map<String,Object> r,String k){return r.get(k)==null?null:((Number)r.get(k)).longValue();}
 public static Instant time(Map<String,Object> r,String k){return r.get(k)==null?null:((Timestamp)r.get(k)).toInstant();}
 public List<ActionNote> notes(long id){return jdbc.query("select * from order_action_notes where order_id=? order by id",(r,n)->new ActionNote(r.getString("id"),r.getString("operation"),r.getString("reason"),r.getLong("order_version"),r.getString("actor_id"),r.getTimestamp("created_at").toInstant(),r.getString("item_id"),r.getString("book_code_snapshot"),r.getString("title_snapshot"),r.getObject("quantity_removed",Long.class)),id);}
 public void note(long id,String operation,String reason,MutationMeta meta,vn.memay.auth.AdminUser actor){jdbc.update("insert into order_action_notes(order_id,operation,reason,order_version,request_id,actor_id,created_at) select id,?,?,version+1,?,?,? from orders where id=?",operation,reason,meta.requestId(),actor.getId(),Timestamp.from(clock.instant()),id);}

 public void noteItem(long id,String operation,String reason,MutationMeta meta,vn.memay.auth.AdminUser actor,OrderItem item,long removed){jdbc.update("insert into order_action_notes(order_id,operation,reason,order_version,request_id,actor_id,created_at,item_id,book_code_snapshot,title_snapshot,quantity_removed) select id,?,?,version+1,?,?,?,?,?,?,? from orders where id=?",operation,reason,meta.requestId(),actor.getId(),Timestamp.from(clock.instant()),Long.parseLong(item.id()),item.bookCodeSnapshot(),item.titleSnapshot(),removed,id);}

 public List<OrderReturn> returns(long id){return jdbc.query("select * from order_returns where order_id=? order by id",(r,n)->new OrderReturn(r.getString("id"),r.getString("item_id"),r.getLong("quantity_received"),r.getLong("quantity_restocked"),r.getString("reason"),r.getString("created_by"),r.getTimestamp("created_at").toInstant()),id);}

}
