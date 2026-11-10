package vn.memay.media.source;

public record DownloadedSource(String inputKey, String sha256, long bytes, String mime, String version) {}
