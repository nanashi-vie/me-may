package vn.memay.order;

import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import vn.memay.support.AdminHttpClient;
import vn.memay.support.AdminHttpClient.Part;
import vn.memay.support.OrderTestSupport;
import static org.assertj.core.api.Assertions.*;
import static vn.memay.support.AdminHttpClient.*;

class OrderPaymentProofApiTest extends OrderTestSupport {
    private static final String BASE = "/api/v1/admin/orders";
    @Value("${local.server.port}") int port;
    private AdminHttpClient api;

    @BeforeEach void login() throws Exception {
        api = new AdminHttpClient(port);
        api.login("owner@catalogue.test");
        try (var files = java.nio.file.Files.exists(proofDir()) ? java.nio.file.Files.list(proofDir()) : java.util.stream.Stream.<java.nio.file.Path>empty()) {
            for (var f : files.toList()) java.nio.file.Files.delete(f);
        }
    }

    private long invoice() {
        long id = draft();
        manual(id, 500000, 1, 250);
        return id;
    }

    private Part payment(Map<String, Object> fields) {
        return new Part("payment", null, "application/json", json(fields).getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Object> deposit(long version, UUID request, long amount) {
        return Map.of("version", version, "requestId", request.toString(), "transactionType", "DEPOSIT", "amount", amount);
    }

    private Part proof(byte[] bytes) {
        return new Part("proof", "bill.png", "image/png", bytes);
    }

    private HttpResponse<String> post(long id, Part... parts) throws Exception {
        return api.parts(BASE + "/" + id + "/payments", List.of(parts), true);
    }

    private long onlyPayment(long id) {
        return jdbc.queryForObject("select id from order_payments where order_id=?", Long.class, id);
    }

    @Test void recordsDepositWithOneProof() throws Exception {
        long id = invoice();
        var r = post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof(PNG));
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        var payments = tree(api.send("GET", BASE + "/" + id, null, false)).path("payments");
        assertThat(payments.size()).isEqualTo(1);
        assertThat(payments.get(0).path("hasProof").asBoolean()).isTrue();
        assertThat(proofFiles()).isEqualTo(1);
    }

    @Test void recordsWithoutProofWhenTheNoteSaysWhy() throws Exception {
        long id = invoice();
        var fields = new HashMap<>(deposit(0, UUID.randomUUID(), 100000));
        fields.put("note", "Khách trả tiền mặt tại tiệm");
        var r = post(id, payment(fields));
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        var paid = tree(api.send("GET", BASE + "/" + id, null, false)).path("payments").get(0);
        assertThat(paid.path("hasProof").asBoolean()).isFalse();
        assertThat(proofFiles()).isZero();
    }

    @Test void missingProofIs400() throws Exception {
        var r = post(invoice(), payment(deposit(0, UUID.randomUUID(), 100000)));
        assertThat(r.statusCode()).isEqualTo(400);
        assertThat(tree(r).path("fieldErrors").has("proof")).isTrue();
    }

    @Test void twoFilesIs400() throws Exception {
        var r = post(invoice(), payment(deposit(0, UUID.randomUUID(), 100000)), proof(PNG), proof(PNG));
        assertThat(r.statusCode()).isEqualTo(400);
        assertThat(proofFiles()).isZero();
    }

    @Test void paymentTypeIs400() throws Exception {
        var fields = new HashMap<>(deposit(0, UUID.randomUUID(), 100000));
        fields.put("transactionType", "PAYMENT");
        assertThat(post(invoice(), payment(fields), proof(PNG)).statusCode()).isEqualTo(400);
        assertThat(proofFiles()).isZero();
    }

    @Test void rejectsFakeImageAndLeavesNoFile() throws Exception {
        long id = invoice();
        assertThat(post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof("not an image".getBytes(StandardCharsets.UTF_8))).statusCode()).isEqualTo(415);
        assertThat(post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof(new byte[0])).statusCode()).isIn(400, 415);
        assertThat(proofFiles()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from order_payments", Long.class)).isZero();
    }

    @Test void replaySameProofReturnsSameResultWithoutSecondFile() throws Exception {
        long id = invoice();
        var request = UUID.randomUUID();
        var first = post(id, payment(deposit(0, request, 100000)), proof(PNG));
        var again = post(id, payment(deposit(0, request, 100000)), proof(PNG));
        assertThat(again.statusCode()).isEqualTo(200);
        assertThat(again.body()).isEqualTo(first.body());
        assertThat(jdbc.queryForObject("select count(*) from order_payments", Long.class)).isEqualTo(1);
        assertThat(proofFiles()).isEqualTo(1);
    }

    @Test void sameRequestDifferentProofIs409() throws Exception {
        long id = invoice();
        var request = UUID.randomUUID();
        post(id, payment(deposit(0, request, 100000)), proof(PNG));
        var other = new java.awt.image.BufferedImage(3, 3, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var out = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(other, "png", out);
        var r = post(id, payment(deposit(0, request, 100000)), proof(out.toByteArray()));
        assertThat(r.statusCode()).isEqualTo(409);
        assertThat(tree(r).path("error").asString()).isEqualTo("idempotency_conflict");
        assertThat(proofFiles()).isEqualTo(1);
    }

    @Test void failedWriteRemovesStoredProof() throws Exception {
        long id = invoice();
        var refund = Map.<String, Object>of("version", 0, "requestId", UUID.randomUUID().toString(), "transactionType", "REFUND", "amount", 1000, "actualConfirmed", true);
        var r = post(id, payment(refund), proof(PNG));
        assertThat(r.statusCode()).isBetween(400, 409);
        assertThat(proofFiles()).isZero();
    }

    @Test void ownerReadsProofWithPrivateHeaders() throws Exception {
        long id = invoice();
        post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof(PNG));
        var r = api.download(BASE + "/" + id + "/payments/" + onlyPayment(id) + "/proof");
        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.headers().firstValue("Content-Type")).hasValue("image/png");
        assertThat(r.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(r.headers().firstValue("X-Content-Type-Options")).hasValue("nosniff");
        assertThat(r.body()).isEqualTo(PNG);
    }

    @Test void voidKeepsProof() throws Exception {
        long id = invoice();
        post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof(PNG));
        String path = BASE + "/" + id + "/payments/" + onlyPayment(id);
        assertThat(api.send("POST", path + "/void", json(Map.of("version", 1, "requestId", UUID.randomUUID().toString(), "reason", "Wrong amount")), true).statusCode()).isEqualTo(200);
        assertThat(api.download(path + "/proof").statusCode()).isEqualTo(200);
        assertThat(proofFiles()).isEqualTo(1);
    }

    @Test void staffIs403AnonymousIs401() throws Exception {
        long id = invoice();
        post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof(PNG));
        String path = BASE + "/" + id + "/payments/" + onlyPayment(id) + "/proof";
        assertThat(new AdminHttpClient(port).download(path).statusCode()).isEqualTo(401);
        var staff = new AdminHttpClient(port);
        staff.login("staff@catalogue.test");
        assertThat(staff.download(path).statusCode()).isEqualTo(403);
    }

    @Test void proofOfOtherOrderIs404() throws Exception {
        long id = invoice(), other = invoice();
        post(id, payment(deposit(0, UUID.randomUUID(), 100000)), proof(PNG));
        assertThat(api.download(BASE + "/" + other + "/payments/" + onlyPayment(id) + "/proof").statusCode()).isEqualTo(404);
    }

    @Test void paymentWithoutProofIs404() throws Exception {
        long id = invoice();
        long payment = jdbc.queryForObject("insert into order_payments(order_id,transaction_type,amount,occurred_at,created_by) values(?,'DEPOSIT',1000,current_timestamp,?) returning id", Long.class, id, owner.getId());
        assertThat(api.download(BASE + "/" + id + "/payments/" + payment + "/proof").statusCode()).isEqualTo(404);
    }

    @Test void oversizedRequestIs413NotServerError() throws Exception {
        var r = post(invoice(), payment(deposit(0, UUID.randomUUID(), 100000)), proof(new byte[10 * 1024 * 1024 + 1]));
        assertThat(r.statusCode()).isEqualTo(413);
        assertThat(proofFiles()).isZero();
    }
}
