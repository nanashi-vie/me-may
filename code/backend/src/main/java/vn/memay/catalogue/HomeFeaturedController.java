package vn.memay.catalogue;

import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.memay.common.AdminActorResolver;

@RestController
@RequestMapping("/api/v1/admin/home-featured")
public class HomeFeaturedController {
    private final HomeFeaturedService featured;
    private final AdminActorResolver actors;

    public HomeFeaturedController(HomeFeaturedService featured, AdminActorResolver actors) {
        this.featured = featured;
        this.actors = actors;
    }

    @GetMapping
    public HomeFeaturedService.Config get(Authentication a) {
        return featured.get(actors.current(a));
    }

    @GetMapping("/candidates")
    public List<HomeFeaturedService.PinnedBook> candidates(Authentication a,
            @RequestParam String shelfKey,
            @RequestParam(required = false) String q) {
        return featured.candidates(actors.current(a), shelfKey, q);
    }

    @PutMapping
    public HomeFeaturedService.Config update(Authentication a,
            @RequestBody HomeFeaturedService.UpdateRequest body) {
        return featured.update(actors.current(a), body);
    }
}

