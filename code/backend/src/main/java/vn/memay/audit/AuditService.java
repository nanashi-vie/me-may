package vn.memay.audit;

import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.*;
import vn.memay.auth.AdminUser;

@Service
public class AuditService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final Clock clock;

    public AuditService(JdbcTemplate jdbc, ObjectMapper mapper, Clock clock) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.clock = clock;
    }

    private static final Set<String> FIELDS = Set.of("bookCode", "title", "isbn", "publisher", "author", "language",
            "binding", "conditionGrade", "conditionNote", "priceVnd", "description", "categoryCode", "ageGroups",
            "readingLevel", "readingVideoUrl", "collectionIds", "publication", "availability", "media",
            "confirmedActualCopy", "name", "slug", "sortOrder", "active", "enabled", "startsAt", "endsAt", "items");

    public Map<String, Object> snapshot(Object value) {
        var result = new LinkedHashMap<String, Object>();
        if (value != null) {
            Map<?, ?> raw = mapper.convertValue(value, Map.class);
            raw.forEach((key, v) -> {
                if (FIELDS.contains(key.toString()))
                    result.put(key.toString(), v);
            });
        }
        return result;
    }

    public void record(AdminUser actor, String targetType, long targetId, String action, Map before, Map after,
            long version) {
        Map<String, Object> a = new LinkedHashMap<>(), b = new LinkedHashMap<>();
        for (String key : FIELDS)
            if (!Objects.equals(before.get(key), after.get(key))) {
                if (before.containsKey(key))
                    a.put(key, before.get(key));
                if (after.containsKey(key))
                    b.put(key, after.get(key));
            }
        jdbc.update(
                "insert into audit_event(actor_id,target_type,target_id,action,before_data,after_data,aggregate_version,created_at) values (?,?,?,?,cast(? as jsonb),cast(? as jsonb),?,?)",
                actor.getId(), targetType, targetId, action, mapper.writeValueAsString(a), mapper.writeValueAsString(b),
                version, java.sql.Timestamp.from(clock.instant()));
    }
}
