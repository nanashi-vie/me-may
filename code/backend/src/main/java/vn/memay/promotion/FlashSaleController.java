package vn.memay.promotion;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import vn.memay.common.AdminActorResolver;
@RestController
public class FlashSaleController {
 private final FlashSaleService sales;private final AdminActorResolver actors;
 public FlashSaleController(FlashSaleService sales,AdminActorResolver actors){this.sales=sales;this.actors=actors;}
 @GetMapping("/api/v1/flash-sale") public FlashSaleService.PublicSale active(){return sales.active();}
 @GetMapping("/api/v1/admin/flash-sale") public FlashSaleService.Campaign get(Authentication a){return sales.get(actors.current(a));}
 @PutMapping("/api/v1/admin/flash-sale") public FlashSaleService.Campaign update(Authentication a,@RequestBody FlashSaleService.Campaign body){return sales.update(actors.current(a),body);}
}
