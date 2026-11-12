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
}
