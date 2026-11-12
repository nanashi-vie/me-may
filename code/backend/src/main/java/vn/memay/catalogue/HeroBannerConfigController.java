package vn.memay.catalogue;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import vn.memay.common.AdminActorResolver;
@RestController
@RequestMapping("/api/v1/admin/hero-banners")
public class HeroBannerConfigController {
 private final HeroBannerService banners;private final AdminActorResolver actors;
 public HeroBannerConfigController(HeroBannerService banners,AdminActorResolver actors){this.banners=banners;this.actors=actors;}
 @GetMapping public HeroBannerService.Config get(Authentication a){return banners.get(actors.current(a));}
 @PutMapping public HeroBannerService.Config save(Authentication a,@RequestBody HeroBannerService.Update request){return banners.save(actors.current(a),request);}
}
