package vn.memay.support;
import org.springframework.beans.factory.annotation.Autowired;
import vn.memay.order.*;
import java.util.*;
import static vn.memay.order.OrderDtos.*;
public abstract class OrderShippingTestSupport extends OrderTestSupport {
 @Autowired protected OrderShippingService shipping;@Autowired protected OrderDraftService drafts;
 protected long sale(long quantity){var b=ready();jdbc.update("update book_variant set stock=? where book_copy_id=?",quantity,Long.parseLong(b.id()));long id=draft();drafts.addItem(id,new ItemRequest(0L,UUID.randomUUID(),"CATALOG",b.id(),null,500000L,quantity,250L,null),owner);return id;}
 protected ShippingRequest shipping(long v,Long fee,Long weight,long cod){return new ShippingRequest(v,UUID.randomUUID(),"Synthetic receiver","0901234567","Synthetic address",fee,weight,true,true,cod,true,"PP_CASH","RECIPIENT",null,0L,null);}
 protected long readyOrder(){long id=sale(1);shipping.finalizeOrder(id,shipping(1,30000L,300L,0),owner);return id;}
 protected long shippedOrder(){long id=readyOrder();shipping.ship(id,new ShipRequest(2L,UUID.randomUUID(),"TRACKONE01"),owner);return id;}
}
