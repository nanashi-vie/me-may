package vn.memay.media;

public final class MediaDtos {
    public enum MediaRole {
        FRONT, BACK, SPINE, INSIDE_1, INSIDE_2, INSIDE_3, INSIDE_4, INSIDE_5,
        // Request aliases preserve the serialized names in old upload receipts.
        INTERNAL_1, INTERNAL_2;

        public MediaRole canonical() {
            return switch (this) {
                case INTERNAL_1 -> INSIDE_4;
                case INTERNAL_2 -> INSIDE_5;
                default -> this;
            };
        }

        public String label() {
            return switch(this) {
                case FRONT -> "Bìa trước"; case BACK -> "Mặt sau"; case SPINE -> "Gáy";
                case INSIDE_1 -> "Nội dung 1"; case INSIDE_2 -> "Nội dung 2"; case INSIDE_3 -> "Nội dung 3";
                case INSIDE_4, INTERNAL_1 -> "Nội dung 4";
                case INSIDE_5, INTERNAL_2 -> "Nội dung 5";
            };
        }
    }

    public enum MediaState {
        UPLOADING, ACTIVE, DELETE_PENDING
    }
}
