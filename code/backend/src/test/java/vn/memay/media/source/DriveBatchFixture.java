package vn.memay.media.source;

import java.time.Clock;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import vn.memay.auth.AdminUser;
import vn.memay.media.ImageJobRepository;
import vn.memay.media.SourceBindingRepository;
import vn.memay.media.UploadSessionTransactions;
import vn.memay.support.PgTestData;

final class DriveBatchFixture implements AutoCloseable {
    final String schema = "batch_" + UUID.randomUUID().toString().replace("-", "");
    final JdbcTemplate db = PgTestData.jdbc(schema);
    final TransactionTemplate tx = new TransactionTemplate(new DataSourceTransactionManager(db.getDataSource()));
    final ObjectMapper json = new ObjectMapper();
    final AdminUser actor = new AdminUser("batch@fixture.test", "fixture", AdminUser.Role.OWNER);
    final UploadSessionTransactions sessions = new UploadSessionTransactions(db, Clock.systemUTC(), "memay/test");
    final SourceBindingRepository bindings = new SourceBindingRepository(db);
    final ImageJobRepository jobs = new ImageJobRepository(db);
    final SourceBindingService sources = new SourceBindingService(db, bindings, jobs, json);
    final DriveBatchService batches;
    final UUID session;
    DriveBatchFixture() {
        Flyway.configure().dataSource(PgTestData.requireTestJdbcUrl(System.getenv("TEST_DB_URL")),
                System.getenv("DB_USER"), System.getenv("DB_PASSWORD")).schemas(schema).defaultSchema(schema).load().migrate();
        long owner = db.queryForObject("INSERT INTO admin_user(email,password_hash,role) VALUES(?,?,'OWNER') RETURNING id",
                Long.class, actor.getEmail(), "fixture");
        ReflectionTestUtils.setField(actor, "id", owner);
        db.update("INSERT INTO image_recipe VALUES('v1','fixture','{}')");
        session = tx.execute(t -> UUID.fromString(sessions.create(actor).id()));
        batches = new DriveBatchService(db, sessions, sources, bindings, json, "memay/test", "v1");
    }
    DriveBatchDtos.Create importing(UUID key, String... ids) {
        return new DriveBatchDtos.Create(DriveBatchDtos.Mode.IMPORT, session, null, null,
                java.util.List.of(ids), java.util.List.of(), key);
    }
    DriveBatchDtos.View create(DriveBatchDtos.Create input) {
        return tx.execute(t -> batches.create(input, actor));
    }
    @Override public void close() { PgTestData.jdbc().execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
}
