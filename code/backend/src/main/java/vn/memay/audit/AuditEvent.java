package vn.memay.audit;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
@Entity @Table(name="audit_event")
public class AuditEvent {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 public Long actorId; public String targetType; public Long targetId; public String action;
 @JdbcTypeCode(SqlTypes.JSON) public Map<String,Object> beforeData;
 @JdbcTypeCode(SqlTypes.JSON) public Map<String,Object> afterData;
 public Long aggregateVersion; public Instant createdAt;
}
