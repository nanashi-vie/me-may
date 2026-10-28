package vn.memay.media;

import java.io.*;
import java.net.URI;
import java.util.Map;

public interface CloudinaryTransport {
    class MissingVariantException extends IOException {
    }

    Map<String, Object> post(URI uri, Map<String, Object> params, byte[] bytes) throws IOException;

    InputStream open(URI uri) throws IOException;
}
