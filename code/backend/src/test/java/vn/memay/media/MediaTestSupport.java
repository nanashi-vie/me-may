package vn.memay.media;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.BeforeEach;
import vn.memay.support.*;
@Import(MediaTestSupport.Fakes.class)
abstract class MediaTestSupport extends CatalogueTestSupport {
 @TestConfiguration static class Fakes {@Bean @Primary FakeMediaGateway fakeMediaGateway(){return new FakeMediaGateway();}}
 @Autowired protected FakeMediaGateway fake;@Autowired protected MediaService media;@Autowired protected MediaCleanupJob cleanup;
 @BeforeEach void resetProvider(){fake.reset();}
}
