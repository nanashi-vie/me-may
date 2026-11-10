package vn.memay.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.memay.common.AdminApiException;

@Component
public final class MediaRecoveryMode {
    private final boolean isolated;
    public MediaRecoveryMode(@Value("${memay.media.recovery.mode:active}") String mode) {
        if (!"active".equals(mode) && !"isolated".equals(mode))
            throw new IllegalArgumentException("Invalid media recovery mode");
        isolated = "isolated".equals(mode);
    }
    public boolean isolated() { return isolated; }
    public void requireActive() {
        if (isolated) throw new AdminApiException(409, "restore_isolated");
    }
}
