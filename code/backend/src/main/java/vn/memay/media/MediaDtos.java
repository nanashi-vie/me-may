package vn.memay.media;

public final class MediaDtos {
    public enum MediaRole {
        FRONT, BACK, SPINE, INSIDE_1, INSIDE_2, INSIDE_3;
        public String label() {
            return switch(this) {
                case FRONT -> "Bìa trước"; case BACK -> "Mặt sau"; case SPINE -> "Gáy";
                case INSIDE_1 -> "Nội dung 1"; case INSIDE_2 -> "Nội dung 2"; case INSIDE_3 -> "Nội dung 3";
            };
        }
    }

    public enum MediaState {
        UPLOADING, ACTIVE, DELETE_PENDING
    }
}
