package vn.memay.support;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.order.OrderRepository;
public abstract class OrderTestSupport extends CatalogueTestSupport {
 @Autowired protected OrderRepository orders;
 protected long customer(){return jdbc.queryForObject("insert into customer(full_name,phone,default_address,created_by) values('Synthetic customer','0901234567','Synthetic address',?) returning id",Long.class,owner.getId());}
 protected long draft(){return jdbc.queryForObject("insert into orders(customer_id,customer_code_snapshot,customer_name_snapshot,created_by) values(?,'KH-TEST','Synthetic customer',?) returning id",Long.class,customer(),owner.getId());}
 protected long manual(long orderId,long price,long quantity,long weight){return jdbc.queryForObject("insert into order_items(order_id,source_type,title_snapshot,unit_price_vnd,quantity,unit_weight_grams,created_by) values(?,'MANUAL','Synthetic book',?,?,?,?) returning id",Long.class,orderId,price,quantity,weight,owner.getId());}
}
