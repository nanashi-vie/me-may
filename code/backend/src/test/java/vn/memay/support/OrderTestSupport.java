package vn.memay.support;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import vn.memay.order.OrderPaymentService;
import vn.memay.order.OrderRepository;
import java.nio.file.*;
import java.util.UUID;
import static vn.memay.order.OrderDtos.*;
public abstract class OrderTestSupport extends CatalogueTestSupport {
 @Autowired protected OrderRepository orders;@Autowired protected OrderPaymentService payments;
 /** Receipt images land in a throwaway media root, never the developer's real one. */
 public static final Path MEDIA_ROOT;
 public static final byte[] PNG;
 static{
  try{
   MEDIA_ROOT=Files.createTempDirectory("memay-proofs");
   var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new java.io.ByteArrayOutputStream();
   javax.imageio.ImageIO.write(image,"png",out);PNG=out.toByteArray();
  }catch(java.io.IOException e){throw new IllegalStateException(e);}
 }
 @DynamicPropertySource static void mediaRoot(DynamicPropertyRegistry p){p.add("memay.media.local.root",()->MEDIA_ROOT.toString());}
 protected Path proofDir(){return MEDIA_ROOT.resolve("private/payment-proofs");}
 protected long proofFiles(){try(var files=Files.exists(proofDir())?Files.list(proofDir()):java.util.stream.Stream.<Path>empty()){return files.count();}catch(java.io.IOException e){throw new IllegalStateException(e);}}
 protected MutationResult deposit(long id,long version,long amount){return payments.record(id,new PaymentRequest(version,UUID.randomUUID(),PaymentType.DEPOSIT,amount,null,false),PNG,owner);}
 protected long customer(){return jdbc.queryForObject("insert into customer(full_name,phone,default_address,created_by) values('Synthetic customer','0901234567','Synthetic address',?) returning id",Long.class,owner.getId());}
 protected long draft(){return jdbc.queryForObject("insert into orders(customer_id,customer_code_snapshot,customer_name_snapshot,created_by) values(?,'KH-TEST','Synthetic customer',?) returning id",Long.class,customer(),owner.getId());}
 protected long manual(long orderId,long price,long quantity,long weight){return jdbc.queryForObject("insert into order_items(order_id,source_type,title_snapshot,unit_price_vnd,quantity,unit_weight_grams,created_by) values(?,'MANUAL','Synthetic book',?,?,?,?) returning id",Long.class,orderId,price,quantity,weight,owner.getId());}
}
