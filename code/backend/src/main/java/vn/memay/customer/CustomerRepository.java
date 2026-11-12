package vn.memay.customer;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import static vn.memay.customer.CustomerDtos.*;
@Repository
public class CustomerRepository {
 private final JdbcTemplate jdbc;
 public CustomerRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
 private static final RowMapper<CustomerDetail> DETAIL=(r,n)->new CustomerDetail(r.getString("id"),r.getString("customer_code"),r.getString("full_name"),r.getString("phone"),r.getString("default_address"),r.getString("zalo_name"),r.getString("tiktok_id"),r.getString("threads_id"),r.getString("note"),Status.valueOf(r.getString("status")),r.getLong("version"),r.getString("created_by"),r.getTimestamp("created_at").toInstant(),r.getTimestamp("updated_at").toInstant());
 public Optional<CustomerDetail> find(long id,boolean forUpdate){return jdbc.query("select * from customer where id=?"+(forUpdate?" for update":""),DETAIL,id).stream().findFirst();}
 public CustomerDetail insert(CustomerWrite w,long actorId,Instant now){return jdbc.queryForObject("insert into customer(full_name,phone,default_address,zalo_name,tiktok_id,threads_id,note,created_by,created_at,updated_at) values(?,?,?,?,?,?,?,?,?,?) returning *",DETAIL,w.fullName(),w.phone(),w.defaultAddress(),w.zaloName(),w.tiktokId(),w.threadsId(),w.note(),actorId,Timestamp.from(now),Timestamp.from(now));}

 public Page<CustomerSummary> list(String q,String status,int page,int size){
  var args=new ArrayList<Object>();var where=new StringBuilder(" where true");
  if(!status.equals("ALL")){where.append(" and status=?");args.add(status);}
  if(!q.isEmpty()){
   String token=literal(q.toLowerCase(java.util.Locale.ROOT));
   String handle=literal((q.startsWith("@")?q.substring(1):q).toLowerCase(java.util.Locale.ROOT));
   where.append(" and (lower(customer_code) like ? escape '!' or lower(full_name) like ? escape '!' or lower(regexp_replace(zalo_name,'^@','')) like ? escape '!' or lower(regexp_replace(tiktok_id,'^@','')) like ? escape '!' or lower(regexp_replace(threads_id,'^@','')) like ? escape '!'");
   Collections.addAll(args,token,token,handle,handle,handle);
   String phone=q.replaceAll("[\\s.\\-]","");
   if(phone.matches("(?:\\+84|0)?[0-9]+")){
    where.append(" or phone like ? escape '!' or ('+84'||substring(phone from 2)) like ? escape '!'");
    Collections.addAll(args,literal(phone),literal(phone));
   }
   where.append(")");
  }
  long total=jdbc.queryForObject("select count(*) from customer"+where,Long.class,args.toArray());
  Collections.addAll(args,size,(long)page*size);
  var items=jdbc.query("select id,customer_code,full_name,phone,default_address,status,version,created_at from customer"+where+" order by created_at desc,id desc limit ? offset ?",(r,n)->new CustomerSummary(r.getString("id"),r.getString("customer_code"),r.getString("full_name"),r.getString("phone"),r.getString("default_address"),Status.valueOf(r.getString("status")),r.getLong("version"),r.getTimestamp("created_at").toInstant()),args.toArray());
  return new Page<>(items,page,size,total,(total+size-1)/size);
 }
 private static String literal(String s){return "%"+s.replace("!","!!").replace("%","!%").replace("_","!_")+"%";}
 public Page<DuplicateSummary> duplicates(String phone,Long excludeId,int page,int size){
  if(phone==null)return new Page<>(List.of(),page,size,0,0);
  String where=" where phone=?"+(excludeId==null?"":" and id<>?");var args=new ArrayList<Object>();args.add(phone);if(excludeId!=null)args.add(excludeId);
  long total=jdbc.queryForObject("select count(*) from customer"+where,Long.class,args.toArray());Collections.addAll(args,size,(long)page*size);
  var items=jdbc.query("select id,customer_code,full_name,phone,status from customer"+where+" order by created_at desc,id desc limit ? offset ?",(r,n)->new DuplicateSummary(r.getString("id"),r.getString("customer_code"),r.getString("full_name"),r.getString("phone"),Status.valueOf(r.getString("status"))),args.toArray());
  return new Page<>(items,page,size,total,(total+size-1)/size);
 }
 public int update(long id,long version,CustomerWrite w,Instant now){return jdbc.update("update customer set full_name=?,phone=?,default_address=?,zalo_name=?,tiktok_id=?,threads_id=?,note=?,version=version+1,updated_at=? where id=? and version=?",w.fullName(),w.phone(),w.defaultAddress(),w.zaloName(),w.tiktokId(),w.threadsId(),w.note(),Timestamp.from(now),id,version);}
 public int setStatus(long id,long version,Status status,Instant now){return jdbc.update("update customer set status=?,version=version+1,updated_at=? where id=? and version=?",status.name(),Timestamp.from(now),id,version);}
}
